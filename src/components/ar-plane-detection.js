/* global AFRAME, THREE */

/**
 * AR Plane Detection - Détecte les surfaces réelles et crée des colliders
 */
AFRAME.registerComponent('ar-plane-detection', {
    schema: {
        visualize: { type: 'boolean', default: true }
    },

    init: function () {
        console.log('[ar-plane-detection] Composant initialisé');
        this.planes = new Map();
        this.xrSession = null;
        this.referenceSpace = null;
        this.sessionReady = false;
        
        // Récupérer les éléments de debug
        this.debugEl = document.getElementById('debug');
        this.surfacesEl = document.getElementById('surfaces');

        // Essayer plusieurs événements pour détecter le démarrage de la session
        this.el.sceneEl.addEventListener('enter-vr', () => {
            console.log('[ar-plane-detection] Event enter-vr déclenché');
            this.initSession();
        });
        
        // Backup: vérifier périodiquement si la session existe
        this.checkSessionInterval = setInterval(() => {
            if (!this.sessionReady && this.el.sceneEl.renderer && this.el.sceneEl.renderer.xr) {
                const session = this.el.sceneEl.renderer.xr.getSession();
                if (session && !this.xrSession) {
                    console.log('[ar-plane-detection] Session détectée via intervalle');
                    this.initSession();
                }
            }
        }, 500);
    },
    
    initSession: function() {
        if (this.sessionReady) return;
        
        this.updateText('Session AR démarrée. Scannez votre environnement...');
        
        setTimeout(() => {
            const renderer = this.el.sceneEl.renderer;
            if (renderer && renderer.xr) {
                this.xrSession = renderer.xr.getSession();
                this.referenceSpace = renderer.xr.getReferenceSpace();
                
                if (this.xrSession) {
                    this.sessionReady = true;
                    clearInterval(this.checkSessionInterval);
                    
                    const hasPlaneDetection = this.xrSession.enabledFeatures?.includes('plane-detection');
                    console.log('[Planes] Session active, plane-detection:', hasPlaneDetection);
                    console.log('[Planes] enabledFeatures:', this.xrSession.enabledFeatures);
                    this.updateText(hasPlaneDetection ? 'Détection de plans activée ✓' : '⚠ Détection de plans non disponible');
                }
            }
        }, 500);
    },
    
    updateText: function(msg, count = null) {
        // Met à jour le message de debug
        if(this.debugEl) this.debugEl.textContent = msg;
        
        // Met à jour le compteur précis si on a un chiffre
        if(this.surfacesEl && count !== null) {
            this.surfacesEl.textContent = `Surfaces: ${count}`;
        }
    },

    tick: function () {
        if (!this.sessionReady || !this.xrSession) return;

        const frame = this.el.sceneEl.renderer.xr.getFrame();
        if (!frame) return;

        // Essayer d'accéder aux plans détectés
        const detectedPlanes = frame.detectedPlanes || this.xrSession.detectedPlanes;
        
        if (!detectedPlanes) {
            // Log seulement une fois
            if (!this._noDetectionLogged) {
                console.warn('[Planes] detectedPlanes non disponible dans frame ou session');
                this.updateText('AR activé, mais pas de détection de plans.');
                this._noDetectionLogged = true;
            }
            return;
        }

        // Si 0 plans détectés
        if (detectedPlanes.size === 0) {
            if (this.surfacesEl) this.surfacesEl.textContent = "Surfaces: 0";
            return; 
        }

        // Mettre à jour les plans
        detectedPlanes.forEach(plane => {
            const id = this.getPlaneId(plane);

            if (!this.planes.has(id)) {
                this.createPlane(plane, id, frame);
            } else {
                this.updatePlane(plane, id, frame);
            }
        });

        // Supprimer les plans disparus
        this.planes.forEach((entity, id) => {
            let found = false;
            detectedPlanes.forEach(p => {
                if (this.getPlaneId(p) === id) found = true;
            });
            if (!found) {
                entity.parentNode?.removeChild(entity);
                this.planes.delete(id);
            }
        });
        
        // Mise à jour de l'affichage (environ 1 fois par seconde)
        if (Math.random() < 0.02) {
            this.updateText(`Détection active !`, this.planes.size);
        }
    },

    getPlaneId: function (plane) {
        return plane.planeSpace?.toString() || `plane_${Math.random()}`;
    },

    createPlane: function (plane, id, frame) {
        const entity = document.createElement('a-entity');

        // Calculer taille
        let width = 1, depth = 1;
        if (plane.polygon && plane.polygon.length > 0) {
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            for (const p of plane.polygon) {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minZ = Math.min(minZ, p.z);
                maxZ = Math.max(maxZ, p.z);
            }
            width = Math.max(0.1, maxX - minX);
            depth = Math.max(0.1, maxZ - minZ);
        }


        // Géométrie box fine
        entity.setAttribute('geometry', {
            primitive: 'box',
            width: width,
            height: 0.02,
            depth: depth
        });

        // Couleur selon orientation
        const isHorizontal = plane.orientation === 'horizontal';
        if (this.data.visualize) {
            entity.setAttribute('material', {
                color: isHorizontal ? '#00FF00' : '#FF8800',
                opacity: 0.3,
                transparent: true,
                side: 'double'
            });
        } else {
            entity.setAttribute('visible', 'false');
        }

        // PHYSIQUE - Boite statique avec friction et sans rebond
        entity.setAttribute('static-body', 'shape: box; restitution: 0; friction: 1');

        this.el.sceneEl.appendChild(entity);
        this.planes.set(id, entity);

        // Positionner
        this.updatePlane(plane, id, frame);

        console.log('[Planes] Nouveau plan:', plane.orientation, 'taille:', width.toFixed(2), 'x', depth.toFixed(2));
        
        // Test visuel: créer aussi une sphère au centre du plan
        const testSphere = document.createElement('a-sphere');
        testSphere.setAttribute('radius', '0.05');
        testSphere.setAttribute('color', '#FFFF00');
        testSphere.setAttribute('position', '0 0.1 0');
        entity.appendChild(testSphere);
    },

    updatePlane: function (plane, id, frame) {
        const entity = this.planes.get(id);
        if (!entity || !plane.planeSpace || !this.referenceSpace) return;

        try {
            const pose = frame.getPose(plane.planeSpace, this.referenceSpace);
            if (pose) {
                const { position, orientation } = pose.transform;
                entity.object3D.position.set(position.x, position.y, position.z);
                entity.object3D.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
                
                // Décaler légèrement vers le haut pour que les objets touchent la surface
                const height = entity.getAttribute('geometry').height || 0.02;
                entity.object3D.translateY(height / 2);

                // Sync physics body
                if (entity.body) {
                    entity.body.position.copy(entity.object3D.position);
                    entity.body.quaternion.copy(entity.object3D.quaternion);
                }
            }
        } catch (e) {
            // Ignore pose errors
        }
    }
});
