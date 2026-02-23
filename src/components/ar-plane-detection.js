/* global AFRAME, THREE */

/**
 * Component: ar-plane-detection
 * Description: Detects real-world planes and creates physics surfaces
 * NOTE: This component is the ONLY source of floor surfaces to avoid duplicates
 */
AFRAME.registerComponent('ar-plane-detection', {
    schema: {
        visualize: { type: 'boolean', default: true }
    },

    init: function () {
        this.planes = new Map();
        
        // Récupération des éléments de l'interface utilisateur
        this.debugEl = document.getElementById('debug');
        this.surfacesEl = document.getElementById('surfaces');

        // Emit event when plane detection is ready
        this.el.sceneEl.addEventListener('enter-vr', () => {
            this.updateText('AR Session started. Scanning environment...');
            // Notify main.js to NOT create manual surfaces
            this.el.sceneEl.emit('plane-detection-active');
        });
    },

    updateText: function(msg, count = null) {
        if(this.debugEl) this.debugEl.textContent = msg;
        if(this.surfacesEl && count !== null) {
            this.surfacesEl.textContent = `Surfaces: ${count}`;
        }
    },

    tick: function () {
        const frame = this.el.sceneEl.frame;
        const session = this.el.sceneEl.renderer.xr.getSession();
        const refSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();

        if (!frame || !session || !refSpace) return;
        
        const detectedPlanes = frame.detectedPlanes || session.detectedPlanes;
        
        if (!detectedPlanes) {
            this.updateText('AR activé, mais pas de détection de plans.');
            return;
        }

        if (detectedPlanes.size === 0) {
            if (this.surfacesEl) this.surfacesEl.textContent = "Surfaces: 0";
            return; 
        }

        // 1. Nettoyage des plans disparus
        for (const [plane, entity] of this.planes) {
            if (!detectedPlanes.has(plane)) {
                if (entity.parentNode) entity.parentNode.removeChild(entity);
                this.planes.delete(plane);
            }
        }

        // 2. Mise à jour ou Création des plans
        detectedPlanes.forEach(plane => {
            const entity = this.planes.get(plane);
            if (entity) {
                this.updatePlane(plane, entity, frame, refSpace);
            } else {
                this.createPlane(plane, frame, refSpace);
            }
        });
        
        if (Math.random() < 0.02) {
            this.updateText(`Détection active !`, this.planes.size);
        }
    },

    createPlane: function (plane, frame, refSpace) {
        const entity = document.createElement('a-entity');
        
        // Couleur selon l'orientation (Horizontal = Vert, Vertical = Orange)
        const isHorizontal = plane.orientation === 'horizontal';
        const color = isHorizontal ? '#00FF00' : '#FF8800';
        
        entity.setAttribute('material', { 
            color: color, 
            opacity: 0.3, 
            transparent: true,
            side: 'double'
        });
        
        // Physique : Boite statique pour que les objets tiennent dessus
        entity.setAttribute('static-body', 'shape: box; restitution: 0; friction: 1');
        entity.setAttribute('visible', this.data.visualize);

        this.el.sceneEl.appendChild(entity);
        this.planes.set(plane, entity);
        
        this.updatePlane(plane, entity, frame, refSpace);
    },

    updatePlane: function (plane, entity, frame, refSpace) {
        const pose = frame.getPose(plane.planeSpace, refSpace);
        if (!pose) return;

        entity.object3D.position.copy(pose.transform.position);
        entity.object3D.quaternion.copy(pose.transform.orientation);

        // Calcul de la taille du plan à partir de son polygone
        if (plane.polygon && plane.polygon.length > 0) {
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            plane.polygon.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minZ = Math.min(minZ, p.z);
                maxZ = Math.max(maxZ, p.z);
            });
            
            const width = Math.max(0.1, maxX - minX);
            const depth = Math.max(0.1, maxZ - minZ);
            const height = 0.02; // Épaisseur fine

            entity.setAttribute('geometry', { primitive: 'box', width, height, depth });
            
            // Ajustement pour que la surface de collision soit au bon niveau
            entity.object3D.translateY(height / 2);
            
            if (entity.body) {
                entity.body.position.copy(entity.object3D.position);
                entity.body.quaternion.copy(entity.object3D.quaternion);
            }
        }
    }
});
