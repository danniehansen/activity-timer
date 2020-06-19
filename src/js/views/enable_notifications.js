Notification.requestPermission().then(() => {
    window.close();
}).catch(() => {
    window.close();
});