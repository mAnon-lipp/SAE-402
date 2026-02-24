import 'aframe';

AFRAME.registerSystem('ar-notifier', {
  init: function () {
    // N'importe quel composant peut émettre cet événement !
    this.el.addEventListener('show-notification', (e) => {
        this.showNotification(e.detail.message, e.detail.duration);
    });
  },

  showNotification: function (message, duration = 2000) {
    const cam = document.getElementById('cam');
    if (!cam) return;

    // Conteneur attaché à la caméra
    const notifContainer = document.createElement('a-entity');
    notifContainer.setAttribute('position', '0 0.3 -1');
    
    // Fond noir
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '1.2');
    bg.setAttribute('height', '0.25');
    bg.setAttribute('color', '#000000');
    bg.setAttribute('opacity', '0.8');
    notifContainer.appendChild(bg);

    // Texte Vert Fluorescent
    const notification = document.createElement('a-text');
    notification.setAttribute('value', message);
    notification.setAttribute('align', 'center');
    notification.setAttribute('position', '0 0 0.01');
    notification.setAttribute('width', '2.5');
    notification.setAttribute('color', '#00ff00');
    notification.setAttribute('opacity', '1');
    notifContainer.appendChild(notification);

    cam.appendChild(notifContainer);

    // --- ANIMATION DE FONDU (FADE-OUT) EXACTEMENT COMME L'ORIGINAL ---
    setTimeout(() => {
        let opacity = 1;
        const fadeInterval = setInterval(() => {
            opacity -= 0.05;
            if (opacity <= 0) {
                clearInterval(fadeInterval);
                if (notifContainer.parentNode) {
                    notifContainer.parentNode.removeChild(notifContainer);
                }
            } else {
                bg.setAttribute('opacity', (opacity * 0.8).toString());
                notification.setAttribute('opacity', opacity.toString());
            }
        }, 50);
    }, duration);
  }
});