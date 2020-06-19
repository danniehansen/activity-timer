const {
    disableNotificationsFeature,
    enableNotificationsFeature
} = require('../shared.js');

const t = window.TrelloPowerUp.iframe();

Notification.requestPermission().then(async (choice) => {
    if (choice) {
        await enableNotificationsFeature(t);
    } else {
        await disableNotificationsFeature(t);
    }

    window.close();
}).catch(async () => {
    await disableNotificationsFeature(t);
    window.close();
});