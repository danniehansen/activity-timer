require('../../sass/main.scss');

const { apiKey, appName } = require('../shared.js');

const t = window.TrelloPowerUp.iframe({
    appKey: apiKey,
    appName: appName
});

let dataCache = null;

function Range (data) {
    this.memberId = data[0];
    this.startTime = data[1];
    this.endTime = data[2];
}

function Card (data) {
    this.id = data.id;
    this.ranges = [];

    if (typeof data.pluginData !== 'undefined') {
        data.pluginData.forEach((pluginData) => {
            if (pluginData.scope === 'card' && pluginData.access === 'shared') {
                pluginData.value = JSON.parse(pluginData.value);

                if (
                    typeof pluginData.value['act-timer-ranges'] !== 'undefined' &&
                    pluginData.value['act-timer-ranges'].length > 0
                ) {
                    pluginData.value['act-timer-ranges'].forEach((range) => {
                        this.ranges.push(new Range(range));
                    });
                }
            }
        });
    }
}

async function fetchData () {
    if (dataCache == null) {
        const token = await t.getRestApi().getToken();
        const board = await t.board('id');

        const data = await fetch('https://api.trello.com/1/boards/' + board.id + '/cards/all?pluginData=true&fields=id,labels,pluginData,closed&key=' + apiKey + '&token=' + token);
        const json = await data.json();

        dataCache = json.map((item) => {
            return new Card(item);
        });
    }

    return dataCache;
}

async function tokenHandler () {
    document.querySelector('.wrapper').style.display = 'block';

    const processedData = await fetchData();

    console.log('processedData:', processedData);
}

;(async () => {
    const isAuthorized = await t.getRestApi().isAuthorized();
    const authorizeEl = document.querySelector('.authorize');
    const authorizeBtnEl = document.querySelector('.authorize-btn');

    if (isAuthorized) {
        await tokenHandler();
    } else {
        authorizeEl.style.display = 'block';
        authorizeBtnEl.addEventListener('click', async () => {
            if (!isAuthorized) {
                await t.getRestApi().authorize({
                    scope: 'read',
                    expiration: '30days'
                });

                authorizeEl.style.display = 'block';

                await tokenHandler();
            }
        });
    }

    t.render(async () => {
        t.sizeTo('body');
    });
})();