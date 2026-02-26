import 'aframe';
import * as THREE from 'three';

/**
 * Composant: coffee-machine-pointer
 * Description: Gère le système de pointage et d'activation de la machine à café avec le bouton B
 * Attaché à la scène pour écouter globalement le bouton B
 */
AFRAME.registerComponent('coffee-machine-pointer', {
  init: function () {
    this.bButtonPressed = false;
    this.highlightedMachine = null;
    
    // Création du rayon visuel pour pointer la machine
    this.createPointerRay();
  },

  createPointerRay: function () {
    // Le rayon apparaîtra sur la main droite quand on pointe une machine
    this.pointerRay = null; // Sera créé dynamiquement
  },

  tick: function () {
    // Vérifier si le bouton B est pressé via les inputSources
    const session = this.el.sceneEl.renderer.xr.getSession();
    if (!session) return;

    let bPressed = false;
    let rightController = null;

    // Parcourir les sources d'entrée
    for (const source of session.inputSources) {
      if (source.handedness === 'right' && source.gamepad) {
        rightController = source;
        // Bouton B = bouton index 1
        if (source.gamepad.buttons[1] && source.gamepad.buttons[1].pressed) {
          bPressed = true;
        }
        break;
      }
    }

    // Raycasting depuis la main droite
    const rightHand = document.getElementById('rightHand');
    if (!rightHand || !rightHand.object3D) return;

    const raycaster = new THREE.Raycaster();
    const handPos = new THREE.Vector3();
    const handDir = new THREE.Vector3(0, 0, -1);
    
    rightHand.object3D.getWorldPosition(handPos);
    rightHand.object3D.getWorldDirection(handDir);
    
    raycaster.set(handPos, handDir);

    // Chercher toutes les machines à café
    const machines = Array.from(document.querySelectorAll('[coffee-machine]'))
      .map(el => el.object3D)
      .filter(obj => obj);

    const intersects = raycaster.intersectObjects(machines, true);

    // Réinitialiser le highlight
    if (this.highlightedMachine) {
      this.removeHighlight(this.highlightedMachine);
      this.highlightedMachine = null;
    }

    // Si on pointe une machine
    if (intersects.length > 0) {
      let targetObj = intersects[0].object;
      
      // Remonter jusqu'à trouver l'entité A-Frame
      while (targetObj && !targetObj.el) {
        targetObj = targetObj.parent;
      }

      if (targetObj && targetObj.el && targetObj.el.components['coffee-machine']) {
        this.highlightedMachine = targetObj.el;
        
        // Afficher un indicateur visuel
        this.showHighlight(this.highlightedMachine);

        // Si le bouton B est pressé ET qu'on vient de l'appuyer (pas tenu)
        if (bPressed && !this.bButtonPressed) {
          this.activateMachine(this.highlightedMachine);
        }
      }
    }

    this.bButtonPressed = bPressed;
  },

  showHighlight: function (machineEl) {
    // Créer un cercle vert au-dessus de la machine
    if (!machineEl.querySelector('.machine-highlight')) {
      const highlight = document.createElement('a-ring');
      highlight.classList.add('machine-highlight');
      highlight.setAttribute('position', '0 0.3 0');
      highlight.setAttribute('rotation', '-90 0 0');
      highlight.setAttribute('radius-inner', '0.08');
      highlight.setAttribute('radius-outer', '0.12');
      highlight.setAttribute('color', '#00ff00');
      highlight.setAttribute('material', 'shader: flat; opacity: 0.8');
      highlight.setAttribute('animation', 'property: rotation; to: -90 360 0; loop: true; dur: 2000; easing: linear');
      machineEl.appendChild(highlight);
    }
  },

  removeHighlight: function (machineEl) {
    const highlight = machineEl.querySelector('.machine-highlight');
    if (highlight && highlight.parentNode) {
      highlight.parentNode.removeChild(highlight);
    }
  },

  activateMachine: function (machineEl) {
    const comp = machineEl.components['coffee-machine'];
    if (comp && !comp.isBrewing) {
      comp.onClick(); // Déclenche la préparation
      console.log('☕ Bouton B : Machine à café activée par raycast!');
      
      // Feedback visuel : flash blanc
      const highlight = machineEl.querySelector('.machine-highlight');
      if (highlight) {
        highlight.setAttribute('color', '#ffffff');
        setTimeout(() => {
          if (highlight.parentNode) {
            highlight.setAttribute('color', '#00ff00');
          }
        }, 100);
      }
    } else if (comp && comp.isBrewing) {
      console.log('⏳ Machine déjà en cours de préparation...');
    }
  }
});
