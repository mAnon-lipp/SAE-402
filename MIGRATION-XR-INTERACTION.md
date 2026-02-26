# Migration vers le Système d'Interaction XR Manuel

## 🎯 Objectif
Remplacer les composants d'interaction basés sur les événements A-Frame (`hand-controls`, `laser-controls`) par un système manuel utilisant directement l'API WebXR et le raycasting THREE.js, comme dans la branche "Depart".

## ✅ Changements Effectués

### 1. Nouveau Composant: `xr-interaction-system.js`
**Emplacement**: `src/components/xr-interaction-system.js`

**Fonctionnalités**:
- ✨ Gestion manuelle des `inputSources` depuis `renderer.xr.getSession()`
- 🎮 Raycasting THREE.js utilisant `controller.matrixWorld`
- ✊ **Grab** avec le Trigger (bouton 0):
  - Détection d'objets avec classe `.grabbable`
  - Attachement via `controller.attach(object3D)`
  - Basculement en mode `kinematic` (type 2)
  - Restauration de la physique `dynamic` (type 1) au relâchement
- ☕ **Machine à Café** avec Bouton B (bouton 1 ou 5):
  - Raycasting vers objets `[coffee-machine]`
  - Appel de `machineComp.onClick()` pour déclencher le brewing

**Architecture**:
- Composant attaché à la scène (`scene.setAttribute("xr-interaction-system", "")`)
- Tick automatique à chaque frame
- Gestion séparée des deux contrôleurs (gauche/droite)
- Détection d'états de boutons avec transition (edge detection)

### 2. Modifications de `main.js`
**Lignes modifiées**:
```javascript
// AVANT:
import "./components/grab-system.js";
import "./components/grab-fallback.js";
import "./components/coffee-machine-pointer.js";

scene.setAttribute("coffee-machine-pointer", "");
scene.setAttribute("grab-fallback", "");

// APRÈS:
import "./components/xr-interaction-system.js";

scene.setAttribute("xr-interaction-system", "");
```

### 3. Modifications de `index.html`
**Lignes modifiées**:
```html
<!-- AVANT: -->
<a-entity id="leftHand"
  hand-controls="hand: left; handModelStyle: lowPoly; color: #15FFFF"
  vr-controls="hand: left"
  grab-system="handedness: left">
</a-entity>

<!-- APRÈS: -->
<a-entity id="leftHand"
  vr-controls="hand: left">
</a-entity>
```

**Remarque**: `hand-controls` et `grab-system` ont été retirés. Si tu veux visualiser les mains, tu peux ajouter un modèle glTF:
```html
<a-entity gltf-model="url(models/hand-left.glb)"></a-entity>
```

## 🔧 Composants Retirés/Remplacés
Les fichiers suivants ne sont **plus importés** mais restent dans le projet:
- ❌ `src/components/grab-system.js` (remplacé)
- ❌ `src/components/grab-fallback.js` (remplacé)
- ❌ `src/components/coffee-machine-pointer.js` (remplacé)

Tu peux les supprimer si tu es sûr que tout fonctionne.

## 🎮 Comment Tester

### Test du Grab (Trigger)
1. Lance l'application en AR sur Quest 3
2. Spawn un objet depuis l'inventaire (boutons X/Y)
3. Pointe ta main vers l'objet
4. Appuie sur le **Trigger** (index)
5. ✅ L'objet devrait suivre ta main
6. Relâche le Trigger
7. ✅ L'objet devrait tomber avec la physique

### Test de la Machine à Café (Bouton B)
1. Spawn une machine à café depuis l'inventaire
2. Pointe ta **main droite** vers la machine
3. Appuie sur le **Bouton B** (face button)
4. ✅ Tu devrais entendre un son
5. ✅ Après 3 secondes, une tasse de café devrait apparaître

### Debug Console
Recherche ces messages dans la console:
- `🎮 XR Interaction System initialisé` (au démarrage)
- `✊ Trigger DOWN - Main left/right` (quand tu appuies sur Trigger)
- `✅ Objet grabbé: ...` (quand un grab réussit)
- `🖐️ Objet relâché: ...` (quand tu relâches)
- `☕ Bouton B pressé - Recherche de machine à café...` (quand tu appuies sur B)
- `✅ Machine à café détectée! Activation...` (si le raycast trouve la machine)

## 🐛 Problèmes Potentiels et Solutions

### Le grab ne fonctionne pas
- Vérifie que les objets ont bien la classe `.grabbable`
- Regarde dans la console si `🔍 Aucun objet grabbable trouvé` apparaît
- Vérifie la distance (le raycaster a `far: 10`, donc 10 mètres max)

### La machine à café ne répond pas
- Vérifie que l'entité a bien le composant `coffee-machine`
- Vérifie que tu utilises la **main droite** (seul le contrôleur droit gère le bouton B)
- Regarde la console pour `❌ Aucune machine à café dans la direction du pointeur`

### Les objets grabbés ne suivent pas la main
- C'est géré par `updateGrabbedObjects()` dans le tick
- Vérifie que `controller.matrixWorld` est bien mis à jour

### La physique ne se réactive pas après relâchement
- Vérifie que `body.type = 1` est bien appelé dans `handleTriggerUp()`
- Vérifie que `body.wakeUp()` est appelé pour réveiller le corps

## 📚 Références Techniques

### API WebXR utilisée
- `XRSession.inputSources` - Liste des contrôleurs/mains
- `XRInputSource.gamepad.buttons` - État des boutons
- `XRInputSource.handedness` - 'left' ou 'right'
- `WebGLRenderer.xr.getController(index)` - Récupération du controller THREE.js

### THREE.js utilisé
- `THREE.Raycaster` - Détection de collision
- `Matrix4.extractRotation()` - Extraction de la rotation du controller
- `Object3D.attach()` - Attachement d'objet (préserve position mondiale)
- `Object3D.getWorldPosition/Quaternion()` - Position/rotation dans le référentiel monde

### Physique (CANNON.js)
- `body.type = 2` - KINEMATIC (pas affecté par gravité, pas de collision)
- `body.type = 1` - DYNAMIC (physique active)
- `body.mass = 0.3` - Masse de l'objet
- `body.wakeUp()` - Réveille un corps endormi

## 🚀 Prochaines Étapes Possibles
- Ajouter un feedback visuel (laser/ring) pour le grab
- Ajouter un feedback haptique (`gamepad.hapticActuators`)
- Supporter le grab à deux mains
- Ajouter d'autres interactions sur d'autres boutons
- Optimiser la recherche d'objets grabbables (cache)

---

**Statut**: ✅ Migration terminée, prêt pour les tests
**Date**: 2025
**Auteur**: GitHub Copilot
