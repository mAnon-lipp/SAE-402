/* global AFRAME, THREE */

/**
 * Component: cleaning-system
 * Description: Manages floor stains and broom cleaning interaction
 */
AFRAME.registerComponent('cleaning-system', {
    schema: {
        checkInterval: { type: 'number', default: 200 }, // Increased from 50ms
        cleaningRadius: { type: 'number', default: 0.4 },
        initialStains: { type: 'number', default: 5 }
    },

    init: function () {
        this.stains = [];
        this.lastCheckTime = 0;

        // Bind methods
        this.checkCleaning = this.checkCleaning.bind(this);
        this.spawnStain = this.spawnStain.bind(this);

        // Spawn initial stains
        setTimeout(() => {
            for (let i = 0; i < this.data.initialStains; i++) {
                this.spawnStain();
            }
        }, 2000);

        console.log('🧹 Cleaning System initialized');
    },

    tick: function (time) {
        // Throttle checking to avoid performance issues
        if (time - this.lastCheckTime < this.data.checkInterval) return;
        this.lastCheckTime = time;

        this.checkCleaning();
    },

    spawnStain: function () {
        const x = (Math.random() - 0.5) * 4;
        const z = (Math.random() - 0.5) * 4 - 1.5;
        const y = 0.01;

        const stain = document.createElement('a-circle');
        stain.setAttribute('radius', 0.2 + Math.random() * 0.2);
        stain.setAttribute('rotation', '-90 0 0');
        stain.setAttribute('position', `${x} ${y} ${z}`);
        stain.setAttribute('color', '#5d4037');
        stain.setAttribute('opacity', '0.9');
        stain.setAttribute('material', 'shader: flat; transparent: true');
        stain.classList.add('stain');

        this.el.sceneEl.appendChild(stain);
        this.stains.push({ el: stain, health: 100 });

        console.log('🧹 Dirt spot spawned at', x, z);
    },

    checkCleaning: function () {
        // Find all brooms being held
        const allGrabs = document.querySelectorAll('[xr-grab]');
        let broomEl = null;

        allGrabs.forEach(grabber => {
            const comp = grabber.components['xr-grab'];
            if (comp && comp.grabbedEl) {
                const model = comp.grabbedEl.getAttribute('gltf-model');
                if (model && model.includes('Broom')) {
                    broomEl = comp.grabbedEl;
                }
            }
        });

        if (!broomEl) return;

        const broomPos = new THREE.Vector3();
        broomEl.object3D.getWorldPosition(broomPos);

        // Check each stain
        this.stains.forEach((stainObj, index) => {
            if (!stainObj.el || !stainObj.el.parentNode) return;

            const stainPos = stainObj.el.object3D.position;
            const dist = new THREE.Vector2(broomPos.x, broomPos.z).distanceTo(
                new THREE.Vector2(stainPos.x, stainPos.z)
            );
            const verticalDist = Math.abs(broomPos.y - stainPos.y);

            if (dist < this.data.cleaningRadius && verticalDist < 0.5) {
                stainObj.health -= 5;
                stainObj.el.setAttribute('opacity', stainObj.health / 100);

                if (stainObj.health <= 0) {
                    if (stainObj.el.parentNode) {
                        stainObj.el.parentNode.removeChild(stainObj.el);
                    }
                    this.stains.splice(index, 1);
                    console.log('🧹 Stain cleaned!');
                    this.el.emit('stain-cleaned');

                    // Spawn new one occasionally
                    if (Math.random() > 0.5) {
                        setTimeout(this.spawnStain, 1000);
                    }
                }
            }
        });
    }
});
