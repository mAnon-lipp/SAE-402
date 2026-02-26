import 'aframe';
import * as THREE from 'three';

AFRAME.registerSystem('game-manager', {
  schema: {},

  init: function () {
    console.log('✅ Système Game Manager initialisé');

    // État global du jeu
    this.state = {
      customers: [],
      spawnedObjects: [],
      score: 0,
      coffeeDelivered: false,
    };

    // Constantes de la file d'attente
    this.MAX_QUEUE_SIZE = 4;
    this.QUEUE_SPACING = 0.8;
    this.QUEUE_START_DISTANCE = 1.2;

    // Écouteurs d'événements globaux (communication inter-composants)
    this.el.addEventListener('customer-added', this.onCustomerAdded.bind(this));
    this.el.addEventListener('object-spawned', this.onObjectSpawned.bind(this));
    this.el.addEventListener('coffee-delivered', this.onCoffeeDelivered.bind(this));
    
    // UI ou Debug : Optionnel, pour mettre à jour un HUD de score plus tard
    this.el.addEventListener('update-score', () => {
        console.log(`Score actuel : ${this.state.score}`);
    });
  },

  onCustomerAdded: function (event) {
    const customer = event.detail.customer;
    this.state.customers.push(customer);
    console.log(`🧍 Client ajouté à la file. Total: ${this.state.customers.length}`);
  },

  onObjectSpawned: function (event) {
    const object = event.detail.object;
    this.state.spawnedObjects.push(object);
  },

  onCoffeeDelivered: function (event) {
    const { cup, customer } = event.detail;
    
    // Sécurité pour éviter les doubles validations
    if (this.state.coffeeDelivered) return;
    this.state.coffeeDelivered = true;
    
    // Augmenter le score
    this.state.score += 10;
    this.el.emit('update-score');
    
    console.log(`☕ Café livré avec succès ! Score: ${this.state.score}`);

    // ⚡ FIX FREEZE CRITIQUE : Toutes les suppressions doivent être LARGEMENT différées
    // pour éviter de supprimer un objet pendant la phase de calcul physique Cannon.js
    setTimeout(() => {
      console.log('🧹 Début nettoyage tasse et client...');
      
      // 1. Nettoyage propre de la tasse (Physique Cannon.js + DOM)
      if (cup && cup.parentNode) {
        try {
          if (cup.body && cup.body.world) {
            cup.body.world.removeBody(cup.body);
          }
          cup.parentNode.removeChild(cup);
          
          const cupIdx = this.state.spawnedObjects.indexOf(cup);
          if (cupIdx > -1) this.state.spawnedObjects.splice(cupIdx, 1);
          
          console.log('✅ Tasse supprimée');
        } catch(e) { 
          console.warn("❌ Erreur suppression tasse:", e); 
        }
      }

      // 2. Nettoyage propre du client servi (Physique Cannon.js + DOM)
      if (customer && customer.parentNode) {
        try {
          // Nettoyer tous les corps physiques potentiels liés au client
          customer.querySelectorAll('[static-body], [dynamic-body]').forEach(child => {
            if (child.body && child.body.world) {
              child.body.world.removeBody(child.body);
            }
          });
          customer.parentNode.removeChild(customer);
          
          const custIdx = this.state.customers.indexOf(customer);
          if (custIdx > -1) this.state.customers.splice(custIdx, 1);
          
          console.log('✅ Client supprimé');
        } catch(e) {
          console.warn("❌ Erreur suppression client:", e);
        }
      }
      
      console.log('✅ Nettoyage terminé !');
    }, 600);  // ⚡ Augmenté à 600ms pour laisser le temps à toutes les opérations physiques

    // 3. Faire avancer la file d'attente après un court délai
    setTimeout(() => {
      this.advanceQueue();
    }, 500);

    // 4. Relancer le cycle : préparer la venue du prochain client
    setTimeout(() => {
      this.state.coffeeDelivered = false;
      // On demande au composant spawner (qui sera créé à l'étape 4) de faire venir un client
      this.el.emit('request-spawn-customer'); 
    }, 3000);
  },

  advanceQueue: function () {
    console.log('👥 Avancement de la file d\'attente...');
    
    const cam = document.getElementById('cam');
    if (!cam || !cam.object3D) return;
    
    const camPos = new THREE.Vector3();
    cam.object3D.getWorldPosition(camPos);

    this.state.customers.forEach((customer, index) => {
      const newDistance = this.QUEUE_START_DISTANCE + (index * this.QUEUE_SPACING);
      const newPos = {
        x: camPos.x,
        y: 0,
        z: camPos.z - newDistance
      };
      
      // Animation fluide pour avancer
      customer.setAttribute('animation', `property: position; to: ${newPos.x} ${newPos.y} ${newPos.z}; dur: 800; easing: easeInOutQuad`);
      customer.dataset.queuePosition = index.toString();
      
      // Si c'est le nouveau premier de la file, on déclenche sa bulle de dialogue
      if (index === 0) {
        customer.emit('become-first-in-queue');
      }
    });
  }
});