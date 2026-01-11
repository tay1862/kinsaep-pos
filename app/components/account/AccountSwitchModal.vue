<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
                <Icon name="i-heroicons-user-group" size="20" class="text-white" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ $t('account.switchAccount') }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('account.selectAccountDescription') }}
                </p>
              </div>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              size="sm"
              @click="isOpen = false"
            />
          </div>
        </template>

        <!-- Current Account -->
        <div class="mb-6">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {{ $t('account.currentAccount') }}
          </p>
          <div 
            class="flex items-center gap-4 p-4 rounded-xl bg-linear-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 border-2 border-primary-200 dark:border-primary-700"
          >
            <div class="w-12 h-12 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-primary-200 dark:ring-primary-700 shadow-md">
              <span v-if="currentAccount?.picture">
                <img :src="currentAccount.picture" alt="" class="w-12 h-12 rounded-full object-cover" />
              </span>
              <Icon v-else name="i-heroicons-user" size="24" class="text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 dark:text-white truncate">
                {{ currentAccount?.name || currentAccount?.display_name || $t('account.unnamed') }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                {{ formatPubkey(currentAccount?.pubkey) }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <Icon name="i-heroicons-check-circle" size="12" class="mr-1" />
                  {{ $t('account.active') }}
                </span>
                <span v-if="currentAccount?.verified" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  <Icon name="i-heroicons-check-badge" size="12" class="mr-1" />
                  {{ $t('account.verified') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Other Accounts -->
        <div v-if="otherAccounts.length > 0" class="mb-6">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {{ $t('account.otherAccounts') }}
          </p>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <button
              v-for="account in otherAccounts"
              :key="account.pubkey"
              class="flex items-center gap-4 w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
              @click="switchToAccount(account)"
            >
              <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span v-if="account.picture">
                  <img :src="account.picture" alt="" class="w-10 h-10 rounded-full object-cover" />
                </span>
                <Icon v-else name="i-heroicons-user" size="20" class="text-gray-500 dark:text-gray-400" />
              </div>
              <div class="flex-1 min-w-0 text-left">
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {{ account?.name || account.display_name || $t('account.unnamed') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                  {{ formatPubkey(account.pubkey) }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  icon="i-heroicons-trash"
                  variant="ghost"
                  color="error"
                  size="xs"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop="removeAccount(account.pubkey)"
                />
                <Icon 
                  name="i-heroicons-arrow-right-circle" 
                  size="20" 
                  class="text-gray-400 group-hover:text-primary-500 transition-colors" 
                />
              </div>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="mb-6 text-center py-8">
          <Icon name="i-heroicons-user-plus" size="48" class="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p class="text-gray-500 dark:text-gray-400">
            {{ $t('account.noOtherAccounts') }}
          </p>
        </div>

        <template #footer>
          <div class="flex gap-3">
            <UButton
              icon="i-heroicons-plus-circle"
              variant="outline"
              class="flex-1"
              block
              @click="addNewAccount"
            >
              {{ $t('account.addAccount') }}
            </UButton>
            <UButton
              icon="i-heroicons-key"
              variant="soft"
              class="flex-1"
              block
              @click="importWithNsec"
            >
              {{ $t('account.importNsec') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <!-- Import nsec Modal -->
  <UModal v-model:open="showImportModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Icon name="i-heroicons-key" size="20" class="text-white" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ $t('account.importAccount') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t('account.importDescription') }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField :label="$t('account.nsecLabel')">
            <UTextarea
              v-model="importNsec"
              :placeholder="$t('account.nsecPlaceholder')"
              :rows="3"
              class="font-mono text-sm w-full"
            />
          </UFormField>
          
          <div class="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div class="flex gap-2">
              <Icon name="i-heroicons-exclamation-triangle" size="20" class="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p class="text-sm text-amber-800 dark:text-amber-200">
                {{ $t('account.nsecWarning') }}
              </p>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex gap-3 justify-end">
            <UButton
              variant="ghost"
              @click="showImportModal = false"
            >
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              icon="i-heroicons-arrow-down-tray"
              :loading="isImporting"
              :disabled="!importNsec.trim()"
              @click="handleImport"
            >
              {{ $t('account.import') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UserInfo } from '~/types'

const emit = defineEmits<{
  (e: 'switched', pubkey: string): void
  (e: 'close'): void
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const nostrStorage = useNostrStorage()
const nostrUser = useNostrUser()
const toast = useToast()

// Users composable for syncing Nostr owner to staff system
const { syncNostrOwner } = useUsers()

// State
const showImportModal = ref(false)
const importNsec = ref('')
const isImporting = ref(false)
const allAccounts = ref<UserInfo[]>([])
const currentPubkey = ref<string>('')

// Load accounts on mount
onMounted(() => {
  loadAccounts()
})

// Watch for modal open to refresh accounts
watch(isOpen, (value) => {
  if (value) {
    loadAccounts()
  }
})

const loadAccounts = () => {
  allAccounts.value = nostrStorage.loadAllAccounts()
  const { userInfo } = nostrStorage.loadCurrentUser()
  if (userInfo?.pubkey) {
    currentPubkey.value = userInfo.pubkey
  }
}

// Computed
const currentAccount = computed(() => {
  return allAccounts.value.find(acc => acc.pubkey === currentPubkey.value)
})

const otherAccounts = computed(() => {
  return allAccounts.value.filter(acc => acc.pubkey !== currentPubkey.value)
})

// Methods
const formatPubkey = (pubkey?: string) => {
  if (!pubkey) return '...'
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`
}

const switchToAccount = async (account: UserInfo) => {
  if (!account.userKeys) {
    toast.add({
      title: t('account.switchError'),
      description: t('account.noKeysError'),
      color: 'error'
    })
    return
  }

  // Save as current user
  nostrStorage.saveUser({
    pubkey: account.pubkey,
    displayName: account.displayName,
    name: account.name,
    userKeys: account.userKeys,
    picture: account.picture,
    nip05: account.nip05,
  })

  // Set nostr-pubkey cookie for middleware and staff user sync
  const nostrCookie = useCookie('nostr-pubkey', { maxAge: 60 * 60 * 24 * 30 }) // 30 days
  nostrCookie.value = account.pubkey

  currentPubkey.value = account.pubkey
  
  // Sync with staff user system (bitspace_current_user)
  await syncNostrOwner()
  
  toast.add({
    title: t('account.switched'),
    description: t('account.switchedTo', { name: account.displayName || account.name || formatPubkey(account.pubkey) }),
    color: 'success'
  })

  emit('switched', account.pubkey)
  isOpen.value = false

  // Reload to refresh all data
  window.location.reload()
}

const removeAccount = (pubkey: string) => {
  nostrStorage.removeAccount(pubkey)
  loadAccounts()
  
  toast.add({
    title: t('account.removed'),
    description: t('account.accountRemoved'),
    color: 'info'
  })
}

const addNewAccount = () => {
  isOpen.value = false
  navigateTo('/auth/signin')
}

const importWithNsec = () => {
  showImportModal.value = true
}

const handleImport = async () => {
  if (!importNsec.value.trim()) return
  
  isImporting.value = true
  
  try {
    const success = await nostrUser.setupUser(importNsec.value.trim())
    
    if (success) {
      // Get the pubkey of the imported account
      const { userInfo } = nostrStorage.loadCurrentUser()
      
      // Set nostr-pubkey cookie for middleware and staff user sync
      if (userInfo?.pubkey) {
        const nostrCookie = useCookie('nostr-pubkey', { maxAge: 60 * 60 * 24 * 30 }) // 30 days
        nostrCookie.value = userInfo.pubkey
        
        // Sync with staff user system (bitspace_current_user)
        await syncNostrOwner()
      }
      
      toast.add({
        title: t('account.imported'),
        description: t('account.importSuccess'),
        color: 'success'
      })
      
      showImportModal.value = false
      importNsec.value = ''
      loadAccounts()
      
      // Reload to use new account
      window.location.reload()
    } else {
      toast.add({
        title: t('account.importError'),
        description: t('account.invalidNsec'),
        color: 'error'
      })
    }
  } catch (error) {
    toast.add({
      title: t('account.importError'),
      description: error instanceof Error ? error.message : t('account.importFailed'),
      color: 'error'
    })
  } finally {
    isImporting.value = false
  }
}
</script>
