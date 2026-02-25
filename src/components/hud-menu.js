import "aframe";
import * as THREE from "three";

AFRAME.registerComponent("hud-menu", {
  init: function () {
    // Sécurité anti-clic au spawn du menu
    this.canClick = false;
    setTimeout(() => {
      this.canClick = true;
    }, 500); // 500ms de sécurité

    // 1. Positionnement devant la caméra
    this.el.setAttribute("position", "0 -0.15 -0.8");
    this.el.setAttribute("rotation", "-15 0 0");
    this.el.setAttribute("scale", "0.55 0.55 0.55");

    // --- FOND DU PANNEAU (Optimisé AR) ---
    // SÉCURITÉ MAXIMALE : shader flat + depthTest false + side double
    const bg = document.createElement("a-plane");
    bg.setAttribute("width", "1.8");
    bg.setAttribute("height", "1.6");
    bg.setAttribute("material", "color: #111; shader: flat; opacity: 0.8; depthTest: false; side: double");
    this.el.appendChild(bg);

    const title = document.createElement("a-text");
    title.setAttribute("value", "VR STORE");
    title.setAttribute("align", "center");
    title.setAttribute("position", "0 0.65 0.02");
    title.setAttribute("width", "4");
    title.setAttribute("color", "#00cec9");
    title.setAttribute("material", "shader: flat; depthTest: false");
    this.el.appendChild(title);

    // --- TOUS LES MODÈLES DE BASE (Branche Depart) ---
    const items = [
      { type: "gltf", label: "COFFEE", model: "models/CoffeeMachine.glb", spawnScale: "0.4 0.4 0.4", menuScale: "0.15 0.15 0.15" },
      { type: "gltf", label: "TRASH", model: "models/TrashcanSmall.glb", spawnScale: "0.8 0.8 0.8", menuScale: "0.15 0.15 0.15" },
      { type: "gltf", label: "BROOM", model: "models/Broom.glb", spawnScale: "0.004 0.004 0.004", menuScale: "0.0008 0.0008 0.0008" },
      { type: "gltf", label: "SPEAKER", model: "models/BassSpeakers.glb", spawnScale: "0.8 0.8 0.8", menuScale: "0.1 0.1 0.1" },
      { type: "gltf", label: "REGISTER", model: "models/Cashregister.glb", spawnScale: "0.04 0.04 0.04", menuScale: "0.005 0.005 0.005" },
      { type: "gltf", label: "SIGN", model: "models/Coffeesign.glb", spawnScale: "0.2 0.2 0.2", menuScale: "0.04 0.04 0.04" },
      { type: "gltf", label: "COUCH", model: "models/Couch.glb", spawnScale: "0.3 0.3 0.3", menuScale: "0.06 0.06 0.06" },
      { type: "gltf", label: "PLANT", model: "models/Houseplant.glb", spawnScale: "0.4 0.4 0.4", menuScale: "0.08 0.08 0.08" },
      { type: "gltf", label: "RUG", model: "models/Rug.glb", spawnScale: "0.4 0.4 0.4", menuScale: "0.04 0.04 0.04" },
      { type: "box", label: "CUBE", color: "#ff7675" }
    ];

    const gap = 0.42;
    const itemsPerRow = 4;
    const startX = -((itemsPerRow - 1) * gap) / 2;

    items.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const x = startX + col * gap;
      const y = 0.25 - row * 0.45;

      const btnGroup = document.createElement("a-entity");
      btnGroup.setAttribute("position", `${x} ${y} 0.05`);

      // LE BOUTON (Carte)
      const btn = document.createElement("a-box");
      btn.setAttribute("width", "0.32");
      btn.setAttribute("height", "0.38");
      btn.setAttribute("depth", "0.02");
      btn.setAttribute("material", "color: #2d3436; shader: flat; depthTest: false; opacity: 0.9; side: double");
      btn.classList.add("clickable");

      // Prévenir le double spawn au clic
      btn.addEventListener("click", (evt) => {
        if (!this.canClick) return; // BLOQUE LE SPAWN ACCIDENTEL
        evt.stopPropagation();
        this.spawnObject(item);

        // Petit effet de retour visuel
        btn.setAttribute("material", "color: #00cec9; shader: flat; depthTest: false");
        setTimeout(() => btn.setAttribute("material", "color: #2d3436; shader: flat; depthTest: false"), 150);
      });

      btnGroup.appendChild(btn);

      // ICÔNE (Aperçu 3D)
      let icon;
      if (item.type === "gltf") {
        icon = document.createElement("a-entity");
        icon.setAttribute("gltf-model", `url(${item.model})`);
        icon.setAttribute("scale", item.menuScale || "0.05 0.05 0.05");
      } else {
        icon = document.createElement("a-box");
        icon.setAttribute("scale", "0.08 0.08 0.08");
        icon.setAttribute("material", `color: ${item.color}; shader: flat; depthTest: false`);
      }
      icon.setAttribute("position", "0 0.05 0.03");
      icon.setAttribute("rotation", "15 25 0");
      btnGroup.appendChild(icon);

      // LABEL
      const label = document.createElement("a-text");
      label.setAttribute("value", item.label);
      label.setAttribute("align", "center");
      label.setAttribute("position", "0 -0.12 0.03");
      label.setAttribute("width", "1.6");
      label.setAttribute("material", "shader: flat; depthTest: false");
      btnGroup.appendChild(label);

      this.el.appendChild(btnGroup);
    });
  },

  spawnObject: function (item) {
    const scene = document.querySelector("a-scene");
    const entity = document.createElement("a-entity");

    if (item.type === "gltf") {
      entity.setAttribute("gltf-model", `url(${item.model})`);
      entity.setAttribute("scale", item.spawnScale || "1 1 1");
      
      // Liaison des scripts de gameplay
      if (item.model.includes("CoffeeMachine")) entity.setAttribute("coffee-machine", "");
      if (item.model.includes("Trashcan")) entity.setAttribute("trashcan", "");
      if (item.model.includes("Broom")) entity.setAttribute("broom-cleaner", "");
    } else {
      entity.setAttribute("geometry", "primitive: box; width: 0.15; height: 0.15; depth: 0.15");
      entity.setAttribute("material", `color: ${item.color}`);
    }

    // Position : 1.2m devant la caméra au moment du spawn
    const cam = document.getElementById("cam");
    const pos = new THREE.Vector3();
    const dir = new THREE.Vector3();
    cam.object3D.getWorldPosition(pos);
    cam.object3D.getWorldDirection(dir);
    
    // On avance dans la direction où regarde l'utilisateur
    pos.add(dir.multiplyScalar(-1.2)); 
    pos.y = Math.max(pos.y, 0.2); // S'assurer que ça ne spawn pas dans le sol

    entity.setAttribute("position", `${pos.x} ${pos.y} ${pos.z}`);
    entity.setAttribute("dynamic-body", "mass: 0.5; linearDamping: 0.2; angularDamping: 0.2");
    entity.classList.add("clickable", "grabbable");

    scene.appendChild(entity);
    console.log(`📦 SPAWN : ${item.label} à la position`, pos);
    
    // Notifier le Game Manager (pour la suppression via poubelle)
    const system = scene.systems["game-manager"];
    if (system) {
      scene.emit("object-spawned", { object: entity });
    }
  }
});