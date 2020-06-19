require('../../sass/main.scss');

const { disableEstimateFeature, enableEstimateFeature, hasEstimateFeature } = require('../shared.js');
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

hasEstimateFeature(t).then((hasEstimateFeature) => {
    console.log('hasEstimateFeature 2:', hasEstimateFeature);
    if (!hasEstimateFeature) {
        disableEstimateEl.checked = true;
    }
});

t.render(async function() {
    t.sizeTo('.settings-wrapper');
});