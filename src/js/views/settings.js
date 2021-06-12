require('../../sass/main.scss');
require('../sentry.js');
const {setAutoTimerListId} = require("../shared");

const {
    apiKey,
    appName,
    apiHost,
    disableEstimateFeature,
    enableEstimateFeature,
    hasEstimateFeature,
    hasAutoTimer,
    enableAutoTimer,
    disableAutoTimer,
    getAutoTimerListId,
    getThresholdForTrackings,
    setThresholdForTrackings,
    debounce
} = require('../shared.js');

const t = window.TrelloPowerUp.iframe({
    appKey: apiKey,
    appName: appName
});

const disableEstimateEl = document.getElementById('disable-estimate');
const thresholdForTrackingsEl = document.getElementById('threshold-for-trackings');
const thresholdForTrackingsSpanEl = document.querySelector('.threshold-for-trackings span');
const autoTimerListIdEl = document.querySelector('.auto-timer-list-id');
const autoTimerListIdSelectEl = document.getElementById('auto-timer-list-id');
const enableAutoTimerBtn = document.querySelector('.btn-enable-auto-timer');
const disableAutoTimerBtn = document.querySelector('.btn-disable-auto-timer');

const saveThreshold = debounce(function () {
    setThresholdForTrackings(t, parseInt(thresholdForTrackingsEl.value, 10));
}, 375);

thresholdForTrackingsEl.addEventListener('input', () => {
    thresholdForTrackingsSpanEl.innerText = `${thresholdForTrackingsEl.value} second(s)`;
    saveThreshold();
});

disableEstimateEl.addEventListener('change', () => {
    if (disableEstimateEl.checked) {
        disableEstimateFeature(t);
    } else {
        enableEstimateFeature(t);
    }
});

autoTimerListIdSelectEl.addEventListener('change', () => {
    setAutoTimerListId(t, autoTimerListIdSelectEl.value);
});

disableAutoTimerBtn.addEventListener('click', async () => {
    const token = await t.getRestApi().getToken();

    fetch(`https://api.trello.com/1/members/me/tokens?webhooks=true&key=${apiKey}&token=${token}`)
        .then(response => response.json())
        .then(async data => {
            if (data && data.length > 0) {
                const promises = [];

                data.forEach((item) => {
                    if (item.webhooks && item.webhooks.length > 0) {
                        item.webhooks.forEach((webhook) => {
                            promises.push(
                                fetch(`https://api.trello.com/1/webhooks/${webhook.id}?key=${apiKey}&token=${token}`, {
                                    method: 'DELETE'
                                })
                            );
                        });
                    }
                });

                await Promise.all(promises);
            }
        });

    await disableAutoTimer(t);
    renderAutoTimer(false);
});

enableAutoTimerBtn.addEventListener('click', async () => {
    await t.getRestApi().authorize({
        scope: 'read,write,account',
        expiration: 'never'
    });

    const token = await t.getRestApi().getToken();
    const board = await t.board('id');

    const formData = new FormData();
    formData.append('description', 'Activity timer - auto timer');
    formData.append('callbackURL', `https://${apiHost}/webhook?token=${token}&apiKey=${apiKey}`);
    formData.append('idModel', board.id);

    await fetch(`https://api.trello.com/1/tokens/${token}/webhooks/?key=${apiKey}`, {
        method: 'POST',
        body: formData,
    });

    await enableAutoTimer(t);
    renderAutoTimer(true);
});

hasEstimateFeature(t).then((hasEstimateFeature) => {
    if (!hasEstimateFeature) {
        disableEstimateEl.checked = true;
    }
});

/**
 * @param {boolean} setValue
 *
 * @returns {Promise<void>}
 */
async function renderThreshold (setValue) {
    const threshold = await getThresholdForTrackings(t);
    thresholdForTrackingsSpanEl.innerText = `${threshold} second(s)`;

    if (setValue) {
        thresholdForTrackingsEl.value = threshold;
    }
}

/**
 * @param {boolean} hasAutoTimerFeature
 */
function renderAutoTimer (hasAutoTimerFeature) {
    if (hasAutoTimerFeature) {
        enableAutoTimerBtn.style.display = 'none';
        disableAutoTimerBtn.style.display = 'block';
        autoTimerListIdEl.style.display = 'block';
    } else {
        enableAutoTimerBtn.style.display = 'block';
        disableAutoTimerBtn.style.display = 'none';
        autoTimerListIdEl.style.display = 'none';
    }
}

let firstRender = true;

hasAutoTimer(t).then(async (hasAutoTimerFeature) => {
    if (!hasAutoTimerFeature) {
        await t.getRestApi().clearToken();
    }
});

t.render(async function() {
    const hasAutoTimerFeature = await hasAutoTimer(t);
    renderAutoTimer(hasAutoTimerFeature);

    const listId = await getAutoTimerListId(t);
    const lists = await t.lists('all');

    autoTimerListIdSelectEl.innerHTML = '<option value="">None</option>' + lists.map((list) => {
        return `<option value="${list.id}">${list.name}</option>`;
    });

    if (listId) {
        autoTimerListIdSelectEl.value = listId;
    } else {
        autoTimerListIdSelectEl.value = '';
    }

    renderThreshold(firstRender);

    t.sizeTo('.settings-wrapper');

    firstRender = false;
});
