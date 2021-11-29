import { createApp } from 'vue';
import Router from './Router.vue';
import { getBoardButtons } from './capabilities/board-buttons';
import { getCardBackSection } from './capabilities/card-back-section';
import { getCardBadges } from './capabilities/card-badges';
import { getCardButtons } from './capabilities/card-buttons';
import { getShowSettings } from './capabilities/show-settings';
import { setTrelloInstance } from './components/trello';
import { getAppKey, getAppName } from './components/settings';
import { initializeWebsocket } from './components/websocket';

if (window.location.hash) {
  try {
    const t = window.TrelloPowerUp.iframe({
      appKey: getAppKey(),
      appName: getAppName()
    });

    setTrelloInstance(t);
  } catch (e) {
    // When app key / app name is provided.
    // Then it requires access to localStorage which
    // isn't available in incognito.
    const t = window.TrelloPowerUp.iframe();

    setTrelloInstance(t);
  }
} else {
  const t = window.TrelloPowerUp.initialize({
    'card-badges': getCardBadges,
    'card-buttons': getCardButtons,
    'card-back-section': getCardBackSection,
    'board-buttons': getBoardButtons,
    'show-settings': getShowSettings
  });

  setTrelloInstance(t);

  initializeWebsocket();
}

createApp(Router)
  .mount('#app');