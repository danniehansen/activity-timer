require('../../sass/main.scss');

const t = window.TrelloPowerUp.iframe();
const enableNotificationsBtn = document.querySelector('.btn-enable-notifications');

if (Notification.permission !== 'granted') {
    enableNotificationsBtn.style.display = 'block';
}

enableNotificationsBtn.addEventListener('click', () => {
   window.open(t.signUrl('./enable_notifications.html'));
});

t.render(async function() {
    t.sizeTo('.notifications-wrapper');
});