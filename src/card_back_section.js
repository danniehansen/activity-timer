const { isRunning, getTotalSeconds, formatTime, startTimer, stopTimer } = require('./shared.js');
const t = window.TrelloPowerUp.iframe();

setInterval(async () => {
    const totalTime = await getTotalSeconds(t);
    document.querySelector('.tracked-time').innerHTML = formatTime(totalTime);
}, 1000 * 10);

t.render(async function() {
    const running = await isRunning(t);
    const totalTime = await getTotalSeconds(t);

    if (running) {
        document.querySelector('.btn-start-timer').style.display = 'none';
        document.querySelector('.btn-stop-timer').style.display = 'inline-block';
    } else {
        document.querySelector('.btn-start-timer').style.display = 'inline-block';
        document.querySelector('.btn-stop-timer').style.display = 'none';
    }

    document.querySelector('.btn-start-timer').onclick = () => {
        startTimer(t);
    };

    document.querySelector('.btn-stop-timer').onclick = () => {
        stopTimer(t);
    };

    document.querySelector('.tracked-time').innerHTML = formatTime(totalTime);

    document.querySelector('.card').style.display = 'block';

    t.sizeTo('body');
});