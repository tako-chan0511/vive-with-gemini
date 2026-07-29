import DefaultTheme from 'vitepress/theme'
// import Mermaid from './components/Mermaid.vue'
import type { Theme } from 'vitepress'
import PresenterLayout from './components/PresenterLayout.vue'
import PresenterStop from './components/PresenterStop.vue'
import './custom.css'

const theme: Theme = {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // app.component('Mermaid', Mermaid)
    app.component('PresenterStop', PresenterStop)
  },
  Layout: PresenterLayout,
}

export default theme
