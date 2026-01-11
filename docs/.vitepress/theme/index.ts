import DefaultTheme from 'vitepress/theme'
// import Mermaid from './components/Mermaid.vue'
import type { Theme } from 'vitepress'
import './custom.css'

const theme: Theme = {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // app.component('Mermaid', Mermaid)
  },
}

export default theme

