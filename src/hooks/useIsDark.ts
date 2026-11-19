import { useSyncExternalStore } from 'react'

const sub = (cb: () => void) => {
  const o = new MutationObserver(cb)
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => o.disconnect()
}

export function useIsDark() {
  return useSyncExternalStore(sub, () => document.documentElement.classList.contains('dark'), () => false)
}
