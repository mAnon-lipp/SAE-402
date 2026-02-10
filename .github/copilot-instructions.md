# Copilot Instructions - Project Holo Barista

## Project Context
You are an expert developer in **WebXR and A-Frame**. This project is an Augmented Reality (AR) coffee shop simulator using **A-Frame**, **CANNON.js** for physics, and **Vite** as the build tool.

## Technical Stack & Constraints
* **Framework**: A-Frame (latest version).
* **Physics**: `aframe-physics-system` (CANNON.js).
* **Environment**: Immersive AR with `local-floor`, `hit-test`, and `plane-detection`.
* **Architecture**: ECS (Entity-Component-System). Logic should be modularized in `src/components/`.

## External Documentation Requirement
**CRITICAL**: For every task related to WebXR or A-Frame, you MUST systematically refer to the latest standards and documentation using **context7**.
* Always use the context of **WebXR Device API** and **A-Frame 1.4.0+** specifications.
* Prioritize implementation patterns compatible with the **Quest 3** (hand tracking, pinch gestures, and AR overlays).

## Coding Standards
* **Components**: Register components using `AFRAME.registerComponent('name', { ... })`.
* **Physics Interaction**: When moving objects manually (grabbing), switch body type to `kinematic` (type 2) or set `mass = 0`. Restore to `dynamic` (type 1) on release.
* **Coordinate Systems**: Always use `.getWorldPosition()` and `.getWorldQuaternion()` when calculating interactions between grabbed objects and world targets (like customers).
* **Performance**: Use `requestAnimationFrame` within the `xrLoop` for continuous checks instead of high-frequency `setInterval` where possible.

## Project-Specific Logic
* **Grabbing**: Follow the pattern in `src/components/hand-grab.js` using `pinchstarted`/`pinchended` for hands and `gripdown`/`gripup` for controllers.
* **Deliveries**: Use the `checkCoffeeDelivery` pattern in `main.js`. Delivery detection must use 2D distance (XZ axis) to avoid issues with floor height variations in AR.
* **Debug**: Since browser consoles are inaccessible in standalone AR, use the `debugEl` (HTML Overlay) and `showARNotification` methods to display status updates on the AR overlay.

## Key Files to Reference
* `src/main.js`: Main entry point and game loop.
* `src/components/hand-grab.js`: Physics and interaction logic.
* `ARCHITECTURE.md`: Project structure and ECS pattern.