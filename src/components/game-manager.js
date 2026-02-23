/* global AFRAME */

/**
 * Component: game-manager
 * Description: Central state management for the game
 * Encapsulates all global variables and provides state access
 */
AFRAME.registerComponent('game-manager', {
    schema: {},

    init: function () {
        // Game State Object (replaces global variables)
        this.state = {
            xrSession: null,
            xrRefSpace: null,
            hitTestSource: null,
            coffeeDelivered: false,
            menuToggleLock: false,
            coffeeMachineLock: false,
            uiClickLock: false,
            isAnyBtnPressed: false
        };

        // Collections
        this.surfaces = [];
        this.spawnedObjects = [];
        this.trashcans = [];
        this.customers = [];
        this.stains = [];

        // Controllers references
        this.leftController = null;
        this.rightController = null;

        // UI Elements
        this.inventoryEntity = null;
        this.welcomePanel = null;
        this.arDebugPanel = null;
        this.arDebugText = null;

        // Audio
        this.coffeeAudio = null;
        this.negativeAudio = null;

        // Constants
        this.MAX_QUEUE_SIZE = 4;
        this.QUEUE_SPACING = 0.8;
        this.QUEUE_START_DISTANCE = 1.2;
        this.TRASH_RADIUS = 0.2;

        // Make state globally accessible for other components
        window.GameState = this.state;
        window.GameManager = this;

        console.log('🎮 Game Manager initialized');
    },

    // State getters/setters
    getCoffeeDelivered: function () {
        return this.state.coffeeDelivered;
    },

    setCoffeeDelivered: function (value) {
        this.state.coffeeDelivered = value;
    },

    getSession: function () {
        return this.state.xrSession;
    },

    setSession: function (session) {
        this.state.xrSession = session;
    },

    // Object management
    addSpawnedObject: function (obj) {
        this.spawnedObjects.push(obj);
    },

    removeSpawnedObject: function (obj) {
        const idx = this.spawnedObjects.indexOf(obj);
        if (idx > -1) {
            this.spawnedObjects.splice(idx, 1);
        }
    },

    getSpawnedObjects: function () {
        return this.spawnedObjects;
    },

    // Customer management
    addCustomer: function (customer) {
        this.customers.push(customer);
    },

    removeCustomer: function (customer) {
        const idx = this.customers.indexOf(customer);
        if (idx > -1) {
            this.customers.splice(idx, 1);
        }
    },

    getCustomers: function () {
        return this.customers;
    },

    // Trashcan management
    addTrashcan: function (trashcan) {
        this.trashcans.push(trashcan);
    },

    getTrashcans: function () {
        return this.trashcans;
    }
});
