import 'aframe';
import * as THREE from 'three';

AFRAME.registerComponent('grab-system', {
  schema: {
    maxDist: { type: 'number', default: 0.5 }, // Distance max pour attraper
    handedness: { type: 'string', default: 'right' } // 'left' ou 'right'
  },

  init: function () {
    this.grabbedEl = null;
    this.velocities = [];

    // Binding des méthodes pour garder le contexte 'this'
    this.onGrab = this.onGrab.bind(this);
    this.onRelease = this.onRelease.bind(this);
    this.onAxisMove = this.onAxisMove.bind(this);

    // A-Frame gère nativement le trigger (gâchette) ou le grip
    this.el.addEventListener('triggerdown', this.onGrab);
    this.el.addEventListener('triggerup', this.onRelease);
    this.el.addEventListener('gripdown', this.onGrab);
    this.el.addEventListener('gripup', this.onRelease);

    // Écoute des joysticks pour faire tourner l'objet
    this.el.addEventListener('axismove', this.onAxisMove);
    
    // Debug : vérifier que les événements sont bien émis
    console.log(`🖐️ Grab-system initialisé pour main ${this.data.handedness}`);
  },

  onGrab: function (evt) {
    console.log(`✊ Événement grip/trigger détecté sur main ${this.data.handedness}!`, evt.type);
    
    if (this.grabbedEl) {
      console.log('⚠️ Objet déjà attrapé, ignore');
      return;
    }

    const handPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(handPos);

    // Chercher tous les objets "grabbables" (spawnés + cube de base)
    const grabbables = document.querySelectorAll('.grabbable');
    let closestEl = null;
    let closestDist = this.data.maxDist;

    grabbables.forEach(obj => {
      if (!obj || !obj.object3D) return;
      const objPos = new THREE.Vector3();
      obj.object3D.getWorldPosition(objPos);
      
      const dist = handPos.distanceTo(objPos);
      if (dist < closestDist) {
        closestDist = dist;
        closestEl = obj;
      }
    });

    if (!closestEl) {
      console.log(`🔍 Aucun objet grabbable trouvé à moins de ${this.data.maxDist}m`);
      return;
    }

    // --- ATTRAPER L'OBJET ---
    this.grabbedEl = closestEl;
    this.velocities = [];

    // Désactiver la physique pour qu'il suive la main sans collision
    if (this.grabbedEl.body) {
      this.grabbedEl.body.mass = 0;
      this.grabbedEl.body.type = 2; // 2 = KINEMATIC dans aframe-physics-system
      this.grabbedEl.body.collisionResponse = false;
      this.grabbedEl.body.updateMassProperties();
    }

    console.log(`✊ Objet attrapé : ${this.grabbedEl.getAttribute('gltf-model') || 'box'} (distance: ${closestDist.toFixed(2)}m)`);
  },

  onRelease: function () {
    console.log(`🖐️ Événement release détecté sur main ${this.data.handedness}!`);
    
    if (!this.grabbedEl) {
      console.log('⚠️ Aucun objet à relâcher');
      return;
    }

    // --- CALCUL DE LA VÉLOCITÉ (LANCER) ---
    let vx = 0, vy = 0, vz = 0;
    if (this.velocities.length >= 2) {
      const last = this.velocities[this.velocities.length - 1];
      const first = this.velocities[0];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0.01) {
        vx = (last.x - first.x) / dt;
        vy = (last.y - first.y) / dt;
        vz = (last.z - first.z) / dt;
      }
    }

    // Réactiver la physique
    if (this.grabbedEl.body) {
      // S'assurer que la position physique matche la position visuelle relâchée
      const p = this.grabbedEl.object3D.position;
      this.grabbedEl.body.position.set(p.x, p.y, p.z);
      
      this.grabbedEl.body.type = 1; // 1 = DYNAMIC
      this.grabbedEl.body.collisionResponse = true;
      this.grabbedEl.body.mass = 0.3; // Masse par défaut de tes objets
      this.grabbedEl.body.updateMassProperties();
      
      // Appliquer la vélocité
      this.grabbedEl.body.velocity.set(vx, vy, vz);
      this.grabbedEl.body.wakeUp();
    }

    console.log(`🖐️ Objet relâché : ${this.grabbedEl.getAttribute('gltf-model') || 'box'} avec vélocité (${vx.toFixed(1)}, ${vy.toFixed(1)}, ${vz.toFixed(1)})`);
    this.grabbedEl = null;
  },

  onAxisMove: function (event) {
    if (!this.grabbedEl || !event.detail.axis) return;
    
    // event.detail.axis contient les valeurs du joystick [x, y, z, w]
    const axes = event.detail.axis;
    const rotSpeed = 0.05;

    // Main gauche : Yaw (Gauche/Droite)
    if (this.data.handedness === 'left') {
      const axisX = axes[2] !== undefined ? axes[2] : axes[0];
      if (Math.abs(axisX) > 0.1) {
        this.grabbedEl.object3D.rotation.y += -axisX * rotSpeed;
      }
    }

    // Main droite : Pitch (Haut/Bas)
    if (this.data.handedness === 'right') {
      const axisY = axes[3] !== undefined ? axes[3] : axes[1];
      if (Math.abs(axisY) > 0.1) {
        this.grabbedEl.object3D.rotation.x += -axisY * rotSpeed;
      }
    }

    // Mettre à jour la rotation physique immédiatement
    if (this.grabbedEl.body) {
      const q = this.grabbedEl.object3D.quaternion;
      this.grabbedEl.body.quaternion.set(q.x, q.y, q.z, q.w);
    }
  },

  tick: function (time) {
    if (!this.grabbedEl) return;

    const handPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(handPos);

    // Mettre l'objet à la position de la main
    this.grabbedEl.object3D.position.set(handPos.x, handPos.y, handPos.z);

    // --- CAS SPÉCIAL : LE BALAI ---
    // On décale le balai vers le bas pour l'attraper par le manche
    const model = this.grabbedEl.getAttribute('gltf-model');
    if (model && model.includes('Broom')) {
      this.grabbedEl.object3D.translateY(-0.6); 
    }

    // Synchroniser le corps physique
    if (this.grabbedEl.body) {
      const p = this.grabbedEl.object3D.position;
      this.grabbedEl.body.position.set(p.x, p.y, p.z);
    }

    // Sauvegarder l'historique des positions pour calculer le lancer
    this.velocities.push({ x: handPos.x, y: handPos.y, z: handPos.z, t: time });
    if (this.velocities.length > 10) {
      this.velocities.shift();
    }
  }
});