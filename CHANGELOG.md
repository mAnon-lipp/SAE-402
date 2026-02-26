# 🛠️ Corrections et Améliorations - Holo Barista

## 📋 Résumé des changements

### ✅ 1. Système d'inventaire HUD (CORRIGÉ)
**Problème** : Le menu HUD se créait/supprimait à chaque ouverture, causant des problèmes de visibilité et de stabilité.

**Solution** :
- Le menu HUD est maintenant créé **une seule fois** au démarrage de la session XR
- L'ouverture/fermeture utilise simplement `setAttribute('visible', 'true/false')`
- Ajout d'un ID unique `hud-inventory` pour faciliter la référence
- Double sécurité avec `object3D.visible` pour Three.js

**Fichiers modifiés** :
- `src/main.js` (lignes 53-61, 204-228)

---

### ✅ 2. Bouton B pour la machine à café (NOUVEAU)
**Problème** : Pas de gestionnaire pour déclencher la machine à café avec le bouton B.

**Solution** :
- Ajout de la détection du bouton B (bouton 1 du gamepad Oculus)
- La machine à café se déclenche si elle est à moins de 1.5m du joueur
- Système de verrouillage `bButtonLock` pour éviter les déclenchements multiples
- Message de log pour le debug

**Fichiers modifiés** :
- `src/main.js` (lignes 230-257)
- `src/components/coffee-machine.js` (ligne 13)

---

### ✅ 3. Chemins audio (CORRIGÉ)
**Problème** : Chemins audio avec slash initial `/sounds/` au lieu de `sounds/`.

**Solution** :
- Correction des chemins pour être relatifs (sans slash initial)
- Compatible avec la structure Vite (`public/sounds/` → `sounds/`)

**Fichiers modifiés** :
- `src/components/customer.js` (ligne 5)

---

### ✅ 4. Raycaster et visibilité laser (AMÉLIORÉ)
**Problème** : Le laser restait visible même quand les menus étaient fermés.

**Solution** :
- Utilisation de `getElementById('hud-inventory')` au lieu de `querySelector('[hud-menu]')`
- Condition simplifiée : laser visible SEULEMENT si inventaire ouvert OU welcome panel actif
- Meilleure logique pour éviter les conflits

**Fichiers modifiés** :
- `src/main.js` (lignes 144-149)

---

### ✅ 5. Suppression des conflits vr-controls (NETTOYÉ)
**Problème** : Deux systèmes de gestion de boutons qui se chevauchaient.

**Solution** :
- Désactivation de la logique de `vr-controls.js` (toggle menu)
- Centralisation de la gestion des boutons dans `main.js` xrLoop
- Les événements de connexion des manettes sont conservés pour le debug

**Fichiers modifiés** :
- `src/components/vr-controls.js`

---

## 🎮 Comment utiliser le jeu

### Contrôles Quest 3

#### **Main Gauche (Manette gauche)**
| Bouton | Action |
|--------|--------|
| **X ou Y** | Ouvrir/Fermer l'inventaire |
| **Trigger** | Sélectionner un item dans l'inventaire |
| **Grip** | Attraper un objet |

#### **Main Droite (Manette droite)**
| Bouton | Action |
|--------|--------|
| **B** | Activer la machine à café (si proche) |
| **Trigger** | Pointer/Cliquer |
| **Grip** | Attraper un objet |

### Déroulement du jeu

1. **Panneau d'accueil** : Cliquez sur "START" avec le laser
2. **Ouvrir l'inventaire** : Appuyez sur X ou Y (main gauche)
3. **Placer la machine** : Sélectionnez "COFFEE" dans l'inventaire
4. **Préparer le café** : Approchez-vous de la machine et appuyez sur **B**
5. **Servir le client** : Attrapez la tasse et amenez-la au client
6. **Attention** : Le café refroidit ! Servez-le avant qu'il ne soit trop froid ❄️

### États du café (jauge de température)

- 🔥 **100-70%** : Café chaud (vert) - Parfait pour servir
- ☕ **70-50%** : Café tiède (jaune) - Encore acceptable
- ⚠️ **50-30%** : Café refroidissant (orange) - Dépêchez-vous!
- ❄️ **<30%** : Café froid (rouge) - Le client refusera

### Nettoyage

- **Poubelle** : Placez des objets près de la poubelle pour les supprimer
- **Balai** : Attrapez le balai et passez-le sur les taches au sol

---

## 🔧 Architecture technique

### Flux de gameplay

```
Panneau d'accueil (welcome-panel)
        ↓
    [start-game event]
        ↓
Spawn du 1er client après 5s (customer-spawner)
        ↓
Client en position 0 (customer)
        ↓
Demande de café (bulle de dialogue)
        ↓
Machine activée avec B (coffee-machine)
        ↓
Tasse spawn avec température (coffee-temperature)
        ↓
Livraison au client (customer.tick)
        ↓
Vérification température + distance
        ↓
    [coffee-delivered event]
        ↓
Game Manager (game-manager)
    - Nettoyage de la tasse et du client
    - Score +10
    - Avancement de la file
    - Spawn d'un nouveau client après 3s
```

### Composants clés

| Composant | Rôle |
|-----------|------|
| `game-manager` | Gestion globale de l'état du jeu (système) |
| `hud-menu` | Interface d'inventaire/shop |
| `welcome-panel` | Écran de démarrage |
| `customer-spawner` | Création de clients dans la file |
| `customer` | Logique individuelle d'un client |
| `coffee-machine` | Préparation des cafés |
| `coffee-temperature` | Système de refroidissement avec jauge |
| `grab-system` | Système de préhension d'objets |
| `trashcan` | Suppression d'objets |
| `stain-manager` | Génération de taches |
| `broom-cleaner` | Nettoyage des taches |

---

## 🐛 Debug

### Overlay XR (en haut à droite)
Affiche en temps réel :
- État des manettes (Left, Right)
- État du Trigger
- État de l'inventaire (OPEN/OFF)

### Console logs à surveiller
- 🎒 `INVENTAIRE : OUVERT/FERMÉ`
- ☕ `Bouton B : Machine à café activée`
- 📦 `SPAWN : [OBJET] à la position...`
- 🎯 `COLLISION VALIDÉE avec le client 1`
- ❄️ `Café trop froid ! Refusé.`

---

## 🚀 Prochaines étapes suggérées

1. Ajouter un système de score visible dans un HUD
2. Ajouter des animations pour les clients (boisson, départ)
3. Améliorer les feedbacks sonores (validation, refus, score)
4. Ajouter des variantes de clients (modèles 3D différents)
5. Système de difficulté progressive (clients plus impatients)

---

**Date de mise à jour** : 25 février 2026  
**Version** : 1.3.0 - Grab System Fixed + Inventory Debug  
**Testé sur** : Meta Quest 3 (WebXR Immersive AR)

---

## 🔧 Corrections Version 1.3.0 (25 février 2026)

### ✅ 1. Grab System avec Grip - CORRIGÉ (Double système)

**Problème** : Appuyer sur la gâchette arrière (grip) ne permettait pas d'attraper les objets.

**Cause probable** : Le composant `hand-controls` d'A-Frame n'émettait pas toujours les événements `gripdown`/`gripup` de manière fiable dans certaines configurations WebXR.

**Solution (Double système)** :
1. **Système principal** : `grab-system.js` (écoute les événements A-Frame)
2. **Système de secours** : `grab-fallback.js` (**nouveau composant**)
   - Écoute directement l'API WebXR (`inputSources.gamepad.buttons`)
   - Détecte manuellement les pressions grip/trigger
   - Émet les événements ET appelle directement `grab-system`
   - S'active automatiquement si les événements ne marchent pas

**Logs de debug ajoutés** :
```
✊ Événement grip/trigger détecté sur main left!
🔍 Aucun objet grabbable trouvé à moins de 0.5m
✊ Objet attrapé : models/CoffeeMachine.glb (distance: 0.32m)
🖐️ Objet relâché avec vélocité (0.5, 1.2, -0.3)
```

**Fichiers modifiés** :
- `src/components/grab-fallback.js` (**nouveau** - système de secours)
- `src/components/grab-system.js` (logs de debug)
- `src/main.js` (import et activation du fallback)

---

### ✅ 2. Inventaire - Identification spawn erroné (DEBUG)

**Problème** : Cliquer sur la machine à café spawnait une poubelle.

**Solution** :
- Ajout de **logs de debug** pour tracer exactement quel item est cliqué
- Vérification que la closure JavaScript capture bien le bon `item`
- Logs : 
  ```
  📦 Clic sur bouton index 0: COFFEE - models/CoffeeMachine.glb
  🚀 Spawn démarré pour: COFFEE
  ```

**Comment vérifier** :
1. Ouvrez la console du navigateur (F12)
2. Cliquez sur un item dans l'inventaire
3. Vérifiez que le log correspond au bon item
4. Si le log est correct mais le spawn est faux, le problème vient de `spawnObject()`

**Fichiers modifiés** : `src/components/hud-menu.js`

---

## � Guide de Debug Version 1.3.0

### Si le grab ne fonctionne toujours pas :

1. **Ouvrez la console** (F12 dans le navigateur Quest)
2. **Appuyez sur grip** sur votre manette
3. **Cherchez ces messages** :
   ```
   🎮 FALLBACK: right grip DOWN détecté!
   ✊ Événement grip/trigger détecté sur main right!
   ```

**Scénarios** :

| Message dans console | Signification | Solution |
|---------------------|---------------|----------|
| Aucun message | Les événements ne sont pas détectés | Le fallback devrait s'en occuper |
| `FALLBACK: grip DOWN` uniquement | Le fallback fonctionne | Vérifiez que les objets ont la classe `grabbable` |
| `Événement grip détecté` | hand-controls fonctionne | Vérifiez la distance (défaut: 0.5m) |
| `Aucun objet grabbable trouvé` | Trop loin de l'objet | Approchez-vous à moins de 0.5m |
| `Objet attrapé` | ✅ Tout fonctionne ! | - |

### Si le mauvais objet spawn dans l'inventaire :

1. **Ouvrez la console** (F12)
2. **Cliquez sur machine à café**
3. **Vérifiez le log** :
   ```
   📦 Clic sur bouton index 0: COFFEE - models/CoffeeMachine.glb
   🚀 Spawn démarré pour: COFFEE
   ```

**Si le log affiche** `index 0: COFFEE` **mais qu'une poubelle spawn** :
- Le problème est dans la fonction `spawnObject()`
- Vérifiez que `item.model` contient bien le bon chemin
- Vérifiez qu'il n'y a pas de cache du modèle 3D

**Si le log affiche** `index 1: TRASH` **alors que vous avez cliqué sur COFFEE** :
- Le raycaster pointe le mauvais bouton
- Essayez de pointer plus précisément au centre du bouton
- Le problème peut venir d'une superposition de colliders

---

## �🔧 Corrections Version 1.2.0 (25 février 2026)

### ✅ 1. Grab System (CORRIGÉ)
**Problème** : Les objets ne pouvaient plus être attrapés avec grip/trigger.

**Cause** : Les entités `leftHand` et `rightHand` n'avaient pas le composant natif A-Frame `hand-controls`, nécessaire pour générer les événements `gripdown`, `gripup`, `triggerdown`, `triggerup`.

**Solution** :
- Ajout du composant `hand-controls="hand: left/right; handModelStyle: lowPoly"` aux entités des mains
- Les événements sont maintenant correctement émis et capturés par `grab-system`

**Fichiers modifiés** : `index.html`

---

### ✅ 2. Machine à Café - Bouton B (AMÉLIORÉ)
**Problème** : Appuyer sur B ne déclenchait plus la machine à café, ou c'était peu fiable.

**Ancienne solution** : Détection par distance (1.5m) sans feedback visuel.

**Nouvelle solution** :
- Création d'un nouveau composant **`coffee-machine-pointer`**
- **Raycasting depuis la main droite** : On pointe la machine avec la main
- **Indicateur visuel** : Cercle vert tournant au-dessus de la machine pointée 🟢
- **Activation au bouton B** : Appuyer sur B active uniquement la machine pointée
- **Feedback** : Flash blanc lors de l'activation

**Fichiers modifiés** :
- `src/components/coffee-machine-pointer.js` (nouveau composant)
- `src/main.js` (import et activation du composant)

---

### ✅ 3. Visualisation des Modèles dans l'Inventaire (CORRIGÉ)
**Problème** : Les modèles 3D dans l'inventaire apparaissaient comme des ombres noires.

**Cause** : Pas d'éclairage local dans le menu HUD (attaché à la caméra).

**Solution** :
- Ajout de 2 **lumières point** dans le menu HUD
- Animation de **rotation continue** des modèles pour meilleur aperçu
- Intensité lumineuse optimisée (0.8 + 0.6)

**Fichiers modifiés** : `src/components/hud-menu.js`

---
