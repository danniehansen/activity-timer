require('../../sass/main.scss');

const { isRunning, getTotalSeconds, formatTime, startTimer, stopTimer } = require('../shared.js');
const t = window.TrelloPowerUp.iframe();

const startTimerBtn = document.querySelector('.btn-start-timer');
const stopTimerBtn = document.querySelector('.btn-stop-timer');
const trackedTimeEl = document.querySelector('.tracked-time');
const cardEl = document.querySelector('.card');

setInterval(async () => {
    const totalTime = await getTotalSeconds(t);
    trackedTimeEl.innerHTML = formatTime(totalTime);
}, 1000 * 10);

startTimerBtn.addEventListener('click', startTimer);
stopTimerBtn.addEventListener('click', stopTimer);

t.render(async function() {
    const running = await isRunning(t);
    const totalTime = await getTotalSeconds(t);

    if (running) {
        startTimerBtn.style.display = 'none';
        stopTimerBtn.style.display = 'inline-block';
    } else {
        startTimerBtn.style.display = 'inline-block';
        stopTimerBtn.style.display = 'none';
    }

    trackedTimeEl.innerHTML = formatTime(totalTime);
    cardEl.style.display = 'block';

    t.sizeTo('body');
});