import 'aframe';
import * as THREE from 'three';

AFRAME.registerComponent('trashcan', {
  schema: {
    radius: { type: 'number', default: 0.2 } // Rayon de détection
  },

  init: function () {
    // Récupérer le Game Manager une seule fois
    this.system = this.el.sceneEl.systems['game-manager'];
  },

  tick: function () {
    if (!this.system) return;

    const trashPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(trashPos);
    const objPos = new THREE.Vector3();

    // Parcourir tous les objets générés dans la scène
    const objects = this.system.state.spawnedObjects;
    
    // Boucle inversée car on risque de supprimer des éléments du tableau
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      
      // Ignorer l'objet s'il est invalide, si c'est la poubelle elle-même, ou s'il est en cours de suppression
      if (!obj || !obj.object3D || obj === this.el || obj.classList.contains('trashcan') || obj.dataset.deleting === 'true') {
        continue;
      }

      obj.object3D.getWorldPosition(objPos);
      
      // Si l'objet rentre dans le rayon de la poubelle
      if (trashPos.distanceTo(objPos) < this.data.radius) {
        this.removeObject(obj, i);
      }
    }
  },

  removeObject: function(obj, index) {
    console.log('🗑️ Objet supprimé par la poubelle!');
    obj.dataset.deleting = 'true'; // Sécurité anti-boucle

    // 1. D'abord nettoyer la physique pour éviter le crash de Cannon.js
    if (obj.body && obj.body.world) {
        try { obj.body.world.removeBody(obj.body); } catch(e) { console.warn(e); }
    }

    // 2. Retirer du DOM
    if (obj.parentNode) {
        obj.parentNode.removeChild(obj);
    }

    // 3. Retirer de la liste du système
    this.system.state.spawnedObjects.splice(index, 1);
  }
});