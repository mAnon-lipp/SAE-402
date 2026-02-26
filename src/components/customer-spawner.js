import 'aframe';
import * as THREE from 'three';

AFRAME.registerComponent('customer-spawner', {
  init: function () {
    // 1. Écoute les demandes du Game Manager pour créer un client (ex: après un café servi)
    this.el.addEventListener('request-spawn-customer', this.spawnCustomer.bind(this));
    
    // --- 2. LA FAMEUSE AMÉLIORATION (LE FEU VERT) ---
    // Au lieu de lancer un chrono dès le chargement de la page,
    // on attend que le panneau de bienvenue crie "start-game".
    this.el.sceneEl.addEventListener('start-game', () => {
      console.log('⏱️ Le joueur est prêt ! Arrivée du 1er client dans 5 secondes...');
      
      setTimeout(() => {
        this.spawnCustomer();
      }, 5000);
    });
  },

  spawnCustomer: function () {
    const system = this.el.sceneEl.systems['game-manager'];
    if (!system) return;

    // Limite de la queue
    if (system.state.customers.length >= system.MAX_QUEUE_SIZE) {
      console.log('⚠️ Queue pleine!');
      return;
    }

    const cam = document.getElementById('cam');
    if (!cam || !cam.object3D) return;

    const camPos = new THREE.Vector3();
    cam.object3D.getWorldPosition(camPos);

    // Calcul de la position dans la file
    const positionInQueue = system.state.customers.length;
    const distanceFromCamera = system.QUEUE_START_DISTANCE + (positionInQueue * system.QUEUE_SPACING);
    
    const customerPos = new THREE.Vector3(
      camPos.x, 
      0,  // Hauteur au sol
      camPos.z - distanceFromCamera
    );

    // Création de l'entité
    const customerEl = document.createElement('a-entity');
    customerEl.setAttribute('gltf-model', 'url(models/Punk.glb)');
    customerEl.setAttribute('position', `${customerPos.x} ${customerPos.y} ${customerPos.z}`);
    customerEl.setAttribute('scale', '0.85 0.85 0.85');
    
    // Orienter vers la caméra
    const angleToCamera = Math.atan2(camPos.x - customerPos.x, camPos.z - customerPos.z) * (180 / Math.PI);
    customerEl.setAttribute('rotation', `0 ${angleToCamera} 0`);
    
    // Classes et données ECS
    customerEl.classList.add('customer');
    customerEl.dataset.queuePosition = positionInQueue.toString();
    customerEl.setAttribute('customer', ''); // Attacher le composant 'customer'

    // Ajouter à la scène
    this.el.sceneEl.appendChild(customerEl);

    // Notifier le Game Manager
    system.el.emit('customer-added', { customer: customerEl });
  }
});