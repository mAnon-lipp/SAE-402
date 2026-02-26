import 'aframe';
import * as THREE from 'three';

AFRAME.registerComponent('customer', {
  init: function () {
    this.isServed = false;
    this.isProcessed = false; // Flag pour éviter les doubles collisions
    this.refusalCooldown = false;
    this.audioRefusal = new Audio('sounds/Hmph-sound-effect.mp3');
    this.audioRefusal.volume = 0.8;

    // Écouter quand le client devient le premier de la file
    this.el.addEventListener('become-first-in-queue', this.showSpeechBubble.bind(this));
    
    // Si on spawn directement à la position 0, on affiche la bulle
    if (this.el.dataset.queuePosition === "0") {
      this.showSpeechBubble();
    }
  },

  showSpeechBubble: function () {
    // Évite de créer deux bulles
    if (this.el.querySelector('.speech-bubble')) return;

    setTimeout(() => {
      const speechBubble = document.createElement('a-entity');
      speechBubble.setAttribute('position', '0 1.8 0');
      speechBubble.classList.add('speech-bubble');
      
      const bubbleBg = document.createElement('a-plane');
      bubbleBg.setAttribute('width', '1.0');
      bubbleBg.setAttribute('height', '0.35');
      bubbleBg.setAttribute('color', '#ffffff');
      bubbleBg.setAttribute('opacity', '0.95');
      bubbleBg.setAttribute('shader', 'flat');
      bubbleBg.setAttribute('side', 'double');
      speechBubble.appendChild(bubbleBg);
      
      const bubbleText = document.createElement('a-text');
      bubbleText.setAttribute('value', '☕ COFFEE PLEASE!\nBring me a cup!');
      bubbleText.setAttribute('align', 'center');
      bubbleText.setAttribute('position', '0 0 0.02');
      bubbleText.setAttribute('width', '1.8');
      bubbleText.setAttribute('color', '#2d1810');
      speechBubble.appendChild(bubbleText);
      
      speechBubble.setAttribute('animation', 'property: position; to: 0 2.0 0; dur: 1200; dir: alternate; loop: true; easing: easeInOutSine');
      
      this.el.appendChild(speechBubble);
    }, 800);
  },

  tick: function () {
    // On ne vérifie la livraison QUE si c'est le premier client de la file
    if (this.el.dataset.queuePosition !== "0" || this.isServed || this.isProcessed || this.el.dataset.deleting === 'true') return;

    const system = this.el.sceneEl.systems['game-manager'];
    if (!system || system.state.coffeeDelivered) return;

    const myPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(myPos);

    // Parcourir uniquement les tasses de café
    const coffees = system.state.spawnedObjects.filter(obj => obj && obj.classList.contains('coffee-cup'));

    for (let cup of coffees) {
      if (cup.dataset.deleting === 'true') continue;

      const cupPos = new THREE.Vector3();
      cup.object3D.getWorldPosition(cupPos);

      // Distance de livraison (50cm)
      if (myPos.distanceTo(cupPos) < 0.5) {
        
        // ⚡ VÉRIFICATION DE LA TEMPÉRATURE
        const tempComp = cup.components['coffee-temperature'];
        if (tempComp && tempComp.isTooCold()) {
          if (!this.refusalCooldown) {
            console.log('❄️ Café trop froid ! Refusé.');
            this.audioRefusal.currentTime = 0;
            this.audioRefusal.play().catch(e => {});
            
            this.refusalCooldown = true;
            setTimeout(() => { this.refusalCooldown = false; }, 3000);
          }
          continue; // On passe à la tasse suivante
        }

        // ✅ CAFÉ CHAUD ET PROCHE : LIVRAISON ACCEPTÉE
        console.log('🎯 COLLISION VALIDÉE avec le client 1 !');
        this.isServed = true;
        this.isProcessed = true; // Verrouiller immédiatement
        
        // Marquer pour éviter les doubles exécutions
        cup.dataset.deleting = 'true';
        this.el.dataset.deleting = 'true';

        // ⚡ FIX FREEZE : setTimeout pour éviter la suppression pendant la phase physique
        setTimeout(() => {
          // Notifier le Game Manager qui gérera le nettoyage, le score et l'avancement
          system.el.emit('coffee-delivered', { cup: cup, customer: this.el });
        }, 0);
        
        break; // Stop la boucle
      }
    }
  }
});