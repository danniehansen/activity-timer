require('../../sass/main.scss');

const { apiKey, appName } = require('../shared.js');

const t = window.TrelloPowerUp.iframe({
    appKey: apiKey,
    appName: appName
});

async function tokenHandler () {
    const token = await t.getRestApi().getToken();

    document.querySelector('.wrapper').style.display = 'block';

    const board = await t.board('id');

    const data = await fetch('https://api.trello.com/1/boards/' + board.id + '/cards/all?key=' + apiKey + '&token=' + token);
    const json = await data.json();

    console.log('json:', json);
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