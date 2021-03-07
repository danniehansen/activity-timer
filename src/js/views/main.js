require('../sentry.js');

const { cardBadges, cardButtons, cardBackSection, boardButtons, showSettings } = require('../shared.js');

// Sometimes window.TrelloPowerUp isn't available.
// I suppose it can be due to network errors. But
// adding this check to avoid undefined sentry logs.
if (typeof window.TrelloPowerUp !== 'undefined') {
    window.TrelloPowerUp.initialize({
        'card-badges': cardBadges,
        'card-buttons': cardButtons,
        'card-back-section': cardBackSection,
        'board-buttons': boardButtons,
        'show-settings': showSettings
    });
}
