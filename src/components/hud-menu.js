import "aframe";
import * as THREE from "three";

AFRAME.registerComponent("hud-menu", {
  init: function () {
    this.el.setAttribute("visible", "false"); // Caché par défaut

    // --- CRÉATION DE L'UI ---
    const bg = document.createElement("a-plane");
    bg.setAttribute("width", "1.6");
    bg.setAttribute("height", "1.4");
    bg.setAttribute("color", "#000000");
    bg.setAttribute("opacity", "0.6");
    bg.setAttribute("shader", "flat");
    bg.setAttribute("position", "0 -0.05 -0.01");
    this.el.appendChild(bg);

    const title = document.createElement("a-text");
    title.setAttribute("value", "VR STORE");
    title.setAttribute("align", "center");
    title.setAttribute("position", "0 0.55 0.03");
    title.setAttribute("width", "4");
    title.setAttribute("color", "#ffffff");
    title.setAttribute("letter-spacing", "2");
    this.el.appendChild(title);

    const line = document.createElement("a-plane");
    line.setAttribute("width", "1.0");
    line.setAttribute("height", "0.003");
    line.setAttribute("color", "#00cec9");
    line.setAttribute("position", "0 0.48 0.03");
    this.el.appendChild(line);

    // --- TES OBJETS ---
    const items = [
      { type: "box", color: "#ff7675", label: "CUBE" },
      {
        type: "gltf",
        model: "models/CoffeeMachine.glb",
        color: "#fab1a0",
        label: "COFFEE",
        menuScale: "0.2 0.2 0.2",
        spawnScale: "0.4 0.4 0.4",
      },
      {
        type: "gltf",
        model: "models/TrashcanSmall.glb",
        color: "#a29bfe",
        label: "POUBELLE",
        menuScale: "0.2 0.2 0.2",
        spawnScale: "0.8 0.8 0.8",
      },
      {
        type: "gltf",
        label: "SPEAKER",
        model: "models/BassSpeakers.glb",
        color: "#fff",
        menuScale: "0.1 0.1 0.1",
        spawnScale: "0.8 0.8 0.8",
      },
      {
        type: "gltf",
        label: "BROOM",
        model: "models/Broom.glb",
        color: "#fff",
        menuScale: "0.001 0.001 0.001",
        spawnScale: "0.004 0.004 0.004",
      },
      {
        type: "gltf",
        label: "REGISTER",
        model: "models/Cashregister.glb",
        color: "#fff",
        menuScale: "0.005 0.005 0.005",
        spawnScale: "0.04 0.04 0.04",
      },
      {
        type: "gltf",
        label: "SIGN",
        model: "models/Coffeesign.glb",
        color: "#fff",
        menuScale: "0.04 0.04 0.04",
        spawnScale: "0.2 0.2 0.2",
      },
      {
        type: "gltf",
        label: "COUCH",
        model: "models/Couch.glb",
        color: "#fff",
        menuScale: "0.08 0.08 0.08",
        spawnScale: "0.3 0.3 0.3",
      },
      {
        type: "gltf",
        label: "PLANT",
        model: "models/Houseplant.glb",
        color: "#fff",
        menuScale: "0.1 0.1 0.1",
        spawnScale: "0.4 0.4 0.4",
      },
      {
        type: "gltf",
        label: "RUG",
        model: "models/Rug.glb",
        color: "#fff",
        menuScale: "0.05 0.05 0.05",
        spawnScale: "0.4 0.4 0.4",
      },
    ];

    const gap = 0.35;
    const itemsPerRow = 4;
    const startX = -((itemsPerRow - 1) * gap) / 2;

    items.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const x = startX + col * gap;
      const y = 0.25 - row * 0.4;

      const btnGroup = document.createElement("a-entity");
      btnGroup.setAttribute("position", `${x} ${y} 0.05`);

      // Le bouton cliquable
      const btn = document.createElement("a-box");
      btn.setAttribute("width", "0.28");
      btn.setAttribute("height", "0.32");
      btn.setAttribute("depth", "0.02");
      btn.setAttribute("color", "#2d3436");
      btn.setAttribute("opacity", "0.9");
      btn.setAttribute("class", "clickable"); // IMPORTANT POUR LE RAYCASTER

      // Sauvegarde des données pour le clic
      btn.itemData = item;

      // Effets visuels de survol
      btn.addEventListener("mouseenter", () => {
        btn.setAttribute("color", "#636e72");
        btn.setAttribute("scale", "1.1 1.1 1.1");
      });
      btn.addEventListener("mouseleave", () => {
        btn.setAttribute("color", "#2d3436");
        btn.setAttribute("scale", "1 1 1");
      });

      // Événement de clic pour Spawner
      btn.addEventListener("click", () => {
        this.spawnObject(item);
        // Effet visuel au clic
        btn.setAttribute("color", "#00cec9");
        setTimeout(() => btn.setAttribute("color", "#636e72"), 200);
      });

      btnGroup.appendChild(btn);

      // Icône 3D
      let icon;
      if (item.type === "gltf") {
        icon = document.createElement("a-entity");
        icon.setAttribute("gltf-model", `url(${item.model})`);
        icon.setAttribute("scale", item.menuScale || "0.08 0.08 0.08");
      } else {
        icon = document.createElement(`a-${item.type}`);
        icon.setAttribute("scale", "0.06 0.06 0.06");
        icon.setAttribute("color", item.color);
      }
      icon.setAttribute("position", "0 0.04 0.06");
      icon.setAttribute("rotation", "25 25 0");
      btnGroup.appendChild(icon);

      // Label
      const label = document.createElement("a-text");
      label.setAttribute("value", item.label);
      label.setAttribute("align", "center");
      label.setAttribute("position", "0 -0.11 0.06");
      label.setAttribute("width", "1.4");
      label.setAttribute("color", "#dfe6e9");
      btnGroup.appendChild(label);

      this.el.appendChild(btnGroup);
    });
  },

  spawnObject: function (item) {
    const cam = document.getElementById("cam");
    if (!cam) return;

    // Calcul de la position (1.5m devant la caméra)
    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    cam.object3D.getWorldPosition(camPos);
    cam.object3D.getWorldDirection(camDir);

    const spawnPos = camPos.clone().add(camDir.multiplyScalar(-1.5));
    spawnPos.y = Math.max(spawnPos.y, 0.1); // Au moins 10cm du sol

    let entity;
    if (item.type === "gltf") {
      entity = document.createElement("a-entity");
      entity.setAttribute("gltf-model", `url(${item.model})`);
      entity.setAttribute("scale", item.spawnScale || "0.1 0.1 0.1");

      // Si c'est la machine à café, on lui attache son composant !
      if (item.model.includes("CoffeeMachine")) {
        entity.setAttribute("coffee-machine", "");
      }
      // Si c'est la poubelle, on lui attache son composant !
      else if (item.model.includes("Trashcan")) {
        entity.setAttribute("trashcan", "");
        entity.classList.add("trashcan");
      } else if (item.model.includes("Broom")) {
        entity.setAttribute("broom-cleaner", "");
      }
    } else {
      entity = document.createElement(`a-${item.type}`);
      entity.setAttribute("width", "0.12");
      entity.setAttribute("height", "0.12");
      entity.setAttribute("depth", "0.12");
      entity.setAttribute("color", item.color);
    }

    entity.setAttribute(
      "position",
      `${spawnPos.x} ${spawnPos.y} ${spawnPos.z}`,
    );
    entity.setAttribute(
      "dynamic-body",
      "mass:0.5;linearDamping:0.3;angularDamping:0.3",
    );
    entity.setAttribute("class", "clickable grabbable");

    this.el.sceneEl.appendChild(entity);

    // Ajouter à la liste du Game Manager pour que la poubelle puisse le supprimer
    const system = this.el.sceneEl.systems["game-manager"];
    if (system) {
      system.el.emit("object-spawned", { object: entity });
    }

    console.log(`📦 Spawned ${item.label} at`, spawnPos);
  },
});
