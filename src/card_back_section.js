const { isRunning, getTotalSeconds, formatTime } = require('./shared.js');
const t = window.TrelloPowerUp.iframe();

t.render(async function() {
    const running = await isRunning(t);
    const totalTime = await getTotalSeconds(t);

    if (running) {
        document.querySelector('.btn-start-timer').style.display = 'none';
        document.querySelector('.btn-stop-timer').style.display = 'block';
    } else {
        document.querySelector('.btn-start-timer').style.display = 'block';
        document.querySelector('.btn-stop-timer').style.display = 'none';
    }

    document.querySelector('.tracked-time').innerHTML = formatTime(totalTime);

    document.querySelector('.card').style.display = 'block';

    t.sizeTo('body');
});