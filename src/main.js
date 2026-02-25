import "aframe";
import "aframe-extras";
import "aframe-physics-system";
import * as THREE from "three";

// Globals (État du jeu)
window.isInventoryOpen = false;
window.menuLock = false;
window.bButtonLock = false; // Verrouillage pour le bouton B (machine à café)
window.isAnyBtnPressed = false;
window.uiClickLock = false;
window._xrDebugOverlay = null;

// --- SYSTÈMES & COMPOSANTS ---
import "./systems/game-manager.js";
import "./systems/ar-notifier.js";
import "./components/ar-cursor.js";
import "./components/ar-plane-detection.js";
import "./components/welcome-panel.js";
import "./components/vr-controls.js";
import "./components/grab-system.js";
import "./components/hud-menu.js";
import "./components/coffee-machine.js";
import "./components/coffee-temperature.js";
import "./components/customer-spawner.js";
import "./components/customer.js";
import "./components/trashcan.js";
import "./components/stain-manager.js";
import "./components/broom-cleaner.js";

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-btn");
  const scene = document.querySelector("a-scene");

  if (!startBtn || !scene) return;

  startBtn.onclick = async () => {
    try {
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["dom-overlay", "plane-detection", "hand-tracking"],
        domOverlay: { root: document.body },
      });

      scene.renderer.xr.setSession(session);
      window.xrSession = session;

      document.getElementById("landing-page").style.display = "none";
      scene.play();

      // Pré-crée le HUD en tant qu'enfant de la caméra (cache par défaut)
      const cam = document.getElementById("cam");
      if (cam && !document.querySelector("[hud-menu]")) {
        const menuEl = document.createElement("a-entity");
        menuEl.id = "hud-inventory";
        menuEl.setAttribute("hud-menu", "");
        menuEl.setAttribute("visible", "false");
        menuEl.object3D.visible = false; // Double sécurité Three.js
        cam.appendChild(menuEl);
        console.log("📦 Inventaire créé (caché par défaut)");
      }

      initDebugOverlay();
      init3DOverlay();

      // --- DÉTECTION DES MANETTES ---
      const rig = document.getElementById("rig");
      const sceneEl = document.querySelector("a-scene");

      function setupController(index) {
        const c = sceneEl.renderer.xr.getController(index);
        c.addEventListener("connected", (e) => {
          if (!e.data) return;
          if (e.data.handedness === "left") {
            window.leftController = c;
            const el = document.getElementById("leftHand");
            if (el) el.setObject3D("controller", c);
            console.log("✅ Left Hand Connected");
          } else if (e.data.handedness === "right") {
            window.rightController = c;
            const el = document.getElementById("rightHand");
            if (el) el.setObject3D("controller", c);
            console.log("✅ Right Hand Connected");
          }
          if (rig && rig.object3D) rig.object3D.add(c);
        });
      }

      setupController(0);
      setupController(1);

      session.requestAnimationFrame(xrLoop);

      scene.setAttribute("game-manager", "");
      scene.setAttribute("stain-manager", "");

      setTimeout(() => {
        const cam = document.getElementById("cam");
        if (cam) cam.setAttribute("welcome-panel", "");
        const spawner = document.querySelector("[customer-spawner]");
        if (spawner) spawner.setAttribute("customer-spawner", "");
      }, 1000);
    } catch (err) {
      console.error("Erreur session XR:", err);
    }
  };
});

function handleControllerInteraction(controller) {
  if (!controller || !controller.matrixWorld) return;

  let line = controller.getObjectByName("laser-line");
  let cursor = controller.getObjectByName("laser-cursor");

  if (!line) {
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const isLeft = controller === window.leftController;
    const lineMat = new THREE.LineBasicMaterial({
      color: isLeft ? 0xff0000 : 0xffffff,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    line = new THREE.Line(lineGeom, lineMat);
    line.name = "laser-line";
    line.renderOrder = 9999;
    controller.add(line);
  }

  if (!cursor) {
    cursor = new THREE.Mesh(
      new THREE.RingGeometry(0.01, 0.02, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
    );
    cursor.name = "laser-cursor";
    controller.add(cursor);
  }

  const welcomeActive = document.getElementById("welcome-panel-entity");
  const hudMenu = document.getElementById("hud-inventory");

  // SÉCURITÉ : On affiche le laser si l'inventaire est ouvert OU si le welcome panel est actif
  const shouldShowLaser = window.isInventoryOpen || !!welcomeActive;
  line.visible = shouldShowLaser;
  cursor.visible = false;

  if (!line.visible) return;

  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const buttons = [];
  document.querySelector("a-scene").object3D.traverse((obj) => {
    if (obj.el && obj.el.classList && obj.el.classList.contains("clickable"))
      buttons.push(obj);
  });

  const intersects = raycaster.intersectObjects(buttons, true);
  if (intersects.length > 0) {
    const dist = intersects[0].distance;
    line.scale.z = dist;
    cursor.position.z = -dist;
    cursor.visible = true;

    if (window.isAnyBtnPressed && !window.uiClickLock) {
      window.uiClickLock = true;
      let target = intersects[0].object;
      while (target && !target.el) target = target.parent;
      if (target && target.el) target.el.emit("click");
    }
  } else {
    line.scale.z = 5;
  }
}

function xrLoop(time, frame) {
  const ses = window.xrSession;
  if (ses) {
    let anyTriggerPressed = false;

    for (const source of ses.inputSources) {
      if (!source.gamepad) continue;

      // État du Trigger (Bouton 0) pour le clic UI
      if (source.gamepad.buttons[0] && source.gamepad.buttons[0].pressed) {
        anyTriggerPressed = true;
      }

      // Gestion Inventaire (Boutons X/Y sur la main gauche)
      if (source.handedness === "left") {
        const buttons = source.gamepad.buttons;

        // Debug helper (décommenter pour voir dans la console)
        // console.log("Bouton 3:", buttons[3]?.pressed, "Bouton 4:", buttons[4]?.pressed, "Bouton 5:", buttons[5]?.pressed);

        const menuButtonPressed =
          (buttons[3] && buttons[3].pressed) ||
          (buttons[4] && buttons[4].pressed) ||
          (buttons[5] && buttons[5].pressed);

        if (menuButtonPressed && !window.menuLock) {
          window.menuLock = true;
          window.isInventoryOpen = !window.isInventoryOpen;

          // SOLUTION SIMPLE : Toggle la visibilité du menu existant
          const menuEl = document.getElementById("hud-inventory");
          if (menuEl) {
            if (window.isInventoryOpen) {
              menuEl.setAttribute("visible", "true");
              menuEl.object3D.visible = true;
              console.log("🎒 INVENTAIRE : OUVERT");
            } else {
              menuEl.setAttribute("visible", "false");
              menuEl.object3D.visible = false;
              console.log("🎒 INVENTAIRE : FERMÉ");
            }
          }
        } else if (!menuButtonPressed) {
          window.menuLock = false;
        }

        // BOUTON B (bouton 1) : Déclencher la machine à café
        const bButtonPressed = buttons[1] && buttons[1].pressed;
        if (bButtonPressed && !window.bButtonLock) {
          window.bButtonLock = true;
          
          // Chercher la machine à café proche du joueur
          const cam = document.getElementById("cam");
          if (cam) {
            const machines = document.querySelectorAll("[coffee-machine]");
            const camPos = new THREE.Vector3();
            cam.object3D.getWorldPosition(camPos);
            
            for (let machine of machines) {
              if (!machine.object3D) continue;
              const machinePos = new THREE.Vector3();
              machine.object3D.getWorldPosition(machinePos);
              
              // Si la machine est à moins de 1.5m, on l'active
              if (camPos.distanceTo(machinePos) < 1.5) {
                const comp = machine.components['coffee-machine'];
                if (comp && !comp.isBrewing) {
                  comp.onClick(); // Déclenche la préparation
                  console.log("☕ Bouton B : Machine à café activée");
                }
                break;
              }
            }
          }
        } else if (!bButtonPressed) {
          window.bButtonLock = false;
        }
      }
    }
    window.isAnyBtnPressed = anyTriggerPressed;
    if (!anyTriggerPressed) window.uiClickLock = false;
  }

  handleControllerInteraction(window.leftController);
  handleControllerInteraction(window.rightController);
  updateDebugOverlay();

  if (window.xrSession) window.xrSession.requestAnimationFrame(xrLoop);
}

// --- DEBUG HELPERS ---
function initDebugOverlay() {
  if (window._xrDebugOverlay) return;
  const el = document.createElement("div");
  el.id = "xr-debug-overlay";
  el.style =
    "position:fixed;right:12px;top:12px;padding:8px 10px;background:rgba(0,0,0,0.6);color:#fff;font-family:sans-serif;font-size:13px;border-radius:6px;z-index:9999;pointer-events:none;";
  el.innerText = "XR Debug";
  document.body.appendChild(el);
  window._xrDebugOverlay = el;
}

function updateDebugOverlay() {
  const el = window._xrDebugOverlay;
  if (!el) return;
  const l = window.leftController ? "OK" : "—";
  const r = window.rightController ? "OK" : "—";
  const trig = window.isAnyBtnPressed ? "CLIC" : "idle";
  const inv = window.isInventoryOpen ? "OPEN" : "OFF";
  el.innerText = `Left: ${l} | Right: ${r}\nAction: ${trig} | Inv: ${inv}`;

  const hudText = document.getElementById("xr-debug-hud-text");
  if (hudText)
    hudText.setAttribute("value", `L: ${l} R: ${r} T: ${trig} Inv: ${inv}`);
}

function init3DOverlay() {
  const cam = document.getElementById("cam");
  if (!cam || document.getElementById("xr-debug-hud")) return;

  const hud = document.createElement("a-entity");
  hud.id = "xr-debug-hud";
  hud.setAttribute("position", "0 -0.35 -0.6");

  const bg = document.createElement("a-plane");
  bg.setAttribute("width", "0.7");
  bg.setAttribute("height", "0.18");
  bg.setAttribute("color", "#000");
  bg.setAttribute("opacity", "0.6");
  hud.appendChild(bg);

  const txt = document.createElement("a-text");
  txt.id = "xr-debug-hud-text";
  txt.setAttribute("value", "Debug");
  txt.setAttribute("align", "left");
  txt.setAttribute("color", "#fff");
  txt.setAttribute("width", "1.6");
  txt.setAttribute("position", "-0.32 0.04 0.01");
  hud.appendChild(txt);

  cam.appendChild(hud);
}
