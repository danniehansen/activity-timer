const { cardBadges, cardButtons, cardBackSection, boardButtons, showSettings } = require('../shared.js');

window.TrelloPowerUp.initialize({
    'card-badges': cardBadges,
    'card-buttons': cardButtons,
    'card-back-section': cardBackSection,
    'board-buttons': boardButtons,
    'show-settings': showSettings
});