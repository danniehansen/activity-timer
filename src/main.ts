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
import { initializeOptro } from './components/optro';
import * as Sentry from '@sentry/vue';
import { Integrations } from '@sentry/tracing';

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

initializeOptro();

const app = createApp(Router);

if (typeof import.meta.env.VITE_SENTRY_DSN === 'string' && typeof import.meta.env.VITE_APP_ORIGIN === 'string') {
  console.log('import.meta.env.VITE_SENTRY_DSN:', import.meta.env.VITE_SENTRY_DSN);
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new Integrations.BrowserTracing({
        tracingOrigins: ['localhost', import.meta.env.VITE_APP_ORIGIN, /^\//]
      })
    ],
    tracesSampleRate: 0.01
  });
}

app.mount('#app');