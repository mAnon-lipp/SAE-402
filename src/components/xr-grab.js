/* global AFRAME, THREE, CANNON */

/**
 * Component: xr-grab
 * Description: Unified grab system for both hand-tracking and controllers
 * Supports: Quest 3 pinch gestures and controller grip/trigger
 */
if (!AFRAME.components['xr-grab']) {
    AFRAME.registerComponent('xr-grab', {
        schema: {
            hand: { type: 'string', default: 'right' }, // 'left' ou 'right'
            grabDistance: { type: 'number', default: 0.15 }
        },

        init: function () {
            this.grabbedEl = null;
            this.grabOffset = new THREE.Vector3();
            this.grabSphere = new THREE.Sphere(new THREE.Vector3(), this.data.grabDistance);
            
            // Bind methods for cleanup
            this.onPinchStart = this.onPinchStart.bind(this);
        this.onPinchEnd = this.onPinchEnd.bind(this);
        this.onGripDown = this.onGripDown.bind(this);
        this.onGripUp = this.onGripUp.bind(this);

        // Listen to both hand-tracking and controller events
        this.el.addEventListener('pinchstarted', this.onPinchStart);
        this.el.addEventListener('pinchended', this.onPinchEnd);
        this.el.addEventListener('gripdown', this.onGripDown);
        this.el.addEventListener('gripup', this.onGripUp);

        console.log(`🎮 XR-Grab initialized for ${this.data.hand} hand`);
    },

    tick: function () {
        if (!this.grabbedEl) return;

        // Check if object is being deleted
        if (this.grabbedEl.dataset.deleting === 'true') {
            console.log('⚠️ Object being deleted, force release');
            this.grabbedEl = null;
            return;
        }

        // Update grab sphere position
        const handPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(handPos);
        this.grabSphere.center.copy(handPos);

        // Move grabbed object with hand/controller
        const controllerQuat = new THREE.Quaternion();
        this.el.object3D.getWorldQuaternion(controllerQuat);

        this.grabbedEl.object3D.position.copy(handPos);
        this.grabbedEl.object3D.quaternion.copy(controllerQuat);

        // IMPORTANT: Sync with CANNON.js body (KINEMATIC)
        if (this.grabbedEl.body) {
            this.grabbedEl.body.position.set(handPos.x, handPos.y, handPos.z);
            this.grabbedEl.body.quaternion.set(controllerQuat.x, controllerQuat.y, controllerQuat.z, controllerQuat.w);
            this.grabbedEl.body.velocity.set(0, 0, 0);
            this.grabbedEl.body.angularVelocity.set(0, 0, 0);
        }

        // --- JOYSTICK ROTATION ---
        this.applyJoystickRotation();
    },

    applyJoystickRotation: function () {
        if (!this.grabbedEl) return;

        // Get XR session and input sources
        const xrSession = this.el.sceneEl.renderer.xr.getSession();
        if (!xrSession) return;

        const rotSpeed = 0.05;

        // Check all input sources for matching handedness
        for (const source of xrSession.inputSources) {
            if (source.handedness !== this.data.hand) continue;
            if (!source.gamepad || !source.gamepad.axes) continue;

            const axes = source.gamepad.axes;
            if (axes.length < 2) continue;

            // Left Controller: Yaw rotation (Left/Right on joystick)
            if (this.data.hand === 'left') {
                const axisX = axes[2] !== undefined ? axes[2] : axes[0];
                if (Math.abs(axisX) > 0.1) {
                    this.grabbedEl.object3D.rotation.y += -axisX * rotSpeed;

                    // Sync physics quaternion
                    if (this.grabbedEl.body) {
                        const q = this.grabbedEl.object3D.quaternion;
                        this.grabbedEl.body.quaternion.set(q.x, q.y, q.z, q.w);
                    }
                }
            }

            // Right Controller: Pitch rotation (Up/Down on joystick)
            if (this.data.hand === 'right') {
                const axisY = axes[3] !== undefined ? axes[3] : axes[1];
                if (Math.abs(axisY) > 0.1) {
                    this.grabbedEl.object3D.rotation.x += -axisY * rotSpeed;

                    // Sync physics quaternion
                    if (this.grabbedEl.body) {
                        const q = this.grabbedEl.object3D.quaternion;
                        this.grabbedEl.body.quaternion.set(q.x, q.y, q.z, q.w);
                    }
                }
            }
        }
    },

    onPinchStart: function (evt) {
        this.grab();
    },

    onPinchEnd: function (evt) {
        this.release();
    },

    onGripDown: function (evt) {
        this.grab();
    },

    onGripUp: function (evt) {
        this.release();
    },

    grab: function () {
        if (this.grabbedEl) return;

        const handPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(handPos);

        // Find closest grabbable object
        const grabbables = document.querySelectorAll('[grabbable]');
        let closestEl = null;
        let closestDist = this.data.grabDistance;

        grabbables.forEach((el) => {
            if (el.dataset.deleting === 'true') return;

            const objPos = new THREE.Vector3();
            el.object3D.getWorldPosition(objPos);

            const dist = handPos.distanceTo(objPos);
            if (dist < closestDist) {
                closestDist = dist;
                closestEl = el;
            }
        });

        if (closestEl) {
            this.grabbedEl = closestEl;
            closestEl.emit('grab-start', { hand: this.data.hand, controller: this.el });
            console.log(`✊ Object grabbed: ${closestEl.id || 'no-id'}`);
        }
    },

    release: function () {
        if (this.grabbedEl) {
            this.grabbedEl.emit('grab-end', { hand: this.data.hand });
            console.log(`🖐️ Object released`);
            this.grabbedEl = null;
        }
    },

    remove: function () {
        // Cleanup event listeners
        this.el.removeEventListener('pinchstarted', this.onPinchStart);
        this.el.removeEventListener('pinchended', this.onPinchEnd);
        this.el.removeEventListener('gripdown', this.onGripDown);
        this.el.removeEventListener('gripup', this.onGripUp);
    }
    });
}

/**
 * Component: grabbable
 * Description: Marks an object as grabbable with physics support
 */
if (!AFRAME.components['grabbable']) {
    AFRAME.registerComponent('grabbable', {
        init: function () {
            this.originalColor = null;
            this.previousPositions = [];
            this.maxPositionHistory = 5;
            this.velocity = new THREE.Vector3();
            this.isGrabbed = false;
            this.originalBodyType = null;

            // Bind methods
            this.onGrabStart = this.onGrabStart.bind(this);
            this.onGrabEnd = this.onGrabEnd.bind(this);

        this.el.addEventListener('grab-start', this.onGrabStart);
        this.el.addEventListener('grab-end', this.onGrabEnd);
    },

    onGrabStart: function (evt) {
        this.isGrabbed = true;
        this.previousPositions = [];

        this.el.dataset.isGrabbed = 'true';

        // Visual feedback
        const mat = this.el.getAttribute('material');
        if (mat) {
            this.originalColor = mat.color || '#4CC3D9';
        }
        this.el.setAttribute('material', 'color', '#FFD700');
        this.el.setAttribute('material', 'emissive', '#FF8C00');

        // Switch to KINEMATIC (type 2) - NO collision disabling
        if (this.el.body) {
            this.originalBodyType = this.el.body.type;
            this.el.body.type = CANNON.Body.KINEMATIC; // Type 2
            this.el.body.mass = 0;
            this.el.body.updateMassProperties();
            this.el.body.velocity.set(0, 0, 0);
            this.el.body.angularVelocity.set(0, 0, 0);
        }
    },

    onGrabEnd: function (evt) {
        const finalVelocity = this.calculateAverageVelocity();
        this.isGrabbed = false;
        this.el.dataset.isGrabbed = 'false';

        // Restore color
        if (this.originalColor) {
            this.el.setAttribute('material', 'color', this.originalColor);
        }
        this.el.setAttribute('material', 'emissive', '#000000');

        // Restore physics to DYNAMIC
        if (this.el.body) {
            this.el.body.type = CANNON.Body.DYNAMIC; // Type 1
            this.el.body.mass = 1;
            this.el.body.updateMassProperties();
            this.el.body.wakeUp();

            // Apply throw velocity
            const throwMultiplier = 3;
            this.el.body.velocity.set(
                finalVelocity.x * throwMultiplier,
                finalVelocity.y * throwMultiplier,
                finalVelocity.z * throwMultiplier
            );

            // Add rotation for realism
            this.el.body.angularVelocity.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
        }
    },

    calculateAverageVelocity: function () {
        if (this.previousPositions.length < 2) {
            return new THREE.Vector3(0, 0, 0);
        }

        const avgVelocity = new THREE.Vector3();

        for (let i = 1; i < this.previousPositions.length; i++) {
            const prev = this.previousPositions[i - 1];
            const curr = this.previousPositions[i];

            const dt = (curr.time - prev.time) / 1000;
            if (dt > 0) {
                avgVelocity.x += (curr.pos.x - prev.pos.x) / dt;
                avgVelocity.y += (curr.pos.y - prev.pos.y) / dt;
                avgVelocity.z += (curr.pos.z - prev.pos.z) / dt;
            }
        }

        const count = this.previousPositions.length - 1;
        avgVelocity.divideScalar(count);

        return avgVelocity;
    },

    tick: function (time, delta) {
        if (this.isGrabbed && delta > 0) {
            const currentPosition = new THREE.Vector3();
            this.el.object3D.getWorldPosition(currentPosition);

            this.previousPositions.push({
                pos: currentPosition.clone(),
                time: time
            });

            if (this.previousPositions.length > this.maxPositionHistory) {
                this.previousPositions.shift();
            }
        }
    },

    remove: function () {
        this.el.removeEventListener('grab-start', this.onGrabStart);
        this.el.removeEventListener('grab-end', this.onGrabEnd);
    }
    });
}
