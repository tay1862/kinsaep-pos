<template>
  <div class="space-y-6 w-full flex max-w-3xl mx-auto flex-col">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ $t("settings.general.title") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          {{ $t("settings.general.description") }}
        </p>
      </div>
      <UButton
        :label="$t('common.save')"
        icon="i-heroicons-check"
        size="lg"
        :loading="saving"
        @click="saveSettings"
      />
    </div>

    <!-- Skeleton Loading State -->
    <template v-if="isLoading">
      <!-- Tabs skeleton -->
      <div
        class="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3"
      >
        <USkeleton v-for="i in 4" :key="i" class="h-9 w-24 rounded-lg" />
      </div>

      <!-- Form skeleton -->
      <div
        class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 mt-4"
      >
        <!-- Section header -->
        <USkeleton class="h-6 w-40 mb-4" />

        <!-- Form fields grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="i in 4" :key="i" class="space-y-2">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-10 w-full" />
          </div>
        </div>

        <!-- Second section -->
        <USkeleton class="h-6 w-36 mt-8 mb-4" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="i in 4" :key="i" class="space-y-2">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-10 w-full" />
          </div>
        </div>
      </div>
    </template>

    <!-- Actual Content (when loaded) -->
    <template v-else>
      <!-- Settings Form -->
      <UForm
        ref="formRef"
        :schema="schema"
        :state="state"
        class="w-full"
        @submit="onSubmit"
      >
        <UTabs v-model="activeTab" :items="tabs" class="w-full">
          <!-- General Tab -->
          <template #general="{ item }">
            <UCard class="mt-4">
              <div class="space-y-6">
                <!-- Company Information -->
                <div>
                  <h3 class="text-lg font-semibold mb-4">
                    {{ $t("settings.general.company_info") }}
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField
                      :label="$t('settings.general.company_name')"
                      name="companyName"
                      required
                    >
                      <UInput
                        v-model="state.companyName"
                        :placeholder="
                          $t('settings.general.company_name_placeholder')
                        "
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.general.company_email')"
                      name="companyEmail"
                      required
                    >
                      <UInput
                        v-model="state.companyEmail"
                        type="email"
                        :placeholder="
                          $t('settings.general.company_email_placeholder')
                        "
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.general.company_phone')"
                      name="companyPhone"
                    >
                      <UInput
                        v-model="state.companyPhone"
                        :placeholder="
                          $t('settings.general.company_phone_placeholder')
                        "
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.general.tax_number')"
                      name="taxNumber"
                    >
                      <UInput
                        v-model="state.taxNumber"
                        :placeholder="
                          $t('settings.general.tax_number_placeholder')
                        "
                        class="w-full"
                      />
                    </UFormField>
                  </div>

                  <UFormField
                    :label="$t('settings.general.company_address')"
                    name="companyAddress"
                    class="mt-4"
                  >
                    <UTextarea
                      v-model="state.companyAddress"
                      :placeholder="
                        $t('settings.general.company_address_placeholder')
                      "
                      class="w-full"
                      :rows="3"
                    />
                  </UFormField>
                </div>

                <!-- System Settings -->
                <div>
                  <h3 class="text-lg font-semibold mb-4">
                    {{ $t("settings.general.system_settings") }}
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField
                      :label="$t('settings.general.default_currency')"
                      name="defaultCurrency"
                      required
                      :description="
                        $t('settings.general.currency_description') ||
                        'Supports 100+ currencies including crypto'
                      "
                    >
                      <USelectMenu
                        v-model="state.defaultCurrency"
                        :items="currencies.all"
                        value-key="code"
                        label-key="name"
                        :placeholder="
                          $t(
                            'settings.general.select_currency',
                            'Select currency...'
                          )
                        "
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.general.default_language')"
                      name="defaultLanguage"
                      required
                    >
                      <USelect
                        v-model="state.defaultLanguage"
                        :items="languages"
                        label-key="name"
                        value-key="code"
                        @update:model-value="onLanguageChange"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.general.date_format')"
                      name="dateFormat"
                    >
                      <USelect
                        v-model="state.dateFormat"
                        :items="dateFormats"
                        label-key="name"
                        value-key="value"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.general.time_format')"
                      name="timeFormat"
                    >
                      <USelect
                        v-model="state.timeFormat"
                        :items="timeFormats"
                        label-key="name"
                        value-key="value"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.general.timezone')"
                      name="timezone"
                    >
                      <USelectMenu
                        v-model="state.timezone"
                        :items="timezones"
                        label-key="label"
                        value-key="value"
                        searchable
                        :placeholder="
                          $t(
                            'settings.general.select_timezone',
                            'Select timezone'
                          )
                        "
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.general.decimal_places')"
                      name="decimalPlaces"
                    >
                      <USelect
                        v-model="state.decimalPlaces"
                        :items="decimalOptions"
                        label-key="name"
                        value-key="value"
                      />
                    </UFormField>
                  </div>
                </div>

                <!-- Shop Tags & Analytics -->
                <div>
                  <h3 class="text-lg font-semibold mb-4">
                    {{
                      $t("settings.general.shop_tags", "Shop Tags & Analytics")
                    }}
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {{
                      $t(
                        "settings.general.shop_tags_desc",
                        "Add tags to categorize your shop and help with analytics."
                      )
                    }}
                  </p>

                  <div class="space-y-4">
                    <!-- Tags Input -->
                    <UFormField
                      :label="$t('settings.general.tags', 'Tags')"
                      name="tags"
                    >
                      <div class="space-y-2">
                        <div class="flex flex-wrap gap-2 mb-2">
                          <UBadge
                            v-for="(tag, index) in state.tags"
                            :key="index"
                            color="primary"
                            variant="subtle"
                            class="cursor-pointer"
                            @click="removeTag(index)"
                          >
                            {{ tag }}
                            <UIcon
                              name="i-heroicons-x-mark"
                              class="w-3 h-3 ml-1"
                            />
                          </UBadge>
                        </div>
                        <div class="flex gap-2">
                          <UInput
                            v-model="newTag"
                            :placeholder="
                              $t(
                                'settings.general.tag_placeholder',
                                'e.g. coffee, thai-food, retail'
                              )
                            "
                            class="flex-1"
                            @keyup.enter="addTag"
                          />
                          <UButton
                            icon="i-heroicons-plus"
                            :disabled="!newTag.trim()"
                            @click="addTag"
                          />
                        </div>
                      </div>
                      <template #hint>
                        <span class="text-xs text-gray-500">
                          {{
                            $t(
                              "settings.general.tags_hint",
                              "Press Enter or click + to add tags"
                            )
                          }}
                        </span>
                      </template>
                    </UFormField>

                    <!-- Platform Tag (Read-only) -->
                    <UFormField
                      :label="$t('settings.general.platform_tag', 'Platform')"
                      name="platformTag"
                    >
                      <div class="flex items-center gap-2">
                        <UBadge color="amber" variant="solid" size="lg">
                          <UIcon name="i-heroicons-bolt" class="w-4 h-4 mr-1" />
                          {{ state.platformTag }}
                        </UBadge>
                        <span class="text-xs text-gray-500">
                          {{
                            $t(
                              "settings.general.platform_tag_hint",
                              "Powered by bnos.space"
                            )
                          }}
                        </span>
                      </div>
                    </UFormField>
                  </div>
                </div>
              </div>
            </UCard>
          </template>

          <!-- Branches Tab -->
          <template #branches="{ item }">
            <UCard class="mt-4">
              <div class="space-y-6">
                <!-- Branch Management Header -->
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold">
                    {{ $t("settings.branches.title") }}
                  </h3>
                  <UButton
                    :label="$t('common.add')"
                    icon="i-heroicons-plus"
                    @click="openBranchModal"
                  />
                </div>

                <!-- Branches Table -->
                <div v-if="loadingBranches" class="text-center py-8">
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-6 h-6 animate-spin text-gray-400"
                  />
                  <p class="mt-2 text-gray-500">{{ $t("common.loading") }}</p>
                </div>

                <div v-else-if="branches.length === 0" class="text-center py-8">
                  <UIcon
                    name="i-heroicons-building-storefront"
                    class="w-12 h-12 text-gray-300 mx-auto"
                  />
                  <p class="mt-2 text-gray-500">
                    {{ $t("settings.branches.noBranches", "No branches yet") }}
                  </p>
                  <p class="text-sm text-gray-400">
                    {{
                      $t(
                        "settings.branches.addFirst",
                        "Add your first branch to get started"
                      )
                    }}
                  </p>
                </div>

                <div v-else class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="border-b border-gray-200 dark:border-gray-700">
                        <th
                          class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                        >
                          {{ $t("settings.branches.name") }}
                        </th>
                        <th
                          class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                        >
                          {{ $t("settings.branches.code") }}
                        </th>
                        <th
                          class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                        >
                          {{ $t("settings.branches.address", "Address") }}
                        </th>
                        <th
                          class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                        >
                          {{ $t("common.actions") }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(branch, index) in branches"
                        :key="branch.id ?? index"
                        class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td class="py-3 px-4">
                          <div>
                            <p
                              class="font-medium text-gray-900 dark:text-white"
                            >
                              {{ branch.name }}
                            </p>
                          </div>
                        </td>
                        <td class="py-3 px-4">
                          <UBadge color="gray" variant="soft">
                            {{ branch.code }}
                          </UBadge>
                        </td>
                        <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                          {{ branch.address || "-" }}
                        </td>
                        <td class="py-3 px-4">
                          <div class="flex space-x-2">
                            <UButton
                              icon="i-heroicons-pencil-square"
                              size="sm"
                              variant="ghost"
                              @click="editBranch(branch)"
                            />
                            <UButton
                              icon="i-heroicons-trash"
                              size="sm"
                              variant="ghost"
                              color="red"
                              @click="branch.id && deleteBranch(branch.id)"
                            />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </UCard>
          </template>

          <!-- Security Tab -->
          <template #security="{ item }">
            <UCard class="mt-4">
              <div class="space-y-6">
                <!-- Password Policy -->
                <div>
                  <h3 class="text-lg font-semibold mb-4">
                    {{ $t("settings.security.password_policy") }}
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField
                      :label="$t('settings.security.min_password_length')"
                      name="minPasswordLength"
                    >
                      <UInput
                        v-model="state.minPasswordLength"
                        type="number"
                        min="6"
                        max="20"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.security.password_expiry_days')"
                      name="passwordExpiryDays"
                    >
                      <UInput
                        v-model="state.passwordExpiryDays"
                        type="number"
                        min="0"
                        max="365"
                      />
                    </UFormField>
                  </div>

                  <div class="mt-4 space-y-3">
                    <UCheckbox
                      v-model="state.requireUppercase"
                      :label="$t('settings.security.require_uppercase')"
                    />
                    <UCheckbox
                      v-model="state.requireNumbers"
                      :label="$t('settings.security.require_numbers')"
                    />
                    <UCheckbox
                      v-model="state.requireSpecialChars"
                      :label="$t('settings.security.require_special_chars')"
                    />
                  </div>
                </div>

                <!-- Session Settings -->
                <div>
                  <h3 class="text-lg font-semibold mb-4">
                    {{ $t("settings.security.session_settings") }}
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField
                      :label="$t('settings.security.session_timeout')"
                      name="sessionTimeout"
                    >
                      <USelect
                        v-model="state.sessionTimeout"
                        :items="sessionTimeouts"
                        label-key="name"
                        value-key="value"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('settings.security.max_login_attempts')"
                      name="maxLoginAttempts"
                    >
                      <UInput
                        v-model="state.maxLoginAttempts"
                        type="number"
                        min="3"
                        max="10"
                      />
                    </UFormField>
                  </div>

                  <div class="mt-4">
                    <UCheckbox
                      v-model="state.enableTwoFactor"
                      :label="$t('settings.security.enable_two_factor')"
                    />
                  </div>
                </div>

                <!-- Data Encryption -->
                <div>
                  <h3 class="text-lg font-semibold mb-4">
                    {{ $t("settings.security.dataEncryption") }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {{ $t("settings.security.dataEncryptionDesc") }}
                  </p>

                  <div
                    v-if="!security.isEncryptionEnabled.value"
                    class="space-y-4"
                  >
                    <UFormField
                      :label="$t('settings.security.setupMasterPassword')"
                    >
                      <UInput
                        v-model="masterPassword"
                        type="password"
                        :placeholder="
                          $t('settings.security.masterPasswordHint')
                        "
                      />
                    </UFormField>
                    <UFormField
                      :label="$t('settings.security.confirmPassword')"
                    >
                      <UInput
                        v-model="confirmMasterPassword"
                        type="password"
                        :placeholder="
                          $t('settings.security.confirmPasswordHint')
                        "
                      />
                    </UFormField>
                    <UButton
                      color="primary"
                      :disabled="
                        !masterPassword ||
                        masterPassword !== confirmMasterPassword
                      "
                      @click="enableEncryption"
                    >
                      {{ $t("settings.security.enableEncryption") }}
                    </UButton>
                  </div>

                  <div v-else class="space-y-4">
                    <UAlert
                      :icon="
                        security.isLocked.value
                          ? 'i-heroicons-lock-closed'
                          : 'i-heroicons-lock-open'
                      "
                      :color="security.isLocked.value ? 'yellow' : 'green'"
                      variant="subtle"
                      :title="
                        security.isLocked.value
                          ? $t('settings.security.locked')
                          : $t('settings.security.unlocked')
                      "
                    />

                    <div v-if="security.isLocked.value" class="space-y-3">
                      <UFormField
                        :label="$t('settings.security.enterMasterPassword')"
                      >
                        <UInput
                          v-model="unlockPassword"
                          type="password"
                          class="w-full"
                          :placeholder="
                            $t('settings.security.masterPasswordHint')
                          "
                          @keyup.enter="unlockEncryption"
                        />
                      </UFormField>
                      <UButton color="primary" @click="unlockEncryption">
                        {{ $t("settings.security.unlock") }}
                      </UButton>
                    </div>

                    <div v-else class="flex gap-2">
                      <UButton variant="outline" @click="lockEncryption">
                        <UIcon
                          name="i-heroicons-lock-closed"
                          class="w-4 h-4 mr-2"
                        />
                        {{ $t("settings.security.lock") }}
                      </UButton>
                      <UButton
                        color="red"
                        variant="outline"
                        @click="showDisableEncryptionModal = true"
                      >
                        <UIcon
                          name="i-heroicons-shield-exclamation"
                          class="w-4 h-4 mr-2"
                        />
                        {{
                          $t(
                            "settings.security.disableEncryption",
                            "Disable Encryption"
                          )
                        }}
                      </UButton>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>
          </template>

          <!-- Cloud Sync Tab -->
          <template #sync="{ item }">
            <UCard class="mt-4">
              <div class="space-y-6">
                <!-- Company Code Section -->
                <div>
                  <h3
                    class="text-lg font-semibold mb-4 flex items-center gap-2"
                  >
                    <UIcon
                      name="i-heroicons-key"
                      class="w-5 h-5 text-primary-500"
                    />
                    {{ $t("settings.sync.company_code", "Company Code") }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {{
                      $t(
                        "settings.sync.company_code_desc",
                        "Share this code with staff to sync settings across devices."
                      )
                    }}
                  </p>

                  <div v-if="companyCodeData.code" class="space-y-4">
                    <!-- Code Display - Tap to copy -->
                    <div
                      class="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 sm:p-6 text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-98"
                      @click="copyCompanyCode"
                    >
                      <p
                        class="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-primary-600 dark:text-primary-400 select-all"
                      >
                        {{ companyCodeData.code }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <UIcon
                          name="i-heroicons-clipboard-document"
                          class="w-3 h-3 inline-block mr-1"
                        />
                        {{ $t("settings.sync.tap_to_copy", "Tap to copy") }}
                      </p>
                    </div>
                    <!-- Action Buttons - Stack on mobile -->
                    <div class="flex flex-col sm:flex-row justify-center gap-2">
                      <UButton
                        icon="i-heroicons-clipboard-document"
                        variant="soft"
                        size="lg"
                        class="min-h-[44px]"
                        @click="copyCompanyCode"
                      >
                        {{ $t("common.copy") }}
                      </UButton>
                      <UButton
                        icon="i-heroicons-arrow-path"
                        variant="outline"
                        size="lg"
                        color="amber"
                        class="min-h-[44px]"
                        @click="regenerateCompanyCode"
                      >
                        {{ $t("settings.sync.regenerate", "Regenerate") }}
                      </UButton>
                    </div>
                  </div>

                  <div
                    v-else
                    class="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 text-center"
                  >
                    <UIcon
                      name="i-heroicons-key"
                      class="w-12 h-12 text-gray-400 mx-auto mb-4"
                    />
                    <p class="text-gray-500 mb-4">
                      {{
                        $t(
                          "settings.sync.no_code",
                          "No company code generated yet"
                        )
                      }}
                    </p>
                    <UButton
                      icon="i-heroicons-plus"
                      @click="generateNewCompanyCode"
                    >
                      {{ $t("settings.sync.generate", "Generate Code") }}
                    </UButton>
                  </div>
                </div>

                <!-- Sync Settings Section -->
                <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3
                    class="text-lg font-semibold mb-4 flex items-center gap-2"
                  >
                    <UIcon
                      name="i-heroicons-cloud-arrow-up"
                      class="w-5 h-5 text-green-500"
                    />
                    {{ $t("settings.sync.cloud_sync", "Cloud Sync") }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {{
                      $t(
                        "settings.sync.cloud_sync_desc",
                        "Sync Lightning, Receipt, and Tax settings to the cloud. Staff can access these with the company code."
                      )
                    }}
                  </p>

                  <!-- Sync Status -->
                  <div
                    class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-3 h-3 rounded-full"
                          :class="{
                            'bg-green-500':
                              settingsSync.syncStatus.value === 'synced',
                            'bg-yellow-500 animate-pulse':
                              settingsSync.syncStatus.value === 'syncing',
                            'bg-red-500':
                              settingsSync.syncStatus.value === 'error',
                            'bg-gray-400':
                              settingsSync.syncStatus.value === 'not_synced',
                          }"
                        />
                        <div>
                          <p class="font-medium text-gray-900 dark:text-white">
                            <span
                              v-if="settingsSync.syncStatus.value === 'synced'"
                              >{{ $t("settings.sync.synced", "Synced") }}</span
                            >
                            <span
                              v-else-if="
                                settingsSync.syncStatus.value === 'syncing'
                              "
                              >{{
                                $t("settings.sync.syncing", "Syncing...")
                              }}</span
                            >
                            <span
                              v-else-if="
                                settingsSync.syncStatus.value === 'error'
                              "
                              >{{
                                $t("settings.sync.error", "Sync Error")
                              }}</span
                            >
                            <span v-else>{{
                              $t("settings.sync.not_synced", "Not Synced")
                            }}</span>
                          </p>
                          <p
                            v-if="settingsSync.lastSyncAt.value"
                            class="text-xs text-gray-500"
                          >
                            {{ $t("settings.sync.last_sync", "Last sync") }}:
                            {{ formatSyncTime(settingsSync.lastSyncAt.value) }}
                          </p>
                        </div>
                      </div>
                      <UButton
                        icon="i-heroicons-cloud-arrow-up"
                        :loading="settingsSync.isSyncing.value"
                        :disabled="!companyCodeData.code"
                        @click="syncSettings"
                      >
                        {{ $t("settings.sync.sync_now", "Sync Now") }}
                      </UButton>
                    </div>
                  </div>

                  <!-- What Gets Synced -->
                  <div class="space-y-2">
                    <p
                      class="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      {{ $t("settings.sync.what_syncs", "What gets synced:") }}
                    </p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div
                        class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <UIcon
                          name="i-heroicons-bolt"
                          class="w-4 h-4 text-yellow-500"
                        />
                        {{ $t("settings.lightning.title", "Lightning") }}
                      </div>
                      <div
                        class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <UIcon
                          name="i-heroicons-document-text"
                          class="w-4 h-4 text-blue-500"
                        />
                        {{ $t("settings.receipt.title", "Receipt") }}
                      </div>
                      <div
                        class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <UIcon
                          name="i-heroicons-calculator"
                          class="w-4 h-4 text-green-500"
                        />
                        {{ $t("settings.tax.title", "Tax") }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Security Note -->
                <UAlert
                  icon="i-heroicons-shield-check"
                  color="blue"
                  variant="subtle"
                  :title="$t('settings.sync.encrypted', 'Encrypted')"
                  :description="
                    $t(
                      'settings.sync.encrypted_desc',
                      'All settings are encrypted with your company code before syncing. Only devices with the code can decrypt.'
                    )
                  "
                />
              </div>
            </UCard>
          </template>
        </UTabs>
      </UForm>
    </template>

    <!-- Branch Modal -->
    <UModal v-model:open="branchModal.open">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ branchModal.isEdit ? $t("common.edit") : $t("common.add") }}
              {{ $t("settings.branches.branch") }}
            </h3>
          </template>

          <UForm
            ref="branchFormRef"
            :schema="branchSchema"
            :state="branchModal.data"
            @submit="saveBranch"
          >
            <div class="space-y-4">
              <UFormField
                :label="$t('settings.branches.name')"
                name="name"
                required
              >
                <UInput
                  v-model="branchModal.data.name"
                  :placeholder="$t('settings.branches.name_placeholder')"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('settings.branches.code')"
                name="code"
                required
              >
                <UInput
                  v-model="branchModal.data.code"
                  :placeholder="$t('settings.branches.code_placeholder')"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('settings.branches.address', 'Address')"
                name="address"
              >
                <UTextarea
                  v-model="branchModal.data.address"
                  :placeholder="$t('settings.branches.address_placeholder')"
                  :rows="3"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('settings.branches.bolt12', 'BOLT12 Offer')"
                name="bolt12Offer"
              >
                <UInput
                  v-model="branchModal.data.bolt12Offer"
                  placeholder="lno1..."
                  class="w-full"
                />
                <template #hint>
                  <span class="text-xs text-gray-500">{{
                    $t(
                      "settings.branches.bolt12Hint",
                      "Lightning BOLT12 offer for this branch"
                    )
                  }}</span>
                </template>
              </UFormField>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <UButton
                :label="$t('common.cancel')"
                variant="ghost"
                @click="branchModal.open = false"
              />
              <UButton
                :label="$t('common.save')"
                type="submit"
                :loading="branchModal.saving"
              />
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>

    <!-- Disable Encryption Confirmation Modal -->
    <UModal v-model:open="showDisableEncryptionModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-red-600 dark:text-red-400">
              <UIcon name="i-heroicons-shield-exclamation" class="w-5 h-5" />
              <h3 class="text-lg font-semibold">
                {{
                  $t(
                    "settings.security.disableEncryption",
                    "Disable Encryption"
                  )
                }}
              </h3>
            </div>
          </template>

          <div class="space-y-4">
            <UAlert
              icon="i-heroicons-exclamation-triangle"
              color="red"
              variant="subtle"
              :title="$t('settings.security.disableWarning', 'Warning')"
              :description="
                $t(
                  'settings.security.disableWarningDesc',
                  'Disabling encryption will remove all encrypted data. You will need to re-enter your API keys after this action.'
                )
              "
            />

            <UFormField
              :label="
                $t(
                  'settings.security.confirmWithPassword',
                  'Confirm with your password'
                )
              "
            >
              <UInput
                v-model="disableEncryptionPassword"
                type="password"
                :placeholder="
                  $t('settings.security.enterPassword', 'Enter password')
                "
                class="w-full"
                @keyup.enter="handleDisableEncryption"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="ghost"
                @click="
                  showDisableEncryptionModal = false;
                  disableEncryptionPassword = '';
                "
              >
                {{ $t("common.cancel") }}
              </UButton>
              <UButton
                color="red"
                :loading="disablingEncryption"
                @click="handleDisableEncryption"
              >
                {{
                  $t(
                    "settings.security.disableEncryption",
                    "Disable Encryption"
                  )
                }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";
// Branch type definition - using type from ~/types
import type { Branch } from "~/types";
// Import currency utilities from data file
import {
  CURRENCIES,
  getCurrenciesByRegion,
  getCurrencyInfo,
} from "~/data/currencies";
// Import timezone utilities from data file
import {
  getTimezoneOptions,
  POPULAR_TIMEZONES,
  getAllTimezones,
} from "~/data/timezones";
const { t, locale } = useI18n();
const route = useRoute();
const toast = useToast();
const security = useSecurity();

// Page meta
definePageMeta({
  title: "General Settings",
  middleware: ["auth"],
});

useHead({
  title: "General Settings",
});

// Form refs
const formRef = ref();
const branchFormRef = ref();

// State
const saving = ref(false);
const isLoading = ref(true);
const activeTab = ref("0");
const masterPassword = ref("");
const confirmMasterPassword = ref("");
const unlockPassword = ref("");
const showDisableEncryptionModal = ref(false);
const disableEncryptionPassword = ref("");
const disablingEncryption = ref(false);

// Cloud Sync
const company = useCompany();
const settingsSync = useSettingsSync();
const companyCodeData = reactive({
  code: company.companyCode.value,
});

// Watch for company code changes
watch(
  () => company.companyCode.value,
  (newCode) => {
    companyCodeData.code = newCode;
  },
  { immediate: true }
);

// Company code functions
const copyCompanyCode = async () => {
  if (companyCodeData.code) {
    await navigator.clipboard.writeText(companyCodeData.code);
    toast.add({
      title: t("common.copied", "Copied!"),
      description: t(
        "settings.sync.code_copied",
        "Company code copied to clipboard"
      ),
      color: "green",
    });
  }
};

const regenerateCompanyCode = async () => {
  const newCode = company.generateCompanyCode();
  await company.setCompanyCode(newCode);
  companyCodeData.code = newCode;
  toast.add({
    title: t("common.success"),
    description: t(
      "settings.sync.code_regenerated",
      "New company code generated"
    ),
    color: "green",
  });
};

const generateNewCompanyCode = async () => {
  const newCode = company.generateCompanyCode();
  const nostrData = useNostrData();
  const keys = nostrData.getUserKeys();
  await company.setCompanyCode(newCode, keys?.pubkey);
  companyCodeData.code = newCode;
  toast.add({
    title: t("common.success"),
    description: t("settings.sync.code_generated", "Company code generated"),
    color: "green",
  });
};

const syncSettings = async () => {
  const success = await settingsSync.syncAllSettings();
  if (success) {
    toast.add({
      title: t("common.success"),
      description: t(
        "settings.sync.sync_success",
        "Settings synced successfully"
      ),
      color: "green",
    });
  } else {
    toast.add({
      title: t("common.error"),
      description:
        settingsSync.syncError.value ||
        t("settings.sync.sync_failed", "Sync failed"),
      color: "red",
    });
  }
};

const formatSyncTime = (isoString: string) => {
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return isoString;
  }
};

// Handle tab query parameter
onMounted(async () => {
  const tabParam = route.query.tab as string;
  if (tabParam === "security") {
    activeTab.value = "3"; // Security is now the 4th tab (index 3) after adding sync tab
  } else if (tabParam === "branches") {
    activeTab.value = "1";
  } else if (tabParam === "sync") {
    activeTab.value = "2";
  }

  // Load company code (with auto-migration)
  await company.loadCompanyCode();
  companyCodeData.code = company.companyCode.value;
});

// Encryption functions
const enableEncryption = async () => {
  if (
    masterPassword.value &&
    masterPassword.value === confirmMasterPassword.value
  ) {
    const success = await security.setupMasterPassword(masterPassword.value);
    if (success) {
      masterPassword.value = "";
      confirmMasterPassword.value = "";
      toast.add({
        title: t("common.success"),
        description: t("settings.security.encryptionEnabled"),
        color: "green",
      });
    }
  }
};

const unlockEncryption = async () => {
  if (unlockPassword.value) {
    const success = await security.unlock(unlockPassword.value);
    if (success) {
      unlockPassword.value = "";
      toast.add({
        title: t("settings.security.unlocked"),
        color: "green",
      });
    } else {
      toast.add({
        title: t("common.error"),
        description: t("settings.security.wrongPassword"),
        color: "red",
      });
    }
  }
};

const lockEncryption = () => {
  security.lock();
  toast.add({
    title: t("settings.security.locked"),
    color: "yellow",
  });
};

const handleDisableEncryption = async () => {
  if (!disableEncryptionPassword.value) {
    toast.add({
      title: t("common.error"),
      description: t("settings.security.passwordRequired", "Password required"),
      color: "red",
    });
    return;
  }

  disablingEncryption.value = true;

  try {
    const success = await security.disableEncryption(
      disableEncryptionPassword.value
    );
    if (success) {
      showDisableEncryptionModal.value = false;
      disableEncryptionPassword.value = "";
      toast.add({
        title: t("common.success"),
        description: t(
          "settings.security.encryptionDisabled",
          "Encryption has been disabled. Please re-enter your API keys."
        ),
        color: "green",
      });
    } else {
      toast.add({
        title: t("common.error"),
        description: t("settings.security.wrongPassword"),
        color: "red",
      });
    }
  } finally {
    disablingEncryption.value = false;
  }
};

// Form validation schema
const schema = z.object({
  companyName: z.string().min(1, t("validation.required")),
  companyEmail: z.string().email(t("validation.email")),
  companyPhone: z.string().optional(),
  taxNumber: z.string().optional(),
  companyAddress: z.string().optional(),
  defaultCurrency: z.string().min(1, t("validation.required")),
  defaultLanguage: z.string().min(1, t("validation.required")),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  timezone: z.string().optional(),
  decimalPlaces: z.number().min(0).max(4).optional(),
  minPasswordLength: z.number().min(6).max(20).optional(),
  passwordExpiryDays: z.number().min(0).max(365).optional(),
  requireUppercase: z.boolean().optional(),
  requireNumbers: z.boolean().optional(),
  requireSpecialChars: z.boolean().optional(),
  sessionTimeout: z.number().optional(),
  maxLoginAttempts: z.number().min(3).max(10).optional(),
  enableTwoFactor: z.boolean().optional(),
});

// Branch form schema
const branchSchema = z.object({
  name: z.string().min(1, t("validation.required")),
  code: z.string().min(1, t("validation.required")),
  address: z.string().optional(),
  bolt12Offer: z.string().optional(),
});

// Form state
const state = reactive({
  companyName: "",
  companyEmail: "",
  companyPhone: "",
  taxNumber: "",
  companyAddress: "",
  defaultCurrency: "",
  defaultLanguage: "en",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24",
  timezone: "Asia/Vientiane",
  decimalPlaces: 2,
  minPasswordLength: 8,
  passwordExpiryDays: 90,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  enableTwoFactor: false,
  // Shop Tags & Analytics
  tags: [] as string[],
  platformTag: "bnos.space",
});

// Tag management
const newTag = ref("");

const addTag = () => {
  const tag = newTag.value.trim().toLowerCase().replace(/\s+/g, "-");
  if (tag && !state.tags.includes(tag)) {
    state.tags.push(tag);
    newTag.value = "";
  }
};

const removeTag = (index: number) => {
  state.tags.splice(index, 1);
};

// Tabs configuration
const tabs = [
  {
    slot: "general",
    label: t("settings.general.tab"),
    icon: "i-heroicons-cog-6-tooth",
  },
  {
    slot: "branches",
    label: t("settings.branches.tab"),
    icon: "i-heroicons-building-storefront",
  },
  {
    slot: "sync",
    label: t("settings.sync.tab", "Cloud Sync"),
    icon: "i-heroicons-cloud-arrow-up",
  },
  {
    slot: "security",
    label: t("settings.security.tab"),
    icon: "i-heroicons-shield-check",
  },
];

// Helper function to get all currencies as array
const getAllCurrencies = () => {
  return Object.values(CURRENCIES);
};

// Options data - Generate from currency data
const allCurrencies = getAllCurrencies();
const currencyRegions = getCurrenciesByRegion();

// Popular currencies for quick access
const popularCurrencies = [
  "LAK",
  "THB",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "SGD",
  "BTC",
  "SATS",
];

// Generate currency options grouped by region
const currencies = computed(() => {
  // Get popular currencies first
  const popular = allCurrencies
    .filter((c) => popularCurrencies.includes(c.code))
    .map((c) => ({
      code: c.code,
      name: `${c.symbol} ${c.code} - ${c.name}`,
      symbol: c.symbol,
    }));

  // Get all currencies sorted alphabetically
  const all = allCurrencies
    .map((c) => ({
      code: c.code,
      name: `${c.symbol} ${c.code} - ${c.name}`,
      symbol: c.symbol,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    popular,
    all,
  };
});

const languages = [
  { code: "lo", name: "ລາວ (Lao)" },
  { code: "en", name: "English (US)" },
  { code: "th", name: "ไทย (Thai)" },
];

const dateFormats = [
  { value: "DD/MM/YYYY", name: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", name: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", name: "YYYY-MM-DD" },
];

const timeFormats = [
  { value: "24", name: "24 Hour" },
  { value: "12", name: "12 Hour" },
];

// Generate timezone options from data file
const timezones = computed(() => {
  const options = getTimezoneOptions();
  // Put popular timezones first
  const popular = options.filter((tz) => POPULAR_TIMEZONES.includes(tz.value));
  const others = options.filter((tz) => !POPULAR_TIMEZONES.includes(tz.value));
  return [...popular, ...others];
});

const decimalOptions = [
  { value: 0, name: "0" },
  { value: 1, name: "1" },
  { value: 2, name: "2" },
  { value: 3, name: "3" },
  { value: 4, name: "4" },
];

const sessionTimeouts = [
  { value: 15, name: "15 " + t("common.minutes") },
  { value: 30, name: "30 " + t("common.minutes") },
  { value: 60, name: "1 " + t("common.hour") },
  { value: 120, name: "2 " + t("common.hours") },
];

const statusOptions = [
  { value: "active", name: t("common.active") },
  { value: "inactive", name: t("common.inactive") },
];

// Nostr Data Layer
const nostrData = useNostrData();

// Branches data - loaded from Nostr
const branches = ref<Branch[]>([]);
const loadingBranches = ref(false);

// Branch modal state
const branchModal = reactive<{
  open: boolean;
  isEdit: boolean;
  saving: boolean;
  data: Branch;
}>({
  open: false,
  isEdit: false,
  saving: false,
  data: {
    id: "",
    name: "",
    code: "",
    address: "",
  },
});

// Load branches from Nostr on mount
const loadBranches = async () => {
  loadingBranches.value = true;
  try {
    const data = await nostrData.getAllBranches();
    branches.value = data;
  } catch (err) {
    console.error("Failed to load branches:", err);
  } finally {
    loadingBranches.value = false;
  }
};

function onLanguageChange() {}

// Load settings from ShopConfig and Nostr on mount
const loadSettings = async () => {
  try {
    // First, load from ShopConfig (source of truth for currency)
    const shopSettings = useShop();
    await shopSettings.loadShopConfig();
    const shopCfg = shopSettings.shopConfig.value;

    if (shopCfg) {
      if (shopCfg.name) state.companyName = shopCfg.name;
      if (shopCfg.address) state.companyAddress = shopCfg.address;
      if (shopCfg.phone) state.companyPhone = shopCfg.phone;
      if (shopCfg.email) state.companyEmail = shopCfg.email;
      if (shopCfg.currency) state.defaultCurrency = shopCfg.currency;
      if (shopCfg.timezone) state.timezone = shopCfg.timezone;
      if (shopCfg.language) state.defaultLanguage = shopCfg.language;
    }

    // Also load from legacy nostr settings for additional fields
    const settings = await nostrData.getSettings();
    if (settings) {
      // Handle BOTH new flat structure and legacy nested structure

      // New flat structure fields
      if (settings.companyName) state.companyName = settings.companyName;
      if (settings.companyEmail) state.companyEmail = settings.companyEmail;
      if (settings.companyPhone) state.companyPhone = settings.companyPhone;
      if (settings.taxNumber) state.taxNumber = settings.taxNumber;
      if (settings.companyAddress)
        state.companyAddress = settings.companyAddress;
      if (settings.defaultCurrency)
        state.defaultCurrency = settings.defaultCurrency;
      if (settings.defaultLanguage)
        state.defaultLanguage = settings.defaultLanguage;
      if (settings.dateFormat) state.dateFormat = settings.dateFormat;
      if (settings.timeFormat) state.timeFormat = settings.timeFormat;
      if (settings.timezone) state.timezone = settings.timezone;
      if (settings.decimalPlaces !== undefined)
        state.decimalPlaces = settings.decimalPlaces;

      // Legacy nested structure (from old settings format)
      if (settings.general) {
        if (settings.general.storeName)
          state.companyName = settings.general.storeName;
        if (settings.general.storeAddress)
          state.companyAddress = settings.general.storeAddress;
        if (settings.general.storePhone)
          state.companyPhone = settings.general.storePhone;
        if (settings.general.defaultCurrency)
          state.defaultCurrency = settings.general.defaultCurrency;
        if (settings.general.timezone)
          state.timezone = settings.general.timezone;
        if (settings.general.language) {
          // Map 'en-US' to 'en', 'lo-LA' to 'lo'
          const langMap: Record<string, string> = {
            "en-US": "en",
            "lo-LA": "lo",
          };
          state.defaultLanguage =
            langMap[settings.general.language] || settings.general.language;
        }
      }
    }
  } catch (err) {
    console.error("[general.vue] Failed to load settings:", err);
  }
};

// Initialize on mount
onMounted(async () => {
  loadBranches();
  await loadSettings();
  isLoading.value = false;
});

// Methods
const shop = useShop();

const onSubmit = async () => {
  saving.value = true;
  try {
    // Save to Nostr relay (legacy settings)
    await nostrData.saveSettings({
      companyName: state.companyName,
      companyEmail: state.companyEmail,
      companyPhone: state.companyPhone,
      taxNumber: state.taxNumber,
      companyAddress: state.companyAddress,
      defaultCurrency: state.defaultCurrency,
      defaultLanguage: state.defaultLanguage,
      dateFormat: state.dateFormat,
      timeFormat: state.timeFormat,
      timezone: state.timezone,
      decimalPlaces: state.decimalPlaces,
    });

    // Also save to ShopConfig for POS integration
    await shop.saveShopConfig({
      name: state.companyName,
      address: state.companyAddress,
      phone: state.companyPhone,
      email: state.companyEmail,
      currency: state.defaultCurrency,
      timezone: state.timezone,
      language: state.defaultLanguage,
      taxRate: shop.shopConfig.value?.taxRate || 0,
    });

    // Show success notification
    const toast = useToast();
    toast.add({
      title: t("common.success"),
      description: t("settings.general.saved_successfully"),
      color: "green",
    });
  } catch (error) {
    console.error("Save error:", error);
    const toast = useToast();
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    saving.value = false;
  }
};

const saveSettings = () => {
  formRef.value?.submit();
};

const openBranchModal = () => {
  branchModal.isEdit = false;
  branchModal.data = {
    id: "",
    name: "",
    code: "",
    address: "",
  };
  branchModal.open = true;
};

const editBranch = (branch: Branch) => {
  branchModal.isEdit = true;
  branchModal.data = { ...branch };
  branchModal.open = true;
};

const saveBranch = async () => {
  branchModal.saving = true;
  try {
    // Generate ID for new branches
    if (!branchModal.isEdit || !branchModal.data.id) {
      branchModal.data.id = crypto.randomUUID();
    }

    // Save to Nostr
    await nostrData.saveBranch(branchModal.data);

    // Reload branches
    await loadBranches();

    branchModal.open = false;

    // Show success notification
    const toast = useToast();
    toast.add({
      title: t("common.success"),
      description: t("settings.branches.saved_successfully"),
      color: "green",
    });
  } catch (error) {
    console.error("Save branch error:", error);
    const toast = useToast();
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    branchModal.saving = false;
  }
};

const deleteBranch = async (branchId: string) => {
  if (confirm(t("common.confirm_delete"))) {
    try {
      // For now, filter locally - TODO: implement delete in Nostr
      branches.value = branches.value.filter((b) => b.id !== branchId);

      // Show success notification
      const toast = useToast();
      toast.add({
        title: t("common.success"),
        description: t("settings.branches.deleted_successfully"),
        color: "green",
      });
    } catch (error) {
      console.error("Delete branch error:", error);
    }
  }
};
</script>
