/* global AFRAME, THREE */

/**
 * Component: coffee-temperature
 * Description: Manages coffee temperature that decreases over time
 * with a visual gauge displayed above the cup
 */

AFRAME.registerComponent('coffee-temperature', {
    schema: {
        temperature: { type: 'number', default: 100 }, // Temperature percentage (0-100)
        coolingRate: { type: 'number', default: 5 }, // Degrees per second
        gaugeHeight: { type: 'number', default: 0.3 }, // Height above cup
    },

    init: function () {
        this.temperature = this.data.temperature;
        this.lastUpdateTime = performance.now();
        
        // Create the visual gauge
        this.createTemperatureGauge();
        
        console.log('🌡️ Coffee temperature system initialized at', this.temperature + '°C');
    },

    /**
     * Create a World Space UI temperature gauge above the cup
     */
    createTemperatureGauge: function () {
        // Main container positioned above the cup
        this.gaugeContainer = document.createElement('a-entity');
        this.gaugeContainer.setAttribute('position', `0 ${this.data.gaugeHeight} 0`);
        this.gaugeContainer.classList.add('temperature-gauge');
        
        // Background bar (full width)
        this.gaugeBackground = document.createElement('a-plane');
        this.gaugeBackground.setAttribute('width', '0.3');
        this.gaugeBackground.setAttribute('height', '0.05');
        this.gaugeBackground.setAttribute('color', '#333333');
        this.gaugeBackground.setAttribute('opacity', '0.6');
        this.gaugeBackground.setAttribute('material', 'shader: flat; transparent: true');
        this.gaugeContainer.appendChild(this.gaugeBackground);
        
        // Foreground bar (dynamic width based on temperature)
        this.gaugeFill = document.createElement('a-plane');
        this.gaugeFill.setAttribute('width', '0.3'); // Will be updated
        this.gaugeFill.setAttribute('height', '0.05');
        this.gaugeFill.setAttribute('color', '#00ff00'); // Green when hot
        this.gaugeFill.setAttribute('opacity', '0.9');
        this.gaugeFill.setAttribute('material', 'shader: flat; transparent: true');
        this.gaugeFill.setAttribute('position', '0 0 0.001'); // Slightly in front
        this.gaugeContainer.appendChild(this.gaugeFill);
        
        // Temperature icon (steam/fire emoji representation)
        this.tempIcon = document.createElement('a-text');
        this.tempIcon.setAttribute('value', '🔥');
        this.tempIcon.setAttribute('align', 'center');
        this.tempIcon.setAttribute('position', '0 0.04 0');
        this.tempIcon.setAttribute('width', '0.3');
        this.tempIcon.setAttribute('color', '#ffffff');
        this.gaugeContainer.appendChild(this.tempIcon);
        
        // Billboard effect will be handled in tick() for better compatibility
        
        // Attach to the coffee cup entity
        this.el.appendChild(this.gaugeContainer);
    },

    /**
     * Update temperature and visual gauge each frame
     */
    tick: function (time) {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = currentTime;
        
        // Decrease temperature over time
        this.temperature -= this.data.coolingRate * deltaTime;
        
        // Clamp between 0 and 100
        if (this.temperature < 0) this.temperature = 0;
        if (this.temperature > 100) this.temperature = 100;
        
        // Update the visual gauge
        this.updateGaugeVisual();
        
        // Billboard effect: make gauge face camera
        const camera = document.querySelector('[camera]');
        if (camera && this.gaugeContainer && this.gaugeContainer.object3D) {
            const cameraPos = new THREE.Vector3();
            const gaugePos = new THREE.Vector3();
            
            camera.object3D.getWorldPosition(cameraPos);
            this.gaugeContainer.object3D.getWorldPosition(gaugePos);
            
            this.gaugeContainer.object3D.lookAt(cameraPos);
        }
    },

    /**
     * Update the gauge fill color and width based on temperature
     */
    updateGaugeVisual: function () {
        const tempPercent = this.temperature / 100;
        
        // Update fill bar width (scale from 0 to 0.3)
        const fillWidth = 0.3 * tempPercent;
        this.gaugeFill.setAttribute('width', fillWidth.toFixed(3));
        
        // Offset position to keep it left-aligned
        const offsetX = (fillWidth - 0.3) / 2;
        this.gaugeFill.setAttribute('position', `${offsetX} 0 0.001`);
        
        // Update color based on temperature ranges
        let color, icon;
        if (this.temperature >= 70) {
            // Hot: Green
            color = '#00ff00';
            icon = '🔥';
        } else if (this.temperature >= 50) {
            // Warm: Yellow
            color = '#ffff00';
            icon = '☕';
        } else if (this.temperature >= 30) {
            // Lukewarm: Orange
            color = '#ff8800';
            icon = '⚠️';
        } else {
            // Cold: Red
            color = '#ff0000';
            icon = '❄️';
        }
        
        this.gaugeFill.setAttribute('color', color);
        this.tempIcon.setAttribute('value', icon);
    },

    /**
     * Get current temperature percentage
     * @returns {number} Temperature (0-100)
     */
    getTemperature: function () {
        return this.temperature;
    },

    /**
     * Check if coffee is too cold (fail condition)
     * @returns {boolean} True if temperature is below 30%
     */
    isTooCold: function () {
        return this.temperature < 30;
    },

    /**
     * Reset temperature to maximum (for reheating if needed)
     */
    resetTemperature: function () {
        this.temperature = 100;
        this.updateGaugeVisual();
    },

    /**
     * Clean up when component is removed
     */
    remove: function () {
        // Properly cleanup gauge elements
        if (this.gaugeContainer) {
            // Remove all child elements first
            if (this.gaugeBackground && this.gaugeBackground.parentNode) {
                this.gaugeBackground.parentNode.removeChild(this.gaugeBackground);
            }
            if (this.gaugeFill && this.gaugeFill.parentNode) {
                this.gaugeFill.parentNode.removeChild(this.gaugeFill);
            }
            if (this.tempIcon && this.tempIcon.parentNode) {
                this.tempIcon.parentNode.removeChild(this.tempIcon);
            }
            
            // Remove container
            if (this.gaugeContainer.parentNode) {
                this.gaugeContainer.parentNode.removeChild(this.gaugeContainer);
            }
        }
        
        // Clear references
        this.gaugeContainer = null;
        this.gaugeBackground = null;
        this.gaugeFill = null;
        this.tempIcon = null;
        
        console.log('🌡️ Coffee temperature component cleaned up');
    }
});
