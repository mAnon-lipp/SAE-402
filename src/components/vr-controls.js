import 'aframe';

AFRAME.registerComponent('vr-controls', {
  init: function () {
    // Boutons de la manette gauche (X / Y) ou droite (A / B) pour ouvrir le menu
    this.el.addEventListener('xbuttondown', this.toggleMenu.bind(this));
    this.el.addEventListener('ybuttondown', this.toggleMenu.bind(this));
    this.el.addEventListener('bbuttondown', this.toggleMenu.bind(this));
  },

  toggleMenu: function () {
    const menu = document.querySelector('[hud-menu]');
    if (menu) {
      const isVisible = menu.getAttribute('visible');
      menu.setAttribute('visible', !isVisible);
      console.log('Affichage du menu VR:', !isVisible);
    }
  }
});