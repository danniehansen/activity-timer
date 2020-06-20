require('../../sass/main.scss');

const {
    hasNotificationsFeature,
    enableNotificationsFeature,
    disableNotificationsFeature
} = require('../shared.js');

const t = window.TrelloPowerUp.iframe();
const enableNotificationsBtn = document.querySelector('.btn-enable-notifications');
const disableNotificationsBtn = document.querySelector('.btn-disable-notifications');

enableNotificationsBtn.addEventListener('click', async () => {
    if (Notification.permission === 'granted') {
        await enableNotificationsFeature(t);
        await render();
    } else {
        window.open('./enable_notifications.html');
    }
});

disableNotificationsBtn.addEventListener('click', async () => {
    await disableNotificationsFeature(t);
    await render();
});

async function render () {
    const hasNotificationsEnabled = await hasNotificationsFeature(t);
    console.log('hasNotificationsEnabled:', hasNotificationsEnabled);
    if (hasNotificationsEnabled) {
        enableNotificationsBtn.style.display = 'none';
        disableNotificationsBtn.style.display = 'block';
    } else {
        enableNotificationsBtn.style.display = 'block';
        disableNotificationsBtn.style.display = 'none';
    }

    t.sizeTo('.notifications-wrapper');
}

setTimeout(async () => {
    if (Notification.permission === 'granted') {
        const hasNotificationsEnabled = await hasNotificationsFeature(t);

        if (!hasNotificationsEnabled) {
            await enableNotificationsFeature(t);
        }
    }

    await render();
}, 1000);

t.render(render);