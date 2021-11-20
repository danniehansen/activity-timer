import { createApp } from 'vue';
import Router from './Router.vue';
import { Trello } from './types/trello';
import { getBoardButtons } from './capabilities/board-buttons';
import { getCardBackSection } from './capabilities/card-back-section';
import { getCardBadges } from './capabilities/card-badges';
import { getCardButtons } from './capabilities/card-buttons';
import { getShowSettings } from './capabilities/show-settings';
import { resizeTrelloFrame, setTrelloInstance } from './trello';

let t: Trello.PowerUp.Plugin | Trello.PowerUp.IFrame | null = null;

if (window.location.hash) {
  t = window.TrelloPowerUp.iframe();
} else {
  t = window.TrelloPowerUp.initialize({
    'card-badges': getCardBadges,
    'card-buttons': getCardButtons,
    'card-back-section': getCardBackSection,
    'board-buttons': getBoardButtons,
    'show-settings': getShowSettings
  });
}

if (t) {
  setTrelloInstance(t);
}

createApp(Router).mount('#app');

setInterval(resizeTrelloFrame, 500);
