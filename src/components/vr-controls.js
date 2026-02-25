import 'aframe';

AFRAME.registerComponent('vr-controls', {
  schema: { hand: { type: 'string', default: 'left' } },

  init: function () {
    // Attendre que la manette soit vraiment connectée
    this.el.addEventListener('controllerconnected', () => {
      console.log(`🎮 Manette ${this.data.hand} prête !`);

      // DÉSACTIVÉ : La gestion des boutons est maintenant dans main.js xrLoop
      // pour éviter les conflits et avoir un système centralisé
      
      // Note : Les boutons X/Y (main gauche) et B (machine à café) 
      // sont gérés dans main.js via inputSources.gamepad.buttons
    });
  }
});