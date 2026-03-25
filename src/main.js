import * as Vue from 'vue'
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import RadioButton from 'primevue/radiobutton'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import DataView from 'primevue/dataview'
import App from './App.vue'

globalThis.Vue = Vue;
globalThis.PrimeVue = {
    Config: PrimeVue,
    Button,
    RadioButton,
    InputText,
    Select,
    DatePicker,
    Dialog,
    DataView
};

// Import legacy global styles initially
import '../styles.css'
import '../styles.tailwind.css'

const app = Vue.createApp(App)
app.use(PrimeVue, { unstyled: true })
app.mount('#app')

// Bridge the legacy vanilla JS islands onto the mounted SFC DOM without an extra boot delay.
import('../js/main.js').catch(err => console.error("Legacy logic mount failed:", err))
