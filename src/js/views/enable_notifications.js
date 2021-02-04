require('../sentry.js');

Notification.requestPermission().then(() => {
    window.close();
}).catch(() => {
    window.close();
});
