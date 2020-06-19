require('../../sass/main.scss');

const { disableEstimateFeature, enableEstimateFeature } = require('../shared.js');
const t = window.TrelloPowerUp.iframe();

const saveSettingsBtn = document.querySelector('.btn-save-settings');
const disableEstimateEl = document.getElementById('disable-estimate');

saveSettingsBtn.addEventListener('click', async () => {
    if (disableEstimateEl.checked) {
        await disableEstimateFeature(t);
    } else {
        await enableEstimateFeature(t);
    }

    await t.closePopup();
});

(async () => {
    const disableEstimate = await t.get('board', 'shared', 'act-timer-disable-estimate');
})();

t.render(async function() {
    t.sizeTo('.settings-wrapper');
});