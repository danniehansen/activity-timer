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

// Primevue
import PrimeVue from 'primevue/config';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import ColumnGroup from 'primevue/columngroup';
import Slider from 'primevue/slider';
import Row from 'primevue/row';

// Styling
import './scss/base.scss';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import 'primevue/resources/themes/bootstrap4-dark-blue/theme.css';

let incognito = false;

try {
  window.localStorage.getItem('incognito-test');
} catch (e) {
  incognito = true;
}

if (window.location.hash) {
  const t = window.TrelloPowerUp.iframe(
    !incognito
      ? {
          appKey: getAppKey(),
          appName: getAppName()
        }
      : undefined
  );

  setTrelloInstance(t);
} else {
  const t = window.TrelloPowerUp.initialize(
    {
      'card-badges': getCardBadges,
      'card-buttons': getCardButtons,
      'card-back-section': getCardBackSection,
      'board-buttons': getBoardButtons,
      'show-settings': getShowSettings
    },
    !incognito
      ? {
          appKey: getAppKey(),
          appName: getAppName()
        }
      : undefined
  );

  setTrelloInstance(t);
  initializeWebsocket();
}

initializeOptro();

const app = createApp(Router);

app.use(PrimeVue);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('Dropdown', Dropdown);
app.component('MultiSelect', MultiSelect);
app.component('Checkbox', Checkbox);
app.component('InputText', InputText);
app.component('InputNumber', InputNumber);
app.component('ColumnGroup', ColumnGroup);
app.component('Slider', Slider);
app.component('Row', Row);

// eslint-disable-next-line vue/no-reserved-component-names
app.component('Button', Button);

if (
  typeof import.meta.env.VITE_SENTRY_DSN === 'string' &&
  typeof import.meta.env.VITE_APP_ORIGIN === 'string'
) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new Integrations.BrowserTracing({
        tracingOrigins: ['localhost', import.meta.env.VITE_APP_ORIGIN, /^\//]
      })
    ],
    tracesSampleRate: 0.0
  });
}

app.mount('#app');
