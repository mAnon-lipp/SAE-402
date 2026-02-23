import 'aframe';
import 'aframe-extras';
import 'aframe-physics-system';

// Import des composants AR personnalisés
import './components/ar-plane-detection.js';
import './components/coffee-temperature.js';
import './components/xr-grab.js';
import './components/game-manager.js';
import './components/customer-manager.js';
import './components/coffee-machine.js';
import './components/cleaning-system.js';
import './components/force-transparent.js';

/* global THREE */

console.log('☕ SAE 402 - Chargement...');

window.addEventListener('load', () => {
    // Remove setTimeout to execute immediately
    const debugEl = document.getElementById('debug');
    const surfacesEl = document.getElementById('surfaces');
    const startBtn = document.getElementById('start-btn');
    const landingPage = document.getElementById('landing-page');
    const gameContainer = document.getElementById('game-container');
    const sceneEl = document.getElementById('scene');
    const cubeEl = document.getElementById('cube');
    let cursorEl = document.getElementById('cursor');

    // Display what was found for debugging
    if (debugEl) {
        debugEl.textContent = `Btn: ${startBtn ? 'OK' : 'NULL'} | Scene: ${sceneEl ? 'OK' : 'NULL'}`;
    }

    // ✅ RESET INITIAL STATE - Force correct visibility on load/refresh
    if (landingPage) {
        landingPage.style.display = 'block';
    }
    if (gameContainer) {
        gameContainer.classList.remove('visible');
        gameContainer.classList.add('hidden');
    }
    if (sceneEl) {
        sceneEl.style.display = 'none';
    }

    if (!sceneEl) {
        if (debugEl) debugEl.textContent = 'A-Scene manquant!';
        console.error('A-Scene element not found!');
        return;
    }

        // AUTO-CREATE CURSOR IF MISSING
        if (!cursorEl && sceneEl) {
            console.log('Creating cursor manually...');
            cursorEl = document.createElement('a-ring');
            cursorEl.id = 'cursor';
            cursorEl.setAttribute('color', 'green');
        cursorEl.setAttribute('radius-inner', '0.05');
        cursorEl.setAttribute('radius-outer', '0.08');
        cursorEl.setAttribute('rotation', '-90 0 0');
        cursorEl.setAttribute('visible', 'false');
        cursorEl.setAttribute('material', 'shader: flat; opacity: 0.8; transparent: true');
        sceneEl.appendChild(cursorEl);
    }

    // UI interaction locks
    let menuToggleLock = false;
    let coffeeMachineLock = false;

    // XR Session variables (MUST be declared here for proper scope)
    let xrSession = null;
    let xrRefSpace = null;
    let hitTestSource = null;
    let planeDetectionActive = false;
    
    console.log('✅ XR Variables declared:', { xrSession, xrRefSpace, hitTestSource });
    if (debugEl) debugEl.textContent = '✅ Variables XR init OK';

    // --- 🔍 SYSTÈME DE DEBUG AR ULTRA-VISIBLE ---
    let arDebugPanel = null;
    let arDebugText = null;

        function createARDebugPanel() {
            const cam = document.getElementById('cam');
            if (!cam) return;

            arDebugPanel = document.createElement('a-entity');
            arDebugPanel.setAttribute('position', '0 0.15 -0.8'); // Devant les yeux
            
            // Fond noir
            const bg = document.createElement('a-plane');
            bg.setAttribute('width', '0.6');
            bg.setAttribute('height', '0.2');
            bg.setAttribute('color', '#000000');
            bg.setAttribute('opacity', '0.8');
            arDebugPanel.appendChild(bg);
            
            // Texte de debug
            arDebugText = document.createElement('a-text');
            arDebugText.setAttribute('value', 'DEBUG: Init...');
            arDebugText.setAttribute('align', 'center');
            arDebugText.setAttribute('position', '0 0 0.01');
            arDebugText.setAttribute('width', '1.2');
            arDebugText.setAttribute('color', '#00ff00');
            arDebugText.setAttribute('wrap-count', '30');
            arDebugPanel.appendChild(arDebugText);
            
            cam.appendChild(arDebugPanel);
            console.log('🔍 AR Debug Panel created');
        }

        function updateARDebug(message) {
            if (arDebugText) {
                arDebugText.setAttribute('value', message);
            }
            console.log('🔍 AR DEBUG:', message);
        }

        // Audio and coffee machine logic now fully handled by components

        // --- TRASHCAN DELETION SYSTEM ---
        const trashcans = []; // Liste des poubelles dans la scène
        const TRASH_RADIUS = 0.2; // Rayon de détection pour la suppression

        function removeObjectFromScene(objEl) {
            if (!objEl || !objEl.parentNode) return;

            // Remove from spawnedObjects array
            const idx = spawnedObjects.indexOf(objEl);
            if (idx > -1) {
                spawnedObjects.splice(idx, 1);
            }

            // Remove physics body if exists
            if (objEl.body) {
                objEl.body.world.removeBody(objEl.body);
            }

            // Remove from scene
            objEl.parentNode.removeChild(objEl);

            console.log('🗑️ Objet supprimé par la poubelle!');
            if (debugEl) debugEl.textContent = '🗑️ Objet jeté!';
        }

        function checkTrashcanCollisions() {
            if (trashcans.length === 0) return;

            const trashPos = new THREE.Vector3();
            const objPos = new THREE.Vector3();

            // Pour chaque poubelle
            trashcans.forEach(trashcan => {
                if (!trashcan || !trashcan.object3D) return;
                trashcan.object3D.getWorldPosition(trashPos);

                // Vérifier chaque objet spawned (sauf les poubelles elles-mêmes)
                const objectsToCheck = [...spawnedObjects].filter(obj =>
                    obj && !obj.classList.contains('trashcan')
                );

                objectsToCheck.forEach(obj => {
                    if (!obj || !obj.object3D) return;
                    obj.object3D.getWorldPosition(objPos);

                    const distance = trashPos.distanceTo(objPos);

                    if (distance < TRASH_RADIUS) {
                        removeObjectFromScene(obj);
                    }
                });

                // Vérifier aussi le cube de base
                if (cubeEl && cubeEl.object3D) {
                    cubeEl.object3D.getWorldPosition(objPos);
                    const distance = trashPos.distanceTo(objPos);
                    if (distance < TRASH_RADIUS) {
                        removeObjectFromScene(cubeEl);
                    }
                }
            });
        }

        // --- WELCOME PANEL (Intro Screen) ---
        let welcomePanel = null;

        function createWelcomePanel() {
            const cam = document.getElementById('cam');
            if (!cam) return;

            welcomePanel = document.createElement('a-entity');
            welcomePanel.setAttribute('position', '0 0 -1.2'); // 1.2m devant la caméra
            welcomePanel.setAttribute('rotation', '0 0 0');

            // --- PAPER BACKGROUND ---
            const paper = document.createElement('a-plane');
            paper.setAttribute('width', '1.02');
            paper.setAttribute('height', '1.24');
            paper.setAttribute('color', '#f5f0e1'); // Couleur papier vieilli
            paper.setAttribute('material', 'shader: flat; side: double');
            paper.setAttribute('position', '0 0 0');
            // Légère rotation pour effet manuscrit
            // paper.setAttribute('rotation', '0 0 -2');
            welcomePanel.appendChild(paper);

            // --- PAPER BORDER (Shadow effect) ---
            const shadow = document.createElement('a-plane');
            shadow.setAttribute('width', '1.04');
            shadow.setAttribute('height', '1.26');
            shadow.setAttribute('color', '#8b7355');
            shadow.setAttribute('opacity', '0.3');
            shadow.setAttribute('position', '0.01 -0.01 -0.01');
            // shadow.setAttribute('rotation', '0 0 -2');
            welcomePanel.appendChild(shadow);

            // --- TITLE ---
            const title = document.createElement('a-text');
            title.setAttribute('value', '~ HOLO BARISTA ~');
            title.setAttribute('align', 'center');
            title.setAttribute('position', '0 0.56 0.01');
            title.setAttribute('width', '1.5');
            title.setAttribute('color', '#2d1810'); // Brun foncé
            title.setAttribute('font', 'mozillavr');
            welcomePanel.appendChild(title);

            // --- DECORATIVE LINE ---
            const line = document.createElement('a-plane');
            line.setAttribute('width', '0.5');
            line.setAttribute('height', '0.003');
            line.setAttribute('color', '#8b4513');
            line.setAttribute('position', '0 0.16 0.01');
            welcomePanel.appendChild(line);

            // --- INTRO TEXT ---
            const introText = document.createElement('a-text');
            introText.setAttribute('value',
                'Welcome to Holo Barista!\\n\\n' +
                'You are the barista of a virtual coffee shop.\\n' +
                'Your mission: serve delicious coffee!\\n\\n' +
                '~ HOW TO PLAY ~\\n\\n' +
                '1. Press Y to open the VR Store\\n' +
                '2. Place a Coffee Machine\\n' +
                '3. Point at it and press B to brew\\n' +
                '4. Grab the cup and serve!\\n' +
                '5. Use the Trash to clean up\\n\\n' +
                'Good luck, barista!'
            );
            introText.setAttribute('align', 'center');
            introText.setAttribute('position', '0 -0.02 0.01');
            introText.setAttribute('width', '1.1');
            introText.setAttribute('color', '#3d2914');
            introText.setAttribute('line-height', '55');
            welcomePanel.appendChild(introText);

            // --- CLOSE BUTTON ---
            const closeBtn = document.createElement('a-box');
            closeBtn.setAttribute('width', '0.2');
            closeBtn.setAttribute('height', '0.06');
            closeBtn.setAttribute('depth', '0.02');
            closeBtn.setAttribute('color', '#8b4513');
            closeBtn.setAttribute('position', '0 -0.55 0.02');
            closeBtn.setAttribute('class', 'clickable');
            closeBtn.id = 'welcome-close-btn';

            // Button text
            const closeTxt = document.createElement('a-text');
            closeTxt.setAttribute('value', 'START');
            closeTxt.setAttribute('align', 'center');
            closeTxt.setAttribute('position', '0 0.01 0.02');
            closeTxt.setAttribute('width', '1.2');
            closeTxt.setAttribute('color', '#f5f0e1');
            closeBtn.appendChild(closeTxt);

            // Hover effect
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.setAttribute('color', '#a0522d');
                closeBtn.setAttribute('scale', '1.1 1.1 1.1');
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.setAttribute('color', '#8b4513');
                closeBtn.setAttribute('scale', '1 1 1');
            });

            welcomePanel.appendChild(closeBtn);

            cam.appendChild(welcomePanel);
            console.log('📜 Welcome Panel Created');

            return welcomePanel;
        }

        // Component events are now handled internally by each component
        // Customer manager handles delivery & refusal
        // Cleaning system handles stain cleaning
        // This keeps main.js focused on UI and scene setup


        // --- 3D INVENTORY HUD (Attached to Camera) ---
        let inventoryEntity = null;

        function createHUDInventory() {
            const menu = document.createElement('a-entity');
            inventoryEntity = menu;
            menu.setAttribute('visible', 'false'); // HIDDEN BY DEFAULT

            // Attach to Camera (HUD)
            const cam = document.getElementById('cam');
            if (!cam) return;

            // Position: Adjusted for new scale
            menu.setAttribute('position', '0 -0.2 -0.8');
            menu.setAttribute('rotation', '-15 0 0'); // Tilted up to face eyes
            menu.setAttribute('scale', '0.5 0.5 0.5'); // COMPACT SCALE

            // --- SIMPLE BACKGROUND (Plane) ---
            // Changed from Box to Plane to avoid Z-fighting/blocking issues
            const bg = document.createElement('a-plane');
            bg.setAttribute('width', '1.6');
            bg.setAttribute('height', '1.4');
            bg.setAttribute('color', '#000000');
            bg.setAttribute('opacity', '0.6'); // More transparent
            bg.setAttribute('shader', 'flat'); // Simple shader, no lighting issues
            bg.setAttribute('position', '0 -0.05 -0.01'); // Behind items
            menu.appendChild(bg);

            // Removed "Border" box to simplify view

            // Title
            const title = document.createElement('a-text');
            title.setAttribute('value', 'VR STORE');
            title.setAttribute('align', 'center');
            title.setAttribute('position', '0 0.55 0.03'); // Top
            title.setAttribute('width', '4');
            title.setAttribute('color', '#ffffff');
            title.setAttribute('font', 'mozillavr');
            title.setAttribute('letter-spacing', '2');
            menu.appendChild(title);

            // Decorative Line
            const line = document.createElement('a-plane');
            line.setAttribute('width', '1.0');
            line.setAttribute('height', '0.003');
            line.setAttribute('color', '#00cec9');
            line.setAttribute('position', '0 0.48 0.03');
            menu.appendChild(line);

            // Item Config
            // menuScale = taille dans le menu HUD (petit pour l'aperçu)
            // spawnScale = taille réelle dans la scène 3D
            const items = [
                // Row 1: Primitives + Basics
                { type: 'box', color: '#ff7675', label: 'CUBE' },
                { type: 'gltf', model: 'models/CoffeeMachine.glb', color: '#fab1a0', label: 'COFFEE', menuScale: '0.2 0.2 0.2', spawnScale: '0.4 0.4 0.4' },
                { type: 'gltf', model: 'models/TrashcanSmall.glb', color: '#a29bfe', label: 'POUBELLE', menuScale: '0.2 0.2 0.2', spawnScale: '0.8 0.8 0.8' },
                // Row 2 
                { type: 'gltf', label: 'SPEAKER', model: 'models/BassSpeakers.glb', color: '#fff', menuScale: '0.1 0.1 0.1', spawnScale: '0.8 0.8 0.8' },
                { type: 'gltf', label: 'BROOM', model: 'models/Broom.glb', color: '#fff', menuScale: '0.001 0.001 0.001', spawnScale: '0.004 0.004 0.004' },
                { type: 'gltf', label: 'REGISTER', model: 'models/Cashregister.glb', color: '#fff', menuScale: '0.005 0.005 0.005', spawnScale: '0.04 0.04 0.04' },
                // Row 3
                { type: 'gltf', label: 'SIGN', model: 'models/Coffeesign.glb', color: '#fff', menuScale: '0.04 0.04 0.04', spawnScale: '0.2 0.2 0.2' },
                { type: 'gltf', label: 'COUCH', model: 'models/Couch.glb', color: '#fff', menuScale: '0.08 0.08 0.08', spawnScale: '0.3 0.3 0.3' },
                { type: 'gltf', label: 'PLANT', model: 'models/Houseplant.glb', color: '#fff', menuScale: '0.1 0.1 0.1', spawnScale: '0.4 0.4 0.4' },
                { type: 'gltf', label: 'RUG', model: 'models/Rug.glb', color: '#fff', menuScale: '0.05 0.05 0.05', spawnScale: '0.4 0.4 0.4' }
            ];

            const gap = 0.35;
            const itemsPerRow = 4;
            const startX = -((itemsPerRow - 1) * gap) / 2;

            items.forEach((item, index) => {
                const row = Math.floor(index / itemsPerRow);
                const col = index % itemsPerRow;

                const x = startX + (col * gap);
                // Row 0: 0.25, Row 1: -0.15, Row 2: -0.55
                const y = 0.25 - (row * 0.4);

                // CONTAINER
                const btnGroup = document.createElement('a-entity');
                btnGroup.setAttribute('position', `${x} ${y} 0.05`);

                // CARD BACKGROUND (Clickable)
                const btn = document.createElement('a-box');
                btn.setAttribute('width', '0.28');
                btn.setAttribute('height', '0.32');
                btn.setAttribute('depth', '0.02');
                btn.setAttribute('color', '#2d3436');
                btn.setAttribute('opacity', '0.9');
                btn.setAttribute('class', 'clickable');

                // Spawn Data
                btn.dataset.spawnType = item.type;
                btn.dataset.spawnColor = item.color;
                if (item.model) btn.dataset.spawnModel = item.model;
                if (item.spawnScale) btn.dataset.spawnScale = item.spawnScale; // Taille de spawn

                // Hover Effects
                btn.addEventListener('mouseenter', () => {
                    btn.setAttribute('color', '#636e72');
                    btn.setAttribute('scale', '1.1 1.1 1.1');
                    const icon = btnGroup.querySelector('.item-icon');
                    if (icon) icon.setAttribute('animation', 'property: rotation; to: 25 385 0; dur: 800; easing: easeInOutQuad');
                });
                btn.addEventListener('mouseleave', () => {
                    btn.setAttribute('color', '#2d3436');
                    btn.setAttribute('scale', '1 1 1');
                    const icon = btnGroup.querySelector('.item-icon');
                    if (icon) icon.removeAttribute('animation');
                });

                btnGroup.appendChild(btn);

                // 3D ICON (Preview)
                // 3D ICON (Preview)
                let icon;
                if (item.type === 'gltf') {
                    icon = document.createElement('a-entity');
                    icon.setAttribute('gltf-model', `url(${item.model})`);
                    icon.setAttribute('scale', item.menuScale || '0.08 0.08 0.08'); // Taille dans le menu
                } else {
                    icon = document.createElement(`a-${item.type}`);
                    icon.setAttribute('scale', '0.06 0.06 0.06');
                    icon.setAttribute('material', `color: ${item.color}; metalness: 0.5; roughness: 0.1`);
                }

                icon.setAttribute('position', '0 0.04 0.06');
                icon.setAttribute('rotation', '25 25 0');
                icon.setAttribute('class', 'item-icon');
                btnGroup.appendChild(icon);

                // LABEL
                const label = document.createElement('a-text');
                label.setAttribute('value', item.label);
                label.setAttribute('align', 'center');
                label.setAttribute('position', '0 -0.11 0.06');
                label.setAttribute('width', '1.4');
                label.setAttribute('color', '#dfe6e9');
                btnGroup.appendChild(label);

                menu.appendChild(btnGroup);
            });

            cam.appendChild(menu);
            console.log('🛍️ HUD Upgrade Complete: Custom Models');
            return menu;
        }

        let lastSpawnTime = 0;

        function spawnObject(type, color, model, customScale) {
            const now = Date.now();
            if (now - lastSpawnTime < 500) {
                console.warn('⚠️ Spawn rate limited');
                return;
            }
            lastSpawnTime = now;

            // Get camera position and direction
            const cam = document.getElementById('cam');
            const camPos = new THREE.Vector3();
            const camDir = new THREE.Vector3();

            cam.object3D.getWorldPosition(camPos);
            cam.object3D.getWorldDirection(camDir);

            // Spawn 1.5m in front of camera
            // getWorldDirection retourne la direction vers laquelle on regarde (axe -Z)
            // On utilise cette direction directement, mais on inverse si nécessaire
            const spawnPos = camPos.clone().add(camDir.multiplyScalar(-1.5)); // Négatif car cam regarde vers -Z
            spawnPos.y = Math.max(spawnPos.y, 0.1); // Au moins 10cm du sol

            console.log('✨ SPAWNING at:', spawnPos);

            // Create entity based on type
            let entity;
            switch (type) {
                case 'sphere':
                    entity = document.createElement('a-sphere');
                    entity.setAttribute('radius', '0.08');
                    break;
                case 'cylinder':
                    entity = document.createElement('a-cylinder');
                    entity.setAttribute('radius', '0.06');
                    entity.setAttribute('height', '0.15');
                    break;
                case 'gltf':
                    entity = document.createElement('a-entity');
                    entity.setAttribute('gltf-model', `url(${model})`);
                    // Utiliser le scale personnalisé ou un défaut de 0.1
                    entity.setAttribute('scale', customScale || '0.1 0.1 0.1');
                    break;
                case 'tetrahedron':
                    entity = document.createElement('a-tetrahedron');
                    entity.setAttribute('radius', '0.1');
                    break;
                default: // box
                    entity = document.createElement('a-box');
                    entity.setAttribute('width', '0.12');
                    entity.setAttribute('height', '0.12');
                    entity.setAttribute('depth', '0.12');
            }

            entity.setAttribute('position', `${spawnPos.x} ${spawnPos.y} ${spawnPos.z}`);
            entity.setAttribute('color', color);
            entity.setAttribute('dynamic-body', 'mass:0.5;linearDamping:0.3;angularDamping:0.3');
            entity.setAttribute('class', 'clickable grabbable');
            entity.setAttribute('grabbable', ''); // Add grabbable component
            entity.id = `spawned-${now}`;

            // Si c'est une poubelle, l'ajouter à la liste des trashcans
            if (model && model.includes('Trashcan')) {
                entity.classList.add('trashcan');
                trashcans.push(entity);
            }

            sceneEl.appendChild(entity);
            
            // Add to GameManager
            if (window.GameManager) {
                window.GameManager.addSpawnedObject(entity);
            }

            const debugEl = document.getElementById('debug');
            if (debugEl) debugEl.textContent = `Spawné: ${type}`;
            console.log(`📦 Spawned ${type} at`, spawnPos);
        }

        // --- START BUTTON HANDLER (Landing Page → Loader → AR) ---
    if (!startBtn) {
        console.error('❌ Start button not found!');
        if (debugEl) debugEl.textContent = 'BTN INTROUVABLE!';
        return;
    }
    
    console.log('✅ Start button found, attaching event listener');
    if (debugEl) debugEl.textContent = 'Prêt! Cliquez PLAY NOW';
    
    startBtn.onclick = async () => {
        console.log('☕ Start button clicked!');
        if (debugEl) debugEl.textContent = '🎮 BOUTON CLIQUÉ!';
            // 1. Hide landing page
            if (landingPage) {
                landingPage.style.display = 'none';
            }

            // 2. Show loader
            if (gameContainer) {
                gameContainer.classList.remove('hidden');
                gameContainer.classList.add('visible');
            }

            // 3. After loader delay, launch AR
            setTimeout(async () => {
                // Hide loader, show scene
                if (gameContainer) {
                    gameContainer.classList.remove('visible');
                    gameContainer.classList.add('hidden');
                }
                if (sceneEl) {
                    sceneEl.style.display = 'block';
                }

                if (debugEl) debugEl.textContent = '🎯 Démarrage session AR...';
                console.log('🔍 About to request XR session. xrSession before=', xrSession);

                try {
                    console.log('🔍 Requesting immersive-ar session...');
                    xrSession = await navigator.xr.requestSession('immersive-ar', {
                        requiredFeatures: ['local-floor'],
                        optionalFeatures: ['hit-test', 'dom-overlay', 'plane-detection', 'hand-tracking'],
                        domOverlay: { root: document.getElementById('overlay') }
                    });

                    sceneEl.renderer.xr.setSession(xrSession);

                    // AR Debug Panel
                    setTimeout(() => {
                        createARDebugPanel();
                        updateARDebug('AR Ready! Waiting for coffee...');
                    }, 1500);

                // Controllers are now managed by A-Frame entities (see index.html)
                // No manual Three.js controller setup needed
                console.log('✅ Controllers managed by A-Frame entities');

                // CREATE WELCOME PANEL FIRST
                createWelcomePanel();

                // CREATE HUD MENU (but hidden)
                createHUDInventory();

                if (debugEl) debugEl.textContent = 'AR OK! Read the instructions';

                // Setup hit-test après délai
                setTimeout(async () => {
                    try {
                        xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
                        const viewer = await xrSession.requestReferenceSpace('viewer');
                        hitTestSource = await xrSession.requestHitTestSource({ space: viewer });
                        if (debugEl) debugEl.textContent = 'Hit-test OK!';
                    } catch (e) {
                        if (debugEl) debugEl.textContent = 'Pas de hit-test';
                    }

                    // Démarrer boucle XR
                    xrSession.requestAnimationFrame(xrLoop);
                }, 500);

            } catch (e) {
                console.error('❌ ERREUR XR COMPLÈTE:', e);
                console.error('❌ Stack trace:', e.stack);
                if (debugEl) {
                    debugEl.textContent = '❌ ERR: ' + e.message;
                    debugEl.style.fontSize = '20px';
                    debugEl.style.color = '#ff0000';
                }
                alert('Erreur XR: ' + e.message + '. Voir overlay.');
                
                // Show scene anyway on error for debugging
                if (sceneEl) sceneEl.style.display = 'block';
            }
            }, 2500); // Loader delay (2.5 seconds)
        };

        function xrLoop(time, frame) {
            if (!xrSession) return;
            xrSession.requestAnimationFrame(xrLoop);

            if (!frame || !xrRefSpace) {
                xrRefSpace = sceneEl.renderer.xr.getReferenceSpace();
                return;
            }

            if (hitTestSource) {
                try {
                    const hits = frame.getHitTestResults(hitTestSource);
                    if (hits.length > 0) {
                        const pose = hits[0].getPose(xrRefSpace);
                        if (pose) {
                            const p = pose.transform.position;
                            const r = pose.transform.orientation;

                            cursorEl.object3D.visible = true;
                            cursorEl.object3D.position.set(p.x, p.y, p.z);

                            // ORIENTATION FIX:
                            if (r) {
                                const poseRot = new THREE.Quaternion(r.x, r.y, r.z, r.w);
                                const offset = new THREE.Quaternion();
                                offset.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); // -90 deg X
                                poseRot.multiply(offset);
                                cursorEl.object3D.quaternion.copy(poseRot);
                            } else {
                                // Fallback if no rotation data: Flat on floor
                                cursorEl.object3D.rotation.set(-Math.PI / 2, 0, 0);
                            }

                            addSurface(p.x, p.y, p.z);
                        }
                    } else {
                        cursorEl.object3D.visible = false;
                    }
                } catch (e) {
                    console.error("Hit test error:", e);
                }
            }

            // --- TRASHCAN COLLISION CHECK ---
            checkTrashcanCollisions();

            // --- COFFEE DELIVERY CHECK - now handled by customer-manager component ---
            // checkCoffeeIntersection(); // REMOVED - uses component system

            // --- MANUEL RAYCASTER & DIAGNOSTICS ---

            const ses = sceneEl.renderer.xr.getSession();

            // 2. Diagnostics Panel Loop
            if (ses) {
                let isAnyBtnPressed = false;

                // Checking Input Sources
                for (const source of ses.inputSources) {
                    if (!source.gamepad) continue;

                    // Joystick rotation is now handled in xr-grab.js component

                    // LEFT CONTROLLER - Menu Toggle (Button 4/5 usually X/Y)
                    if (source.handedness === 'left' && source.gamepad) {
                        // Button 5 is usually 'Y' on Quest
                        const yBtn = source.gamepad.buttons[5] || source.gamepad.buttons[4] || source.gamepad.buttons[3];

                        if (yBtn && yBtn.pressed) {
                            if (!menuToggleLock) {
                                menuToggleLock = true;
                                if (inventoryEntity) {
                                    const vis = inventoryEntity.getAttribute('visible');
                                    inventoryEntity.setAttribute('visible', !vis);
                                    console.log('Toggle Menu:', !vis);
                                }
                            }
                        } else {
                            if (menuToggleLock) menuToggleLock = false;
                        }
                    }

                    // RIGHT CONTROLLER - Button B = Coffee Machine Interaction
                    if (source.handedness === 'right' && source.gamepad) {
                        // Button 5 is usually 'B' on Quest
                        const bBtn = source.gamepad.buttons[5];

                        if (bBtn && bBtn.pressed && !coffeeMachineLock) {
                            // Raycast from right controller to detect coffee machine
                            const rightCtrl = window.rightController;
                            if (rightCtrl) {
                                const tempMatrix = new THREE.Matrix4();
                                tempMatrix.identity().extractRotation(rightCtrl.matrixWorld);

                                const raycaster = new THREE.Raycaster();
                                raycaster.ray.origin.setFromMatrixPosition(rightCtrl.matrixWorld);
                                raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                                raycaster.far = 5.0; // 5 mètres de portée

                                // Find all coffee machines in spawnedObjects
                                const coffeeMachines = [];
                                spawnedObjects.forEach(obj => {
                                    if (obj && obj.object3D) {
                                        // Check if it's a coffee machine (by gltf-model attribute)
                                        const model = obj.getAttribute('gltf-model');
                                        if (model && model.includes('CoffeeMachine')) {
                                            obj.object3D.traverse(child => {
                                                if (child.isMesh) {
                                                    child.el = obj; // Reference to A-Frame entity
                                                    coffeeMachines.push(child);
                                                }
                                            });
                                        }
                                    }
                                });

                                const intersects = raycaster.intersectObjects(coffeeMachines);

                                if (intersects.length > 0) {
                                    const hitEntity = intersects[0].object.el;
                                    if (hitEntity) {
                                        // Emit event for coffee-machine component to handle
                                        hitEntity.emit('machine-activated');
                                        if (debugEl) debugEl.textContent = '☕ Brewing...';
                                    }
                                }
                            }
                        }
                    }

                    // CHECK FOR ANY CLICK (For both hands)
                    if (source.gamepad) {
                        // Usually Trigger is button 0
                        if (source.gamepad.buttons[0] && source.gamepad.buttons[0].pressed) {
                            isAnyBtnPressed = true;
                        }
                    }
                }

                window.isAnyBtnPressed = isAnyBtnPressed;
                if (!isAnyBtnPressed) {
                    window.uiClickLock = false; // Reset lock when release
                }
            }

            // 3. Interaction Logic (Unified for Both Controllers)

            const handleControllerInteraction = (controller) => {
                if (!controller) return;

                const isMenuVisible = inventoryEntity && inventoryEntity.getAttribute('visible');
                const isWelcomeVisible = welcomePanel !== null;

                let line = controller.getObjectByName('laser-line');
                let cursor = controller.getObjectByName('laser-cursor');

                // Hide laser if neither menu nor welcome panel is visible
                if (!isMenuVisible && !isWelcomeVisible) {
                    if (line) line.visible = false;
                    if (cursor) cursor.visible = false;
                    return;
                }

                if (!line) {
                    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
                    const lineMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
                    line = new THREE.Line(lineGeom, lineMat);
                    line.name = 'laser-line';
                    controller.add(line);
                }

                if (!cursor) {
                    const cursorGeom = new THREE.RingGeometry(0.02, 0.04, 32);
                    const cursorMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
                    cursor = new THREE.Mesh(cursorGeom, cursorMat);
                    cursor.name = 'laser-cursor';
                    controller.add(cursor);
                }

                line.visible = true;
                cursor.visible = false; // Hidden unless hit

                // RAYCAST
                const tempMatrix = new THREE.Matrix4();
                tempMatrix.identity().extractRotation(controller.matrixWorld);

                const raycaster = new THREE.Raycaster();
                raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                raycaster.far = 3.0;

                const buttons = [];

                // Search in inventory menu
                if (inventoryEntity && inventoryEntity.object3D) {
                    inventoryEntity.object3D.traverse(child => {
                        if (child.el && child.el.classList.contains('clickable') && child.isMesh) {
                            buttons.push(child);
                        }
                    });
                }

                // Search in welcome panel
                if (welcomePanel && welcomePanel.object3D) {
                    welcomePanel.object3D.traverse(child => {
                        if (child.el && child.el.classList.contains('clickable') && child.isMesh) {
                            buttons.push(child);
                        }
                    });
                }

                const intersects = raycaster.intersectObjects(buttons);

                // Clear Hovers (Global clear might flicker if both point, but acceptable for now)
                // Better: clear hover only if NOT hovered by other controller? 
                // Simple version: clear always, re-apply if intersection.

                // Note: Clearing globally in a loop inside a per-controller function is slightly buggy if both controllers point.
                // But typically only one points at a time.

                if (intersects.length > 0) {
                    const hit = intersects[0];
                    const el = hit.object.el;
                    const dist = hit.distance;

                    // Update Laser
                    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -dist)];
                    line.geometry.setFromPoints(points);
                    line.geometry.attributes.position.needsUpdate = true;

                    cursor.visible = true;
                    cursor.position.set(0, 0, -dist);

                    // Hover
                    el.setAttribute('scale', '1.1 1.1 1.1');
                    el.setAttribute('color', '#636e72');

                    // CLICK?
                    // We check if THIS controller's trigger is pressed. 
                    // However, we only have global 'isAnyBtnPressed' from the loop above.
                    // Ideally we check specific controller state here.
                    // But for now, using global isAnyBtnPressed is acceptable as requested "cliquer".

                    if (window.isAnyBtnPressed && !window.uiClickLock) {
                        window.uiClickLock = true;

                        // Check if it's the welcome panel close button
                        if (el.id === 'welcome-close-btn') {
                            console.log('📜 Closing Welcome Panel');
                            // Close welcome panel inline
                            if (welcomePanel && welcomePanel.parentNode) {
                                welcomePanel.parentNode.removeChild(welcomePanel);
                                welcomePanel = null;
                                if (debugEl) debugEl.textContent = '🟢 Ready to serve!';
                                // Customer manager will handle spawning
                            }
                        }
                        // Otherwise it's a spawn button
                        else if (el.dataset.spawnType) {
                            console.log('SPAWN COMMAND (Left/Right) for', el.dataset.spawnType);
                            el.setAttribute('color', '#00cec9');
                            spawnObject(el.dataset.spawnType, el.dataset.spawnColor, el.dataset.spawnModel, el.dataset.spawnScale);
                        }
                    }

                } else {
                    // Reset Laser
                    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2)];
                    line.geometry.setFromPoints(points);
                    line.geometry.attributes.position.needsUpdate = true;
                }
            };

            // Execute for both
            handleControllerInteraction(window.rightController);
            handleControllerInteraction(window.leftController);

            // Object grabbing is now handled by xr-grab.js component
            // No manual position update needed here
        }

        // Grabbing is now fully handled by xr-grab.js and hand-grab.js components

        // Listen to plane detection to avoid manual surface creation
        sceneEl.addEventListener('plane-detection-active', () => {
            planeDetectionActive = true;
            console.log('✅ Plane detection active - disabling manual surfaces');
        });

        function addSurface(x, y, z) {
            // Skip if plane-detection is handling surfaces
            if (planeDetectionActive) return;
            
            // Original manual surface creation (fallback only)
            const box = document.createElement('a-box');
            box.setAttribute('position', `${x} ${y} ${z}`);
            box.setAttribute('width', '0.2');
            box.setAttribute('height', '0.01');
            box.setAttribute('depth', '0.2');
            box.setAttribute('visible', 'false');
            box.setAttribute('static-body', '');
            sceneEl.appendChild(box);

            surfaces.push({ x, y, z });
            if (surfacesEl) surfacesEl.textContent = 'Surfaces: ' + surfaces.length;

            if (surfaces.length > 200) surfaces.shift();
        }

        // --- CUSTOMER & DELIVERY LOGIC NOW IN customer-manager.js COMPONENT ---

        // --- AR NOTIFICATION SYSTEM ---
        function showARNotification(message, duration = 2000) {
            const cam = document.getElementById('cam');
            if (!cam) return;

            // Conteneur pour notification avec fond
            const notifContainer = document.createElement('a-entity');
            notifContainer.setAttribute('position', '0 0.3 -1');
            
            // Fond noir
            const bg = document.createElement('a-plane');
            bg.setAttribute('width', '1.2');
            bg.setAttribute('height', '0.25');
            bg.setAttribute('color', '#000000');
            bg.setAttribute('opacity', '0.8');
            notifContainer.appendChild(bg);

            // Texte de notification
            const notification = document.createElement('a-text');
            notification.setAttribute('value', message);
            notification.setAttribute('align', 'center');
            notification.setAttribute('position', '0 0 0.01');
            notification.setAttribute('width', '2.5');
            notification.setAttribute('color', '#00ff00');
            notification.setAttribute('opacity', '1');
            notifContainer.appendChild(notification);

            cam.appendChild(notifContainer);

            // Animation: fade out puis remove
            setTimeout(() => {
                let opacity = 1;
                const fadeInterval = setInterval(() => {
                    opacity -= 0.05;
                    if (opacity <= 0) {
                        clearInterval(fadeInterval);
                        if (notifContainer.parentNode) {
                            notifContainer.parentNode.removeChild(notifContainer);
                        }
                    } else {
                        bg.setAttribute('opacity', (opacity * 0.8).toString());
                        notification.setAttribute('opacity', opacity.toString());
                    }
                }, 50);
            }, duration);
        }

        // All customer management now handled by customer-manager.js component
});
