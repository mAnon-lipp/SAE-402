import 'aframe';
import * as THREE from 'three';

AFRAME.registerComponent('ar-physics-meshing', {
  init: function () {
    this.surfaces = [];
    this.maxSurfaces = 200; // Limite pour ne pas faire ramer le téléphone
    
    // Création du curseur visuel (ton fameux anneau vert)
    this.cursor = document.createElement('a-ring');
    this.cursor.setAttribute('color', '#00FF00');
    this.cursor.setAttribute('radius-inner', '0.05');
    this.cursor.setAttribute('radius-outer', '0.08');
    this.cursor.setAttribute('rotation', '-90 0 0');
    this.cursor.setAttribute('visible', 'false');
    this.el.sceneEl.appendChild(this.cursor);

    this.hitTestSource = null;
    this.viewerSpace = null;
    this.refSpace = null;

    // Quand la session AR commence, on initialise le VRAI Hit-Test WebXR
    this.el.sceneEl.addEventListener('enter-vr', async () => {
      const scene = this.el.sceneEl;
      if (!scene.is('ar-mode')) return;

      const session = scene.renderer.xr.getSession();
      this.refSpace = scene.renderer.xr.getReferenceSpace();

      try {
        this.viewerSpace = await session.requestReferenceSpace('viewer');
        this.hitTestSource = await session.requestHitTestSource({ space: this.viewerSpace });
        console.log("🟢 Hit-Test AR Initialisé !");
      } catch (e) {
        console.warn("Erreur Hit-Test AR:", e);
      }
    });
  },

  tick: function () {
    const scene = this.el.sceneEl;
    if (!scene.is('ar-mode') || !this.hitTestSource) return;

    const frame = scene.frame;
    if (!frame || !this.refSpace) return;

    // Récupérer les résultats de la vraie profondeur de la pièce
    const hits = frame.getHitTestResults(this.hitTestSource);
    
    if (hits.length > 0) {
      const pose = hits[0].getPose(this.refSpace);
      if (pose) {
        const p = pose.transform.position;
        const r = pose.transform.orientation;

        this.cursor.setAttribute('visible', 'true');
        this.cursor.object3D.position.set(p.x, p.y, p.z);

        // Appliquer l'orientation pour que l'anneau soit plat sur la vraie table/sol
        if (r) {
          const poseRot = new THREE.Quaternion(r.x, r.y, r.z, r.w);
          const offset = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
          poseRot.multiply(offset);
          this.cursor.object3D.quaternion.copy(poseRot);
        } else {
          this.cursor.object3D.rotation.set(-Math.PI / 2, 0, 0);
        }

        // Ajouter la physique !
        this.addSurface(p.x, p.y, p.z);
      }
    } else {
      this.cursor.setAttribute('visible', 'false');
    }
  },

  addSurface: function (x, y, z) {
    // Éviter d'ajouter 1000 boîtes au même endroit
    for (const s of this.surfaces) {
      if (Math.abs(s.x - x) < 0.1 && Math.abs(s.y - y) < 0.1 && Math.abs(s.z - z) < 0.1) return;
    }

    // La boîte invisible avec la physique
    const box = document.createElement('a-box');
    box.setAttribute('position', `${x} ${y} ${z}`);
    box.setAttribute('width', '0.2');
    box.setAttribute('height', '0.01');
    box.setAttribute('depth', '0.2');
    box.setAttribute('visible', 'false'); 
    box.setAttribute('static-body', ''); // IMPORTANT : Cannon.js
    
    this.el.sceneEl.appendChild(box);
    this.surfaces.push({ x, y, z, el: box });

    // Nettoyer les vieilles surfaces pour éviter que le téléphone explose
    if (this.surfaces.length > this.maxSurfaces) {
      const oldestSurface = this.surfaces.shift();
      if (oldestSurface.el && oldestSurface.el.parentNode) {
        if (oldestSurface.el.body && oldestSurface.el.body.world) {
            try { oldestSurface.el.body.world.removeBody(oldestSurface.el.body); } catch(e) {}
        }
        oldestSurface.el.parentNode.removeChild(oldestSurface.el);
      }
    }
  }
});