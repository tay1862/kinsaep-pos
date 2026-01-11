import type { ChatSettings } from './use-shop'

const CACHE_KEY = 'chat-settings-cache'

const defaultSettings: ChatSettings = {
  enabled: false
}

const chatSettings = useState<ChatSettings>('chat-settings', () => ({ ...defaultSettings }))
const isLoaded = useState('chat-settings-loaded', () => false)

export const useChatSettings = () => {
  const shop = useShop()

  /**
   * Load from localStorage cache (for offline support)
   */
  const loadFromCache = (): ChatSettings | null => {
    if (!import.meta.client) return null
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (e) {
      // Failed to load from cache
    }
    return null
  }

  /**
   * Save to localStorage cache (for offline support)
   */
  const saveToCache = (settings: ChatSettings): void => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(settings))
    } catch (e) {
      // Failed to save to cache
    }
  }

  const loadSettings = async () => {
    if (!isLoaded.value) {
      // 1. First, load from local cache immediately (for offline/fast startup)
      const cached = loadFromCache()
      if (cached) {
        chatSettings.value = { ...defaultSettings, ...cached }
      }

      // 2. Then try to load from Nostr (will use fresh data if online)
      try {
        await shop.init()
        if (shop.shopConfig.value?.chatSettings) {
          const remoteSettings = { ...defaultSettings, ...shop.shopConfig.value.chatSettings }
          chatSettings.value = remoteSettings
          // Update cache with latest from Nostr
          saveToCache(remoteSettings)
        }
      } catch (e) {
        // Failed to load from Nostr, using cache
        // Cache is already loaded above, so we're good for offline
      }

      isLoaded.value = true
    }
  }

  const saveSettings = async (settings: Partial<ChatSettings>) => {
    const newSettings = { ...chatSettings.value, ...settings }
    chatSettings.value = newSettings

    // Always save to local cache first (for offline support)
    saveToCache(newSettings)

    // Then sync to Nostr (may fail if offline)
    try {
      await shop.saveShopConfig({ chatSettings: newSettings })
    } catch (e) {
      // Failed to sync to Nostr (offline?)
      // Settings are still saved locally, will sync when online
    }
  }

  const toggleChat = async () => {
    await saveSettings({ enabled: !chatSettings.value.enabled })
  }

  const resetSettings = async () => {
    chatSettings.value = { ...defaultSettings }
    saveToCache(defaultSettings)
    await shop.saveShopConfig({ chatSettings: defaultSettings })
  }

  // Auto-load on first use
  if (import.meta.client && !isLoaded.value) {
    onMounted(async () => {
      await loadSettings()
    })
  }

  return {
    settings: chatSettings,
    saveSettings,
    toggleChat,
    resetSettings,
    loadSettings
  }
}
