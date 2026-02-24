import 'aframe';

AFRAME.registerComponent('welcome-panel', {
  init: function () {
    // Le conteneur principal
    this.panel = document.createElement('a-entity');
    this.panel.setAttribute('id', 'welcome-panel-entity');
    this.panel.setAttribute('position', '0 0 -1.2'); // Devant la caméra

    // --- FOND PAPIER ---
    const paper = document.createElement('a-plane');
    paper.setAttribute('width', '1.02');
    paper.setAttribute('height', '1.24');
    paper.setAttribute('color', '#f5f0e1');
    paper.setAttribute('material', 'shader: flat; side: double');
    this.panel.appendChild(paper);

    // --- OMBRE ---
    const shadow = document.createElement('a-plane');
    shadow.setAttribute('width', '1.04');
    shadow.setAttribute('height', '1.26');
    shadow.setAttribute('color', '#8b7355');
    shadow.setAttribute('opacity', '0.3');
    shadow.setAttribute('position', '0.01 -0.01 -0.01');
    this.panel.appendChild(shadow);

    // --- TITRE ---
    const title = document.createElement('a-text');
    title.setAttribute('value', '~ HOLO BARISTA ~');
    title.setAttribute('align', 'center');
    title.setAttribute('position', '0 0.56 0.01');
    title.setAttribute('width', '1.5');
    title.setAttribute('color', '#2d1810');
    title.setAttribute('font', 'mozillavr');
    this.panel.appendChild(title);

    // --- LIGNE DECORATIVE ---
    const line = document.createElement('a-plane');
    line.setAttribute('width', '0.5');
    line.setAttribute('height', '0.003');
    line.setAttribute('color', '#8b4513');
    line.setAttribute('position', '0 0.16 0.01');
    this.panel.appendChild(line);

    // --- TEXTE D'INSTRUCTIONS ---
    const introText = document.createElement('a-text');
    introText.setAttribute('value',
        'Welcome to Holo Barista!\n\n' +
        'You are the barista of a virtual coffee shop.\n' +
        'Your mission: serve delicious coffee!\n\n' +
        '~ HOW TO PLAY ~\n\n' +
        '1. Press Y/X to open the VR Store\n' +
        '2. Place a Coffee Machine\n' +
        '3. Point at it and press Trigger to brew\n' +
        '4. Grab the cup and serve!\n' +
        '5. Use the Trash to clean up\n\n' +
        'Good luck, barista!'
    );
    introText.setAttribute('align', 'center');
    introText.setAttribute('position', '0 -0.02 0.01');
    introText.setAttribute('width', '1.1');
    introText.setAttribute('color', '#3d2914');
    introText.setAttribute('line-height', '55');
    this.panel.appendChild(introText);

    // --- BOUTON START (INTERACTIF) ---
    const closeBtn = document.createElement('a-entity');
    closeBtn.setAttribute('id', 'welcome-close-btn');
    closeBtn.setAttribute('geometry', { primitive: 'box', width: 0.2, height: 0.06, depth: 0.02 });
    closeBtn.setAttribute('material', { color: '#8b4513' });
    closeBtn.setAttribute('position', '0 -0.55 0.02');
    closeBtn.classList.add('clickable');

    // CRUCIAL : Liaison pour le Raycaster manuel de main.js
    closeBtn.addEventListener('loaded', () => {
        const mesh = closeBtn.getObject3D('mesh');
        if (mesh) mesh.el = closeBtn;
    });

    const closeTxt = document.createElement('a-text');
    closeTxt.setAttribute('value', 'START');
    closeTxt.setAttribute('align', 'center');
    closeTxt.setAttribute('position', '0 0.01 0.02');
    closeTxt.setAttribute('width', '1.2');
    closeTxt.setAttribute('color', '#f5f0e1');
    closeBtn.appendChild(closeTxt);

    // Clic pour fermer
    closeBtn.addEventListener('click', () => {
        this.closePanel();
    });

    this.panel.appendChild(closeBtn);
    this.el.appendChild(this.panel);
  },

  closePanel: function () {
    if (this.panel.parentNode) {
        this.panel.parentNode.removeChild(this.panel);
    }
    console.log('📜 Welcome Panel Fermé. Début du jeu !');
    this.el.sceneEl.emit('start-game');
    this.el.removeAttribute('welcome-panel');
  }
});