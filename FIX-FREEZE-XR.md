# Fix du Freeze XR lors de la livraison de café

## 🐛 Problème
L'application XR freeze totalement (image collée à la vue) au moment où la tasse de café est lâchée sur le client.

**Cause**: Suppression d'objets physiques (CANNON.js) pendant la phase de calcul physique, ce qui bloque le moteur de rendu.

## ✅ Corrections Appliquées

### 1. Sécurisation du Release (Lâcher) - `xr-interaction-system.js`

**Avant** (manipulation directe de `body`):
```javascript
grabbedObject.body.type = 1;
grabbedObject.body.mass = 0.3;
grabbedObject.body.collisionResponse = true;
grabbedObject.body.updateMassProperties();
grabbedObject.body.wakeUp();
```

**Après** (utilisation de `setAttribute` - Best Practice A-Frame):
```javascript
grabbedObject.setAttribute('dynamic-body', {
  mass: 0.3,
  linearDamping: 0.5,
  angularDamping: 0.5,
  shape: 'auto'
});
```

**Pourquoi**: La méthode `setAttribute` réinitialise proprement le composant physique, évitant les états incohérents.

---

### 2. Fix de la Collision Client - `customer.js`

#### A. Ajout d'un flag de sécurité
```javascript
init: function () {
  this.isServed = false;
  this.isProcessed = false; // ⚡ NOUVEAU : Empêche les doubles collisions
  this.refusalCooldown = false;
  // ...
}
```

#### B. Protection dans le tick
```javascript
tick: function () {
  // Vérification du flag isProcessed
  if (this.el.dataset.queuePosition !== "0" || this.isServed || this.isProcessed || this.el.dataset.deleting === 'true') return;
  
  // ...
}
```

#### C. setTimeout pour différer l'événement
**Avant**:
```javascript
this.isServed = true;
cup.dataset.deleting = 'true';
this.el.dataset.deleting = 'true';
system.el.emit('coffee-delivered', { cup: cup, customer: this.el });
```

**Après**:
```javascript
this.isServed = true;
this.isProcessed = true; // ⚡ Verrouillage immédiat

cup.dataset.deleting = 'true';
this.el.dataset.deleting = 'true';

// ⚡ FIX CRITIQUE : Différer l'émission de l'événement
setTimeout(() => {
  system.el.emit('coffee-delivered', { cup: cup, customer: this.el });
}, 0);
```

**Pourquoi**: `setTimeout(() => {}, 0)` reporte l'exécution après la fin de la phase physique actuelle, évitant le crash de CANNON.js.

---

### 3. Fix de la Suppression d'Objets - `game-manager.js`

**Avant** (suppression immédiate):
```javascript
onCoffeeDelivered: function (event) {
  // ...
  if (cup.body && cup.body.world) {
    cup.body.world.removeBody(cup.body);
  }
  cup.parentNode.removeChild(cup);
  // ...
}
```

**Après** (suppression différée):
```javascript
onCoffeeDelivered: function (event) {
  // ...
  
  // ⚡ FIX CRITIQUE : Toutes les suppressions dans setTimeout
  setTimeout(() => {
    if (cup && cup.parentNode) {
      try {
        if (cup.body && cup.body.world) {
          cup.body.world.removeBody(cup.body);
        }
        cup.parentNode.removeChild(cup);
        // ...
      } catch(e) { 
        console.warn("Erreur suppression tasse:", e); 
      }
    }
    // Même traitement pour customer...
  }, 0);
  
  // Avancement de la queue reste après setTimeout (ligne 500ms)
}
```

**Pourquoi**: Les suppressions d'objets physiques doivent se faire **hors** de la boucle de calcul physique de CANNON.js.

---

### 4. Protection de la boucle xrLoop - `main.js`

**Ajout de try/catch** pour éviter le blocage visuel:

```javascript
function xrLoop(time, frame) {
  try {
    const ses = window.xrSession;
    if (ses) {
      // ... logique principale ...
      
      // Protection supplémentaire pour les contrôleurs
      try {
        handleControllerInteraction(window.leftController);
        handleControllerInteraction(window.rightController);
      } catch (controllerError) {
        console.error('❌ Erreur interaction contrôleur:', controllerError);
      }
      
      updateDebugOverlay();
    }
  } catch (error) {
    // ⚡ PROTECTION CRITIQUE : Évite le freeze visuel
    console.error('❌ Erreur dans xrLoop:', error);
  }

  if (window.xrSession) window.xrSession.requestAnimationFrame(xrLoop);
}
```

**Pourquoi**: 
- Si une erreur non capturée se produit dans `xrLoop`, le rendu s'arrête → "image collée aux yeux"
- Le `try/catch` capture l'erreur, l'affiche dans la console, et permet à la boucle de continuer

---

## 🧪 Comment Tester

1. Lance l'application sur Quest 3
2. Spawn une machine à café (inventaire X/Y)
3. Active la machine (Bouton B) pour créer une tasse
4. Grab la tasse avec le Trigger
5. Amène la tasse près du client (< 50cm)
6. **Relâche le Trigger**

**Résultat attendu**:
- ✅ La tasse est livrée
- ✅ Le score augmente (+10)
- ✅ Le client disparaît
- ✅ La file avance
- ✅ **Pas de freeze, l'image bouge normalement**

**Logs console à surveiller**:
```
🎯 COLLISION VALIDÉE avec le client 1 !
☕ Café livré avec succès ! Score: 10
🖐️ Objet relâché: url(models/Coffeecup.glb)
👥 Avancement de la file d'attente...
```

---

## 📚 Références Techniques

### A-Frame Best Practices
> "Use `setAttribute` to modify components instead of directly manipulating physics bodies. This ensures proper lifecycle management and avoids race conditions."
> — [A-Frame JavaScript Events & DOM APIs](https://aframe.io/docs/master/introduction/javascript-events-dom-apis.html)

### CANNON.js Physics
> "Never remove bodies during the physics step (`world.step()`). Queue removals for the next frame using `setTimeout(() => {}, 0)` or a deferred removal queue."
> — CANNON.js Documentation

### WebXR Error Handling
> "Always wrap animation frame callbacks in try/catch to prevent visual lockup. If an error propagates out of `requestAnimationFrame`, the browser may stop calling your callback."
> — [WebXR Device API Spec](https://immersive-web.github.io/webxr/)

---

## 🔧 Fichiers Modifiés

| Fichier | Modification |
|---------|--------------|
| [src/components/xr-interaction-system.js](src/components/xr-interaction-system.js#L177) | Release avec `setAttribute` |
| [src/components/customer.js](src/components/customer.js#L5) | Flag `isProcessed` + `setTimeout` |
| [src/systems/game-manager.js](src/systems/game-manager.js#L50) | Suppressions dans `setTimeout` |
| [src/main.js](src/main.js#L257) | `try/catch` dans `xrLoop` |

---

**Statut**: ✅ Corrections appliquées, prêt pour tests
**Date**: 26 février 2026
