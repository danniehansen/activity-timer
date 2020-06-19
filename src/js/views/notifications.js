require('../../sass/main.scss');

const t = window.TrelloPowerUp.iframe();
const enableNotificationsBtn = document.querySelector('.btn-enable-notifications');
const notificationsEnabled = document.querySelector('.notifications-enabled');

enableNotificationsBtn.addEventListener('click', () => {
   window.open('./enable_notifications.html');
});

async function render () {
    if (Notification.permission === 'granted') {
        enableNotificationsBtn.style.display = 'none';
        notificationsEnabled.style.display = 'block';
    } else {
        enableNotificationsBtn.style.display = 'none';
        notificationsEnabled.style.display = 'block';
    }

    t.sizeTo('.notifications-wrapper');
}

setTimeout(render, 1000);

t.render(render);