require('../../sass/main.scss');

const {
    isRunning, getTotalSeconds, formatTime,
    startTimer, stopTimer, getOwnEstimate,
    getTotalEstimate
} = require('../shared.js');

const t = window.TrelloPowerUp.iframe();

const startTimerBtn = document.querySelector('.btn-start-timer');
const stopTimerBtn = document.querySelector('.btn-stop-timer');
const trackedTimeEl = document.querySelector('.tracked-time');
const cardEl = document.querySelector('.card');
const totalEstimateEl = document.querySelector('.total-estimate');
const estimateEl = document.querySelector('.estimate');

setInterval(async () => {
    const totalTime = await getTotalSeconds(t);
    trackedTimeEl.innerHTML = formatTime(totalTime);
}, 1000 * 10);

startTimerBtn.addEventListener('click', () => {
    startTimer(t);
});

stopTimerBtn.addEventListener('click', () => {
    stopTimer(t);
});

estimateEl.addEventListener('click', (e) => {
    t.popup({
        mouseEvent: e,
        title: 'Change estimate',
        url: './change-estimate.html',
        height: 100
    })
});

t.render(async function() {
    const running = await isRunning(t);
    const totalTime = await getTotalSeconds(t);
    const ownEstimate = await getOwnEstimate(t);
    const totalEstimate = await getTotalEstimate(t);

    if (running) {
        startTimerBtn.style.display = 'none';
        stopTimerBtn.style.display = 'inline-block';
    } else {
        startTimerBtn.style.display = 'inline-block';
        stopTimerBtn.style.display = 'none';
    }

    estimateEl.innerText = formatTime(ownEstimate);
    estimateEl.style.display = 'block';

    if (ownEstimate !== totalEstimate) {
        totalEstimateEl.innerText = formatTime(totalEstimate);
        totalEstimateEl.style.display = 'block';
    } else {
        totalEstimateEl.style.display = 'none';
    }

    trackedTimeEl.innerHTML = formatTime(totalTime);
    cardEl.style.display = 'block';

    t.sizeTo('body');
});