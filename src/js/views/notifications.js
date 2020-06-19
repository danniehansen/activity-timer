require('../../sass/main.scss');

const t = window.TrelloPowerUp.iframe();
const enableNotificationsEl = document.getElementById('enable-notifications');

enableNotificationsEl.checked = Notification.permission === 'granted';

enableNotificationsEl.addEventListener('change', () => {
    if (enableNotificationsEl.checked && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
});

t.render(async function() {
    t.sizeTo('.notifications-wrapper');
});