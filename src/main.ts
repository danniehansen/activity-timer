import { createApp } from 'vue';
import Router from './Router.vue';
import { getBoardButtons } from './capabilities/board-buttons';
import { getCardBackSection } from './capabilities/card-back-section';
import { getCardBadges } from './capabilities/card-badges';
import { getShowSettings } from './capabilities/show-settings';
import { setTrelloInstance } from './components/trello';
import { getAppKey, getAppName } from './components/settings';
import { initializeWebsocket } from './components/websocket';

// Primevue
import PrimeVue from 'primevue/config';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import InputNumber from 'primevue/inputnumber';
import ColumnGroup from 'primevue/columngroup';
import Slider from 'primevue/slider';
import Row from 'primevue/row';
import InputSwitch from 'primevue/inputswitch';
import Divider from 'primevue/divider';

// Styling
import './scss/base.scss';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

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
app.component('Message', Message);
app.component('Row', Row);
app.component('InputSwitch', InputSwitch);
app.component('Divider', Divider);

// eslint-disable-next-line vue/no-reserved-component-names
app.component('Button', Button);

app.mount('#app');
