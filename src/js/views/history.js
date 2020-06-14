require('../../sass/main.scss');

const t = window.TrelloPowerUp.iframe();

async function tokenHandler () {
    const token = await t.getRestApi().getToken();

    console.log('token:', token);
}

;(async () => {
    const isAuthorized = await t.getRestApi().isAuthorized();
    const authorizeEl = document.querySelector('.authorize');

    if (isAuthorized) {
        await tokenHandler();
    } else {
        authorizeEl.style.display = 'block';
        authorizeEl.addEventListener('click', async () => {
            if (!isAuthorized) {
                await t.getRestApi().authorize({
                    scope: 'read',
                    expiration: '30days'
                });

                await tokenHandler();
            }
        });
    }

    t.render(async () => {
        t.sizeTo('body');
    });
})();