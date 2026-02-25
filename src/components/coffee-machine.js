import 'aframe';
import * as THREE from 'three';

AFRAME.registerComponent('coffee-machine', {
  schema: {
    brewTime: { type: 'number', default: 3000 } // 3 secondes de préparation
  },

  init: function () {
    this.isBrewing = false;
    
    // Initialisation du son
    this.audio = new Audio('sounds/public_assets_café.MP3');
    this.audio.volume = 0.7;

    // Binding pour garder le contexte 'this'
    this.onClick = this.onClick.bind(this);
    this.el.addEventListener('click', this.onClick);
    
    console.log('☕ Machine à café initialisée. Appuyez sur B à proximité pour préparer un café.');
  },

  onClick: function () {
    // Si un café est déjà en cours, on ignore le clic
    if (this.isBrewing) return;
    this.isBrewing = true;

    console.log('☕ Préparation du café...');

    // Jouer le son
    this.audio.currentTime = 0;
    this.audio.play().catch(e => console.log('Erreur audio:', e));

    // Attendre 3 secondes avant de faire spawner la tasse
    setTimeout(() => {
      this.spawnCup();
      this.isBrewing = false; // Débloquer la machine
    }, this.data.brewTime);
  },

  spawnCup: function () {
    const machinePos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(machinePos);

    // Création de l'entité
    const cup = document.createElement('a-entity');
    
    // Ton vrai modèle 3D
    cup.setAttribute('gltf-model', 'url(models/Coffeecup.glb)');
    cup.setAttribute('scale', '0.15 0.15 0.15');

    // Position à droite de la machine (offset de 0.15m sur X)
    cup.setAttribute('position', `${machinePos.x + 0.15} ${machinePos.y + 0.05} ${machinePos.z}`);

    // Physique exacte de ton ancien code
    cup.setAttribute('dynamic-body', 'mass:0.3;linearDamping:0.5;angularDamping:0.5');
    
    // Classes et attributs nécessaires pour le raycaster et la préhension
    cup.setAttribute('class', 'clickable grabbable coffee-cup');
    cup.id = `coffee-cup-${Date.now()}`;
    
    // ⚡ RÉINTÉGRATION DU COMPOSANT DE TEMPÉRATURE ⚡
    cup.setAttribute('coffee-temperature', 'temperature: 100; coolingRate: 5; gaugeHeight: 0.3');

    // Ajout à la scène
    this.el.sceneEl.appendChild(cup);

    // Notification au Game Manager
    const gameManager = this.el.sceneEl.systems['game-manager'];
    if (gameManager) {
      gameManager.el.emit('object-spawned', { object: cup });
    }
  },

  remove: function () {
    this.el.removeEventListener('click', this.onClick);
  }
});