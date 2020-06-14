const { cardBadges, cardButtons, cardBackSection, boardButtons, apiKey, appName } = require('../shared.js');

window.TrelloPowerUp.initialize({
    'card-badges': cardBadges,
    'card-buttons': cardButtons,
    'card-back-section': cardBackSection,
    'board-buttons': boardButtons
}, {
    appKey: apiKey,
    appName: appName
});