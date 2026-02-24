import 'aframe';
import 'aframe-extras';
import 'aframe-physics-system';
import * as THREE from 'three';

// Globals (État du jeu)
window.isInventoryOpen = false;
window.menuLock = false;
window.isAnyBtnPressed = false;
window.uiClickLock = false;

// --- SYSTÈMES ---
import './systems/game-manager.js';
import './systems/ar-notifier.js';

// --- COMPOSANTS DE BASE & AR ---
import './components/ar-cursor.js';
import './components/ar-plane-detection.js';
import './components/welcome-panel.js';
import './components/vr-controls.js';

// --- COMPOSANTS D'INTERACTION ---
import './components/grab-system.js'; 
import './components/hud-menu.js';

// --- COMPOSANTS DE GAMEPLAY (Rétablis) ---
import './components/coffee-machine.js';
import './components/coffee-temperature.js';
import './components/customer-spawner.js';
import './components/customer.js';
import './components/trashcan.js';
import './components/stain-manager.js';
import './components/broom-cleaner.js';

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const scene = document.querySelector('a-scene');

    if (startBtn) {
        startBtn.onclick = async () => {
            try {
                const session = await navigator.xr.requestSession('immersive-ar', {
                    requiredFeatures: ['local-floor'],
                    optionalFeatures: ['dom-overlay', 'plane-detection', 'hand-tracking'],
                    domOverlay: { root: document.body }
                });

                scene.renderer.xr.setSession(session);
                window.xrSession = session;

                document.getElementById('landing-page').style.display = 'none';
                scene.play();

                // --- DÉTECTION DES MANETTES (Logic Depart Corrigée) ---
                const rig = document.getElementById('rig').object3D;
                
                const onConnected = (event) => {
                    const controller = event.target;
                    const handedness = event.data.handedness;
                    
                    if (handedness === 'left') {
                        window.leftController = controller;
                        console.log('✅ Main GAUCHE reconnue');
                    } else {
                        window.rightController = controller;
                        console.log('✅ Main DROITE reconnue');
                    }
                    rig.add(controller);
                };

                // On écoute les deux slots de contrôleurs possibles
                scene.renderer.xr.getController(0).addEventListener('connected', onConnected);
                scene.renderer.xr.getController(1).addEventListener('connected', onConnected);

                session.requestAnimationFrame(xrLoop);

                // Initialisation du gameplay
                scene.setAttribute('game-manager', '');
                scene.setAttribute('stain-manager', '');
                
                setTimeout(() => {
                    document.getElementById('cam').setAttribute('welcome-panel', '');
                    const spawner = document.querySelector('[customer-spawner]') || document.getElementById('logic-spawner');
                    if (spawner) spawner.setAttribute('customer-spawner', '');
                }, 1000);

            } catch (err) {
                console.error("Erreur session XR:", err);
            }
        };
    }
});

function handleControllerInteraction(controller) {
    if (!controller) return;

    let line = controller.getObjectByName('laser-line');
    let cursor = controller.getObjectByName('laser-cursor');

    if (!line) {
        const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
        const isLeft = (controller === window.leftController);
        const lineMat = new THREE.LineBasicMaterial({ color: isLeft ? 0xFF0000 : 0xFFFFFF });
        line = new THREE.Line(lineGeom, lineMat);
        line.name = 'laser-line';
        controller.add(line);
    }
    if (!cursor) {
        cursor = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.02, 32), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
        cursor.name = 'laser-cursor';
        controller.add(cursor);
    }

    const isMenuOpen = document.querySelector('[welcome-panel]') || window.isInventoryOpen;
    line.visible = !!isMenuOpen;
    cursor.visible = false;

    if (!line.visible) return;

    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const buttons = [];
    document.querySelector('a-scene').object3D.traverse(obj => {
        if (obj.el && obj.el.classList.contains('clickable') && obj.isMesh) buttons.push(obj);
    });

    const intersects = raycaster.intersectObjects(buttons);
    if (intersects.length > 0) {
        const dist = intersects[0].distance;
        line.scale.z = dist;
        cursor.position.z = -dist;
        cursor.visible = true;

        if (window.isAnyBtnPressed && !window.uiClickLock) {
            window.uiClickLock = true;
            intersects[0].object.el.emit('click');
        }
    } else {
        line.scale.z = 5;
    }
}

function xrLoop(time, frame) {
    const ses = window.xrSession;
    if (ses) {
        let pressed = false;
        for (const source of ses.inputSources) {
            if (!source.gamepad) continue;
            if (source.gamepad.buttons[0].pressed) pressed = true;
            
            // INVENTAIRE (Boutons X/Y sur la main GAUCHE uniquement)
            if (source.handedness === 'left') {
                const menuPressed = source.gamepad.buttons[4]?.pressed || source.gamepad.buttons[5]?.pressed;
                if (menuPressed && !window.menuLock) {
                    window.menuLock = true;
                    window.isInventoryOpen = !window.isInventoryOpen;
                    const cam = document.getElementById('cam');
                    if (window.isInventoryOpen) cam.setAttribute('hud-menu', '');
                    else cam.removeAttribute('hud-menu');
                } else if (!menuPressed) {
                    window.menuLock = false;
                }
            }
        }
        window.isAnyBtnPressed = pressed;
        if (!pressed) window.uiClickLock = false;
    }
    handleControllerInteraction(window.leftController);
    handleControllerInteraction(window.rightController);
    if (window.xrSession) window.xrSession.requestAnimationFrame(xrLoop);
}