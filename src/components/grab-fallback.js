import 'aframe';

/**
 * Composant: grab-fallback
 * Description: Système de secours pour le grab qui écoute directement l'API WebXR
 * Attaché à la scène pour détecter les pressions grip/trigger sur les deux mains
 */
AFRAME.registerComponent('grab-fallback', {
  init: function () {
    this.leftGripPressed = false;
    this.rightGripPressed = false;
    this.leftTriggerPressed = false;
    this.rightTriggerPressed = false;
    
    console.log('🔧 Grab-fallback initialisé (backup pour hand-controls)');
  },

  tick: function () {
    const session = this.el.sceneEl.renderer.xr.getSession();
    if (!session) return;

    // Vérifier les états des boutons pour chaque manette
    for (const source of session.inputSources) {
      if (!source.gamepad) continue;

      const hand = source.handedness; // 'left' ou 'right'
      const buttons = source.gamepad.buttons;
      
      // Grip = bouton 1 (gâchette arrière sur Quest)
      const gripPressed = buttons[1] && buttons[1].pressed;
      // Trigger = bouton 0 (gâchette avant sur Quest)
      const triggerPressed = buttons[0] && buttons[0].pressed;

      // Main gauche
      if (hand === 'left') {
        // Détection du passage à pressed
        if (gripPressed && !this.leftGripPressed) {
          this.emitGrabEvent('left', 'grip');
        }
        if (!gripPressed && this.leftGripPressed) {
          this.emitReleaseEvent('left', 'grip');
        }
        
        this.leftGripPressed = gripPressed;
      }

      // Main droite  
      if (hand === 'right') {
        // Détection du passage à pressed
        if (gripPressed && !this.rightGripPressed) {
          this.emitGrabEvent('right', 'grip');
        }
        if (!gripPressed && this.rightGripPressed) {
          this.emitReleaseEvent('right', 'grip');
        }
        
        this.rightGripPressed = gripPressed;
      }
    }
  },

  emitGrabEvent: function (hand, button) {
    const handEl = document.getElementById(hand === 'left' ? 'leftHand' : 'rightHand');
    if (!handEl) return;

    console.log(`🎮 FALLBACK: ${hand} ${button} DOWN détecté!`);
    
    // Émettre l'événement gripdown comme si hand-controls l'avait fait
    handEl.emit('gripdown', { hand: hand });
    
    // Appeler directement le grab-system si l'événement ne marche pas
    const grabComp = handEl.components['grab-system'];
    if (grabComp && grabComp.onGrab) {
      grabComp.onGrab({ type: 'gripdown', detail: { hand: hand } });
    }
  },

  emitReleaseEvent: function (hand, button) {
    const handEl = document.getElementById(hand === 'left' ? 'leftHand' : 'rightHand');
    if (!handEl) return;

    console.log(`🎮 FALLBACK: ${hand} ${button} UP détecté!`);
    
    // Émettre l'événement gripup
    handEl.emit('gripup', { hand: hand });
    
    // Appeler directement le grab-system
    const grabComp = handEl.components['grab-system'];
    if (grabComp && grabComp.onRelease) {
      grabComp.onRelease({ type: 'gripup', detail: { hand: hand } });
    }
  }
});
