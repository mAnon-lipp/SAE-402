import 'aframe';
import * as THREE from 'three';

AFRAME.registerComponent('broom-cleaner', {
  tick: function () {
    // SÉCURITÉ : On ne nettoie QUE si le balai est tenu dans la main.
    // Quand l'objet est tenu, notre grab-system passe son body.type à 2 (Kinematic).
    if (!this.el.body || this.el.body.type !== 2) return;

    // Récupérer le gestionnaire de taches
    const manager = this.el.sceneEl.components['stain-manager'];
    if (!manager || manager.stains.length === 0) return;

    const broomPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(broomPos);

    // Vérifier les collisions avec les taches (boucle inversée car on peut supprimer des taches)
    for (let i = manager.stains.length - 1; i >= 0; i--) {
      const stain = manager.stains[i];
      if (!stain || !stain.object3D) continue;

      const stainPos = stain.object3D.position;

      // Distance 2D (Sol)
      const distXZ = Math.hypot(broomPos.x - stainPos.x, broomPos.z - stainPos.z);
      // Distance Verticale (Tolérance de hauteur du balai)
      const verticalDist = Math.abs(broomPos.y - stainPos.y);

      // Rayons de nettoyage exacts de ton ancien main.js
      if (distXZ < 0.4 && verticalDist < 0.5) {
        manager.cleanStain(stain, i);
      }
    }
  }
});