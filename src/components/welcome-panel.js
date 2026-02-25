import 'aframe';

AFRAME.registerComponent('welcome-panel', {
  init: function () {
    this.panel = document.createElement('a-entity');
    this.panel.setAttribute('id', 'welcome-panel-entity'); // Utilisé par main.js pour le rayon
    this.panel.setAttribute('position', '0 0 -1.2');

    // Fond papier
    const paper = document.createElement('a-plane');
    paper.setAttribute('width', '1.02');
    paper.setAttribute('height', '1.24');
    paper.setAttribute('color', '#f5f0e1');
    paper.setAttribute('material', 'shader: flat; side: double');
    this.panel.appendChild(paper);

    // Titre
    const title = document.createElement('a-text');
    title.setAttribute('value', '~ HOLO BARISTA ~');
    title.setAttribute('align', 'center');
    title.setAttribute('position', '0 0.56 0.01');
    title.setAttribute('width', '1.5');
    title.setAttribute('color', '#2d1810');
    title.setAttribute('font', 'mozillavr');
    this.panel.appendChild(title);

    // Instructions
    const introText = document.createElement('a-text');
    introText.setAttribute('value',
        'Welcome to Holo Barista!\n\n' +
        'Mission: serve delicious coffee!\n\n' +
        '~ HOW TO PLAY ~\n\n' +
        '1. Press Y/X to open the Store\n' +
        '2. Place a Coffee Machine\n' +
        '3. Point and Trigger to brew\n' +
        '4. Grab the cup and serve!\n' +
        '5. Use Trash to clean up'
    );
    introText.setAttribute('align', 'center');
    introText.setAttribute('position', '0 -0.02 0.01');
    introText.setAttribute('width', '1.1');
    introText.setAttribute('color', '#3d2914');
    this.panel.appendChild(introText);

    // Bouton START
    const closeBtn = document.createElement('a-box');
    closeBtn.setAttribute('id', 'welcome-close-btn');
    closeBtn.setAttribute('width', '0.2');
    closeBtn.setAttribute('height', '0.08');
    closeBtn.setAttribute('depth', '0.02');
    closeBtn.setAttribute('color', '#8b4513');
    closeBtn.setAttribute('position', '0 -0.55 0.02');
    closeBtn.classList.add('clickable');

    const closeTxt = document.createElement('a-text');
    closeTxt.setAttribute('value', 'START');
    closeTxt.setAttribute('align', 'center');
    closeTxt.setAttribute('position', '0 0 0.02');
    closeTxt.setAttribute('width', '1.2');
    closeTxt.setAttribute('color', '#f5f0e1');
    closeBtn.appendChild(closeTxt);

    closeBtn.addEventListener('click', () => {
        this.closePanel();
    });

    this.panel.appendChild(closeBtn);
    this.el.appendChild(this.panel);
  },

  closePanel: function () {
    if (this.panel && this.panel.parentNode) {
        this.panel.parentNode.removeChild(this.panel);
    }
    console.log('📜 Welcome Panel Fermé. Début du jeu !');

    // On informe la scène que le jeu commence
    this.el.sceneEl.emit('start-game');

    // IMPORTANT : On retire le composant de la caméra
    this.el.removeAttribute('welcome-panel');

    // Nettoyage de la référence pour libérer le raycasting
    this.panel = null;
  }
});