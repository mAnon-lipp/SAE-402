import 'aframe';
import * as THREE from 'three';

/**
 * Composant: xr-interaction-system
 * Description: Système d'interaction XR manuel basé sur xrLoop et raycasting THREE.js
 * Gère le grab (trigger/bouton 0) et l'activation de la machine à café (bouton B)
 * Basé sur l'architecture de la branche Depart
 */
AFRAME.registerComponent('xr-interaction-system', {
  init: function () {
    // ⚡ Plus besoin de stocker les contrôleurs localement,
    // on utilise window.leftController et window.rightController du main.js
    
    // État du grab
    this.leftGrabbedObject = null;
    this.rightGrabbedObject = null;
    
    // États des boutons (pour détecter les transitions)
    this.leftTriggerPressed = false;
    this.rightTriggerPressed = false;
    this.rightBPressed = false;
    
    // Raycasters pour chaque main
    this.leftRaycaster = new THREE.Raycaster();
    this.rightRaycaster = new THREE.Raycaster();
    
    // Configuration du raycaster
    this.leftRaycaster.far = 10;
    this.rightRaycaster.far = 10;
    
    console.log('🎮 XR Interaction System initialisé (utilise window controllers)');
  },

  tick: function () {
    const session = this.el.sceneEl.renderer.xr.getSession();
    if (!session) return;

    // ⚡ UTILISER LES CONTRÔLEURS GLOBAUX au lieu de getController()
    const leftController = window.leftController;
    const rightController = window.rightController;
    
    // Vérifier qu'au moins un contrôleur est connecté
    if (!leftController && !rightController) {
      // Pas de contrôleurs disponibles, ne rien faire
      return;
    }

    // Parcourir les inputSources pour détecter les boutons
    for (const source of session.inputSources) {
      if (!source || !source.gamepad) continue;

      const buttons = source.gamepad.buttons;
      const hand = source.handedness; // 'left' ou 'right'
      
      // Sélectionner le bon contrôleur selon la main
      const controller = hand === 'left' ? leftController : rightController;
      
      if (!controller || !controller.matrixWorld) continue;

      // ========== GRAB : TRIGGER (Bouton 0) ==========
      const triggerPressed = buttons[0] && buttons[0].pressed;
      
      if (hand === 'left') {
        // Détection du passage de non-pressé à pressé
        if (triggerPressed && !this.leftTriggerPressed) {
          this.handleTriggerDown(controller, 'left');
        }
        // Détection du passage de pressé à relâché
        if (!triggerPressed && this.leftTriggerPressed) {
          this.handleTriggerUp(controller, 'left');
        }
        this.leftTriggerPressed = triggerPressed;
      }

      if (hand === 'right') {
        if (triggerPressed && !this.rightTriggerPressed) {
          this.handleTriggerDown(controller, 'right');
        }
        if (!triggerPressed && this.rightTriggerPressed) {
          this.handleTriggerUp(controller, 'right');
        }
        this.rightTriggerPressed = triggerPressed;
      }

      // ========== MACHINE À CAFÉ : BOUTON B (Bouton 1 ou 5) ==========
      if (hand === 'right') {
        // Bouton B sur Quest peut être buttons[1] ou buttons[5] selon le contexte
        const bPressed = (buttons[1] && buttons[1].pressed) || 
                        (buttons[5] && buttons[5].pressed);
        
        if (bPressed && !this.rightBPressed) {
          this.handleBButtonDown(controller);
        }
        this.rightBPressed = bPressed;
      }
    }

    // Mettre à jour la position des objets grabbés
    this.updateGrabbedObjects();
  },

  /**
   * Gestion du Trigger Down (Grab)
   */
  handleTriggerDown: function (controller, hand) {
    console.log(`✊ Trigger DOWN - Main ${hand}`);

    // Créer le raycaster depuis le contrôleur
    const raycaster = hand === 'left' ? this.leftRaycaster : this.rightRaycaster;
    
    // Origine et direction depuis matrixWorld du contrôleur
    const origin = new THREE.Vector3();
    const direction = new THREE.Vector3(0, 0, -1);
    
    origin.setFromMatrixPosition(controller.matrixWorld);
    
    // Extraire la direction depuis la matrice de rotation
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.extractRotation(controller.matrixWorld);
    direction.applyMatrix4(tempMatrix);
    direction.normalize();
    
    raycaster.set(origin, direction);

    // Chercher tous les objets grabbables
    const grabbables = Array.from(document.querySelectorAll('.grabbable'))
      .map(el => el.object3D)
      .filter(obj => obj);

    const intersects = raycaster.intersectObjects(grabbables, true);

    if (intersects.length > 0) {
      // Trouver l'entité A-Frame parente
      let targetObj = intersects[0].object;
      while (targetObj && !targetObj.el) {
        targetObj = targetObj.parent;
      }

      if (targetObj && targetObj.el) {
        const entity = targetObj.el;
        
        // Vérifier que l'objet n'est pas déjà grabbé
        if (entity === this.leftGrabbedObject || entity === this.rightGrabbedObject) {
          console.log('⚠️ Objet déjà grabbé');
          return;
        }

        console.log(`✅ Objet grabbé: ${entity.getAttribute('gltf-model') || 'box'}`);
        
        // Stocker l'objet grabbé
        if (hand === 'left') {
          this.leftGrabbedObject = entity;
        } else {
          this.rightGrabbedObject = entity;
        }

        // Désactiver la physique (passer en kinematic)
        if (entity.body) {
          entity.body.type = 2; // KINEMATIC
          entity.body.mass = 0;
          entity.body.collisionResponse = false;
          entity.body.updateMassProperties();
        }

        // Attacher l'objet au contrôleur
        controller.attach(entity.object3D);
      }
    } else {
      console.log('🔍 Aucun objet grabbable trouvé dans la direction du raycaster');
    }
  },

  /**
   * Gestion du Trigger Up (Release)
   */
  handleTriggerUp: function (controller, hand) {
    const grabbedObject = hand === 'left' ? this.leftGrabbedObject : this.rightGrabbedObject;
    
    if (!grabbedObject) {
      console.log(`🖐️ Trigger UP - Main ${hand} (rien à relâcher)`);
      return;
    }

    console.log(`🖐️ Objet relâché: ${grabbedObject.getAttribute('gltf-model') || 'box'}`);

    // ⚡ MARQUER L'OBJET COMME EN COURS DE RELEASE (pour éviter détection collision immédiate)
    grabbedObject.dataset.isBeingReleased = 'true';

    try {
      // ⚡ ÉTAPE 1 : Détacher de la manette et remettre dans la scène
      // Utilise .attach() pour préserver la position/rotation mondiale exacte
      this.el.sceneEl.object3D.attach(grabbedObject.object3D);
      console.log('✅ Objet détaché du contrôleur et réattaché à la scène');

      // ⚡ ÉTAPE 2 : Attendre suffisamment avant de réactiver la physique
      setTimeout(() => {
        if (!grabbedObject || !grabbedObject.body) {
          console.warn('⚠️ Objet ou body introuvable lors de la réactivation physique');
          return;
        }

        try {
          // Synchroniser position/rotation avec le monde
          const pos = grabbedObject.object3D.getWorldPosition(new THREE.Vector3());
          const quat = grabbedObject.object3D.getWorldQuaternion(new THREE.Quaternion());
          
          grabbedObject.body.position.set(pos.x, pos.y, pos.z);
          grabbedObject.body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
          
          // Réactiver la physique dynamique
          grabbedObject.body.type = 1; // DYNAMIC
          grabbedObject.body.mass = 0.3;
          grabbedObject.body.collisionResponse = true;
          grabbedObject.body.updateMassProperties();
          grabbedObject.body.wakeUp();
          
          console.log('✅ Physique réactivée avec succès');
          
          // ⚡ DÉBLOQUER LA DÉTECTION COLLISION APRÈS UN DÉLAI SÉCURISÉ
          setTimeout(() => {
            delete grabbedObject.dataset.isBeingReleased;
            console.log('✅ Objet prêt pour détection collision');
          }, 300);  // Attendre 300ms après réactivation physique
          
        } catch (physicsError) {
          console.error('❌ Erreur réactivation physique:', physicsError);
        }
      }, 200);  // ⚡ Augmenté à 200ms
      
    } catch (e) {
      console.error('❌ Erreur lors du release:', e);
      console.error('Stack:', e.stack);
    }

    // Réinitialiser immédiatement (ne pas attendre le setTimeout)
    if (hand === 'left') {
      this.leftGrabbedObject = null;
    } else {
      this.rightGrabbedObject = null;
    }
  },

  /**
   * Gestion du Bouton B (Machine à Café)
   */
  handleBButtonDown: function (controller) {
    console.log('☕ Bouton B pressé - Recherche de machine à café...');

    // Créer le raycaster depuis le contrôleur droit
    const raycaster = this.rightRaycaster;
    
    const origin = new THREE.Vector3();
    const direction = new THREE.Vector3(0, 0, -1);
    
    origin.setFromMatrixPosition(controller.matrixWorld);
    
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.extractRotation(controller.matrixWorld);
    direction.applyMatrix4(tempMatrix);
    direction.normalize();
    
    raycaster.set(origin, direction);

    // Chercher toutes les machines à café
    const machines = Array.from(document.querySelectorAll('[coffee-machine]'))
      .map(el => el.object3D)
      .filter(obj => obj);

    const intersects = raycaster.intersectObjects(machines, true);

    if (intersects.length > 0) {
      // Trouver l'entité machine à café
      let targetObj = intersects[0].object;
      while (targetObj && !targetObj.el) {
        targetObj = targetObj.parent;
      }

      if (targetObj && targetObj.el && targetObj.el.components['coffee-machine']) {
        console.log('✅ Machine à café détectée! Activation...');
        this.handleCoffeeMachineClick(targetObj.el);
      }
    } else {
      console.log('❌ Aucune machine à café dans la direction du pointeur');
    }
  },

  /**
   * Fabrication de café (appelée quand on clique sur la machine)
   */
  handleCoffeeMachineClick: function (machineEntity) {
    const machineComp = machineEntity.components['coffee-machine'];
    
    if (!machineComp) {
      console.log('⚠️ Pas de composant coffee-machine sur cette entité');
      return;
    }

    // Appeler directement la méthode onClick du composant coffee-machine
    // qui gère toute la logique de brewing (son, timer, spawn de tasse)
    machineComp.onClick();
  },

  /**
   * Mise à jour des objets grabbés (pour qu'ils suivent la main)
   */
  updateGrabbedObjects: function () {
    // Les objets sont déjà enfants des contrôleurs via attach()
    // Leur position/rotation est automatiquement mise à jour par THREE.js
    // Mais on doit synchroniser la physique

    if (this.leftGrabbedObject && this.leftGrabbedObject.body) {
      const pos = this.leftGrabbedObject.object3D.getWorldPosition(new THREE.Vector3());
      const quat = this.leftGrabbedObject.object3D.getWorldQuaternion(new THREE.Quaternion());
      this.leftGrabbedObject.body.position.set(pos.x, pos.y, pos.z);
      this.leftGrabbedObject.body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    }

    if (this.rightGrabbedObject && this.rightGrabbedObject.body) {
      const pos = this.rightGrabbedObject.object3D.getWorldPosition(new THREE.Vector3());
      const quat = this.rightGrabbedObject.object3D.getWorldQuaternion(new THREE.Quaternion());
      this.rightGrabbedObject.body.position.set(pos.x, pos.y, pos.z);
      this.rightGrabbedObject.body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    }
  }
});
