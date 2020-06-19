require('../../sass/main.scss');

const {
    hasNotificationsFeature,
    disableNotificationsFeature
} = require('../shared.js');

const t = window.TrelloPowerUp.iframe();
const enableNotificationsBtn = document.querySelector('.btn-enable-notifications');
const disableNotificationsBtn = document.querySelector('.btn-disable-notifications');

enableNotificationsBtn.addEventListener('click', () => {
   window.open(t.signUrl('./enable_notifications.html'));
});

disableNotificationsBtn.addEventListener('click', async () => {
    await disableNotificationsFeature(t);
    await render();
});

async function render () {
    const enabledNotifications = await hasNotificationsFeature(t);

    if (Notification.permission === 'granted' && enabledNotifications) {
        enableNotificationsBtn.style.display = 'none';
        disableNotificationsBtn.style.display = 'block';
    } else {
        enableNotificationsBtn.style.display = 'block';
        disableNotificationsBtn.style.display = 'none';
    }

    t.sizeTo('.notifications-wrapper');
}

setTimeout(render, 1000);

t.render(render);