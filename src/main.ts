import { createApp } from 'vue';
import Router from './Router.vue';
import { Trello } from './types/trello';
import { getBoardButtons } from './capabilities/board-buttons';
import { getCardBackSection } from './capabilities/card-back-section';
import { getCardBadges } from './capabilities/card-badges';
import { getCardButtons } from './capabilities/card-buttons';
import { getShowSettings } from './capabilities/show-settings';
import { resizeTrelloFrame, setTrelloInstance } from './trello';
import { getAppKey, getAppName } from './components/settings';
import { initializeWebsocket } from './websocket';

if (window.location.hash) {
  const t = window.TrelloPowerUp.iframe({
    appKey: getAppKey(),
    appName: getAppName()
  });

  setTrelloInstance(t);

  setInterval(resizeTrelloFrame, 500);
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

createApp(Router).mount('#app');
