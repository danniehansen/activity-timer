require('../../sass/main.scss');

const {
    isRunning, getTotalSeconds, formatTime,
    startTimer, stopTimer, getOwnEstimate,
    getTotalEstimate, getEstimates
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
        url: './change_estimate.html',
        height: 120
    })
});

totalEstimateEl.addEventListener('click', (e) => {
    t.popup({
        mouseEvent: e,
        title: 'Estimates',
        items: async function (t) {
            const items = [];
            const estimates = await getEstimates(t);
            let board = await t.board('members');

            board.members.sort((a, b) => {
                const nameA = a.fullName.toUpperCase();
                const nameB = b.fullName.toUpperCase();

                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }

                return 0;
            }).forEach((member, memberIndex) => {
                const memberEstimates = estimates.filter((estimate) => {
                    return estimate[0] == member.id;
                });

                let memberEstimate = 0;

                memberEstimates.forEach((estimate) => {
                    memberEstimate += estimate[1];
                });

                if (memberEstimate > 0) {
                    items.push({
                        'text': member.fullName + (member.fullName != member.username ? ' (' + member.username + ')' : '') + ': ' + formatTime(memberEstimate)
                    });
                }
            });

            return items;
        }
    });
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

    console.log('ownEstimate:', ownEstimate);
    console.log('totalEstimate:', totalEstimate);

    estimateEl.innerHTML = formatTime(ownEstimate);
    estimateEl.style.display = 'block';

    if (ownEstimate !== totalEstimate) {
        totalEstimateEl.innerHTML = formatTime(totalEstimate);
        totalEstimateEl.style.display = 'block';
    } else {
        totalEstimateEl.style.display = 'none';
    }

    trackedTimeEl.innerHTML = formatTime(totalTime);
    cardEl.style.display = 'block';

    t.sizeTo('body');
});