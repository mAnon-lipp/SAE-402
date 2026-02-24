import 'aframe';
import * as THREE from 'three';

AFRAME.registerComponent('stain-manager', {
  init: function () {
    this.stains = [];
    
    // Spawn initial de 5 taches après 2 secondes (comme ton code d'origine)
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        this.spawnStain();
      }
    }, 2000);
  },

  spawnStain: function () {
    // Calcul de la position (offset vers l'avant sur Z)
    const x = (Math.random() - 0.5) * 4;
    const z = (Math.random() - 0.5) * 4 - 1.5; 
    const y = 0.01; // Légèrement au-dessus du sol

    const stain = document.createElement('a-circle');
    
    // Rayon aléatoire comme dans ton code
    const radius = 0.2 + Math.random() * 0.2;
    stain.setAttribute('radius', radius);
    stain.setAttribute('rotation', '-90 0 0');
    stain.setAttribute('position', `${x} ${y} ${z}`);
    
    // Esthétique
    stain.setAttribute('color', '#5d4037');
    stain.setAttribute('opacity', '0.9');
    stain.setAttribute('material', 'shader: flat; transparent: true');
    stain.classList.add('stain');

    // On stocke les points de vie directement sur l'élément HTML
    stain.dataset.health = 100;

    this.el.sceneEl.appendChild(stain);
    this.stains.push(stain);
    
    console.log('💩 Nouvelle tache apparue !');
  },

  // Fonction appelée par le balai
  cleanStain: function (stainEl, index) {
    // Réduire la santé (adapté pour 60 images par seconde dans le tick)
    let currentHealth = parseFloat(stainEl.dataset.health);
    currentHealth -= 2.5; 
    stainEl.dataset.health = currentHealth;

    // Mise à jour visuelle (fondu)
    stainEl.setAttribute('opacity', (currentHealth / 100).toString());

    if (currentHealth <= 0) {
      // Retirer du DOM et de la liste
      if (stainEl.parentNode) stainEl.parentNode.removeChild(stainEl);
      this.stains.splice(index, 1);
      
      // 50% de chance d'en spawner une nouvelle (mécanique d'origine)
      if (Math.random() > 0.5) {
        this.spawnStain();
      }
    }
  }
});