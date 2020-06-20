require('../../sass/main.scss');

const {
    hasNotificationsFeature,
    enableNotificationsFeature,
    disableNotificationsFeature,
    setNotificationPercentage,
    getNotificationPercentage
} = require('../shared.js');

const t = window.TrelloPowerUp.iframe();
const enableNotificationsBtn = document.querySelector('.btn-enable-notifications');
const disableNotificationsBtn = document.querySelector('.btn-disable-notifications');
const notifyOnPercentageEl = document.querySelector('.notify-on-percentage');
const notifyOnPercentageInput = document.getElementById('notify-on-percentage');
const notifyOnPercentageSpan = document.querySelector('.notify-on-percentage span');

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

notifyOnPercentageInput.addEventListener('change', async () => {
    await setNotificationPercentage(t, notifyOnPercentageInput.value);
});

getNotificationPercentage(t).then((percentage) => {
    console.log('percentage:', percentage);
    if (percentage) {
        notifyOnPercentageInput.value = percentage;
        notifyOnPercentageSpan.innerText = percentage;
    } else {
        notifyOnPercentageInput.value = 80;
        notifyOnPercentageSpan.innerText = 80;
    }
});

async function render () {
    const hasNotificationsEnabled = await hasNotificationsFeature(t);

    if (hasNotificationsEnabled) {
        enableNotificationsBtn.style.display = 'none';
        disableNotificationsBtn.style.display = 'block';
        notifyOnPercentageEl.style.display = 'block';
    } else {
        enableNotificationsBtn.style.display = 'block';
        disableNotificationsBtn.style.display = 'none';
        notifyOnPercentageEl.style.display = 'none';
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