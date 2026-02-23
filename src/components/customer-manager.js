/* global AFRAME, THREE */

/**
 * Component: customer-manager
 * Description: Manages customer spawning, queue, and delivery system
 */
AFRAME.registerComponent('customer-manager', {
    schema: {
        maxQueue: { type: 'number', default: 4 },
        queueSpacing: { type: 'number', default: 0.8 },
        startDistance: { type: 'number', default: 1.2 },
        spawnInterval: { type: 'number', default: 3000 }
    },

    init: function () {
        this.customers = [];
        this.lastDeliveryTime = 0;
        
        // Bind methods
        this.spawnCustomer = this.spawnCustomer.bind(this);
        this.checkCoffeeDelivery = this.checkCoffeeDelivery.bind(this);
        this.advanceQueue = this.advanceQueue.bind(this);

        // Start spawning after 5 seconds
        setTimeout(() => {
            this.spawnCustomer();
        }, 5000);

        console.log('👥 Customer Manager initialized');
    },

    tick: function () {
        // Check for coffee delivery using physics collision detection
        this.checkCoffeeDelivery();
    },

    spawnCustomer: function () {
        if (this.customers.length >= this.data.maxQueue) {
            console.log('⚠️ Queue full!');
            return;
        }

        const cam = document.getElementById('cam');
        if (!cam || !cam.object3D) return;

        const camPos = new THREE.Vector3();
        cam.object3D.getWorldPosition(camPos);

        const positionInQueue = this.customers.length;
        const distanceFromCamera = this.data.startDistance + (positionInQueue * this.data.queueSpacing);

        const customerPos = new THREE.Vector3(
            camPos.x,
            0,
            camPos.z - distanceFromCamera
        );

        const customer = document.createElement('a-entity');
        customer.setAttribute('gltf-model', 'url(models/Punk.glb)');
        customer.setAttribute('position', `${customerPos.x} ${customerPos.y} ${customerPos.z}`);
        customer.setAttribute('scale', '0.85 0.85 0.85');

        const angleToCamera = Math.atan2(
            camPos.x - customerPos.x,
            camPos.z - customerPos.z
        ) * (180 / Math.PI);
        customer.setAttribute('rotation', `0 ${angleToCamera} 0`);

        customer.classList.add('customer');
        customer.id = `customer-${Date.now()}`;
        customer.dataset.needsCoffee = 'true';
        customer.dataset.queuePosition = positionInQueue.toString();

        // Speech bubble only for first customer
        if (positionInQueue === 0) {
            this.createSpeechBubble(customer);
        }

        this.el.sceneEl.appendChild(customer);
        this.customers.push(customer);

        console.log(`✅ Customer spawned at position ${positionInQueue}`);

        // Auto-spawn next customer
        if (this.customers.length < this.data.maxQueue) {
            setTimeout(this.spawnCustomer, this.data.spawnInterval);
        }
    },

    createSpeechBubble: function (customer) {
        const speechBubble = document.createElement('a-entity');
        speechBubble.setAttribute('position', '0 1.8 0');
        speechBubble.classList.add('speech-bubble');

        const bubbleBg = document.createElement('a-plane');
        bubbleBg.setAttribute('width', '1.0');
        bubbleBg.setAttribute('height', '0.35');
        bubbleBg.setAttribute('color', '#ffffff');
        bubbleBg.setAttribute('opacity', '0.95');
        bubbleBg.setAttribute('shader', 'flat');
        bubbleBg.setAttribute('side', 'double');
        speechBubble.appendChild(bubbleBg);

        const bubbleText = document.createElement('a-text');
        bubbleText.setAttribute('value', '☕ COFFEE PLEASE!');
        bubbleText.setAttribute('align', 'center');
        bubbleText.setAttribute('position', '0 0 0.02');
        bubbleText.setAttribute('width', '1.8');
        bubbleText.setAttribute('color', '#2d1810');
        speechBubble.appendChild(bubbleText);

        speechBubble.setAttribute('animation', 'property: position; to: 0 2.0 0; dur: 1200; dir: alternate; loop: true; easing: easeInOutSine');

        customer.appendChild(speechBubble);
    },

    checkCoffeeDelivery: function () {
        if (this.customers.length === 0) return;

        const now = Date.now();
        if (now - this.lastDeliveryTime < 500) return; // Throttle

        const firstCustomer = this.customers[0];
        if (!firstCustomer || firstCustomer.dataset.deleting === 'true') return;

        const allCoffees = document.querySelectorAll('.coffee-cup');

        allCoffees.forEach((cup) => {
            if (!cup || !cup.object3D || cup.dataset.deleting === 'true') return;
            if (!firstCustomer.object3D) return;

            const cupPos = new THREE.Vector3();
            const customerPos = new THREE.Vector3();
            cup.object3D.getWorldPosition(cupPos);
            firstCustomer.object3D.getWorldPosition(customerPos);

            const distance = cupPos.distanceTo(customerPos);

            if (distance < 0.5) {
                // Check temperature
                const tempComponent = cup.components['coffee-temperature'];
                if (tempComponent && tempComponent.isTooCold()) {
                    console.log('❄️ Coffee too cold!');
                    this.el.emit('coffee-refused', { cup: cup });
                    return;
                }

                // Successful delivery
                this.lastDeliveryTime = now;
                this.deliverCoffee(cup, firstCustomer);
            }
        });
    },

    deliverCoffee: function (cup, customer) {
        console.log('✅ Coffee delivered!');

        // Mark for deletion
        cup.dataset.deleting = 'true';
        customer.dataset.deleting = 'true';

        // Remove cup
        if (cup.body && cup.body.world) {
            try { cup.body.world.removeBody(cup.body); } catch (e) {}
        }
        if (cup.parentNode) cup.parentNode.removeChild(cup);

        // Remove customer
        if (customer.parentNode) customer.parentNode.removeChild(customer);
        this.customers.shift();

        // Emit event
        this.el.emit('coffee-delivered', { success: true });

        // Advance queue
        setTimeout(this.advanceQueue, 500);

        // Spawn new customer
        setTimeout(() => {
            if (this.customers.length < this.data.maxQueue) {
                this.spawnCustomer();
            }
        }, 3000);
    },

    advanceQueue: function () {
        const cam = document.getElementById('cam');
        if (!cam || !cam.object3D) return;

        const camPos = new THREE.Vector3();
        cam.object3D.getWorldPosition(camPos);

        this.customers.forEach((customer, index) => {
            const newDistance = this.data.startDistance + (index * this.data.queueSpacing);

            const newPos = {
                x: camPos.x,
                y: 0,
                z: camPos.z - newDistance
            };

            customer.setAttribute('animation', `property: position; to: ${newPos.x} ${newPos.y} ${newPos.z}; dur: 800; easing: easeInOutQuad`);
            customer.dataset.queuePosition = index.toString();

            if (index === 0 && !customer.querySelector('.speech-bubble')) {
                setTimeout(() => {
                    this.createSpeechBubble(customer);
                }, 800);
            }
        });
    }
});
