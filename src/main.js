import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import App from './App.vue'

// Import legacy global styles initially
import '../styles.css'
import '../styles.tailwind.css'

const app = createApp(App)
app.use(PrimeVue, { unstyled: true })
app.mount('#app')

// Bridge the legacy vanilla JS islands to mount onto the new SFC DOM
setTimeout(() => {
    import('../js/main.js').catch(err => console.error("Legacy logic mount failed:", err))
}, 100)
