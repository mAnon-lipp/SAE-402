/* global AFRAME, THREE */

/**
 * Component: coffee-machine
 * Description: Manages coffee machine interaction and cup spawning
 */
AFRAME.registerComponent('coffee-machine', {
    schema: {
        brewTime: { type: 'number', default: 3000 }
    },

    init: function () {
        this.isLocked = false;
        this.coffeeAudio = null;

        // Load audio
        this.coffeeAudio = new Audio('/sounds/public_assets_café.MP3');
        this.coffeeAudio.volume = 0.7;

        // Listen to interaction event
        this.el.addEventListener('machine-activated', this.brew.bind(this));

        console.log('☕ Coffee Machine component initialized');
    },

    brew: function () {
        if (this.isLocked) return;
        this.isLocked = true;

        console.log('☕ Brewing coffee...');
        this.el.emit('brew-started');

        // Play sound
        if (this.coffeeAudio) {
            this.coffeeAudio.currentTime = 0;
            this.coffeeAudio.play().catch(e => console.log('Audio error:', e));
        }

        // Spawn cup after brew time
        setTimeout(() => {
            this.spawnCoffeeCup();
            this.isLocked = false;
        }, this.data.brewTime);
    },

    spawnCoffeeCup: function () {
        if (!this.el.object3D) return;

        const machinePos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(machinePos);

        // Position to the right of machine
        const cupPos = {
            x: machinePos.x + 0.15,
            y: machinePos.y + 0.05,
            z: machinePos.z
        };

        const cup = document.createElement('a-entity');
        cup.setAttribute('gltf-model', 'url(models/Coffeecup.glb)');
        cup.setAttribute('scale', '0.15 0.15 0.15');
        cup.setAttribute('position', `${cupPos.x} ${cupPos.y} ${cupPos.z}`);
        cup.setAttribute('dynamic-body', 'mass:0.3;linearDamping:0.5;angularDamping:0.5');
        cup.setAttribute('class', 'clickable grabbable coffee-cup');
        cup.setAttribute('grabbable', '');
        cup.id = `coffee-cup-${Date.now()}`;

        // Add temperature component
        cup.setAttribute('coffee-temperature', 'temperature: 100; coolingRate: 5; gaugeHeight: 0.3');

        // Mark as coffee
        cup.dataset.isCoffee = 'true';
        cup.dataset.coffeeItem = 'true';

        this.el.sceneEl.appendChild(cup);

        // Add to game manager if available
        if (window.GameManager) {
            window.GameManager.addSpawnedObject(cup);
        }

        console.log('☕ Coffee cup created at:', cupPos);
        this.el.emit('cup-spawned', { cup: cup });
    }
});
