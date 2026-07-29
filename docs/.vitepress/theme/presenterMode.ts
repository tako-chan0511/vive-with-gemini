import { readonly, ref } from 'vue'

const STORAGE_KEY = 'vive-with-gemini-presenter-mode'
const presenterMode = ref(false)

export function syncPresenterMode() {
  if (typeof window === 'undefined') return

  const presenter = new URLSearchParams(window.location.search).get('presenter')

  try {
    if (presenter === '1') {
      window.sessionStorage.setItem(STORAGE_KEY, '1')
    } else if (presenter === '0') {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }

    presenterMode.value = window.sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // sessionStorageが利用できない環境でも、明示したURLでは表示を切り替える。
    presenterMode.value = presenter === '1'
  }
}

export function usePresenterMode() {
  return readonly(presenterMode)
}
