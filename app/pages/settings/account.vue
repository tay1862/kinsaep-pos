<template>
  <div class="p-6">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t("account.settings") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ $t("account.settings_description") }}
        </p>
      </div>

      <UCard>
        <UTabs v-model="selectedTab" :items="tabItems" class="w-full">
          <!-- Profile Tab -->
          <template #profile="{ item }">
            <div class="space-y-6">
              <!-- Profile Header -->
              <div class="flex items-center space-x-6">
                <div class="relative">
                  <img
                    :src="userProfile.avatar || '/default-avatar.png'"
                    :alt="userProfile.name"
                    class="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                  />
                  <UButton
                    icon="i-heroicons-camera"
                    size="sm"
                    color="primary"
                    variant="solid"
                    class="absolute bottom-0 right-0 rounded-full"
                    @click="openAvatarModal"
                  />
                </div>
                <div>
                  <h3
                    class="text-xl font-semibold text-gray-900 dark:text-white"
                  >
                    {{ userProfile.name }}
                  </h3>
                  <p class="text-gray-600 dark:text-gray-400">
                    {{ userProfile.email }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-500">
                    {{ $t("account.member_since") }}:
                    {{ formatDate(userProfile.createdAt) }}
                  </p>
                </div>
              </div>

              <!-- Profile Form -->
              <UForm
                :schema="profileSchema"
                :state="profileForm"
                @submit="updateProfile"
              >
                <!-- Nostr Identity Section -->
                <div
                  class="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                >
                  <h4
                    class="text-sm font-medium text-purple-800 dark:text-purple-200 mb-3"
                  >
                    {{ $t("account.nostr_identity", "Nostr Identity") }}
                    <span
                      class="text-xs font-normal text-purple-600 dark:text-purple-300 ml-2"
                      >(kind:0)</span
                    >
                  </h4>
                  <div class="space-y-3">
                    <!-- Public Key (npub) -->
                    <div class="flex items-center gap-2">
                      <span
                        class="text-xs text-gray-500 dark:text-gray-400 w-12"
                        >npub:</span
                      >
                      <code
                        class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1 truncate"
                      >
                        {{ userProfile.npub || "Not available" }}
                      </code>
                      <UButton
                        v-if="userProfile.npub"
                        icon="i-heroicons-clipboard-document"
                        size="xs"
                        variant="ghost"
                        @click="copyToClipboard(userProfile.npub)"
                      />
                    </div>

                    <!-- Private Key (nsec) - Backup Section -->
                    <div
                      class="border-t border-purple-200 dark:border-purple-700 pt-3 mt-3"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <span
                          class="text-xs font-medium text-red-600 dark:text-red-400"
                        >
                          🔐
                          {{ $t("account.backup_key", "Backup Private Key") }}
                        </span>
                      </div>
                      <div v-if="userNsec" class="space-y-2">
                        <div v-if="!showNsec" class="flex items-center gap-2">
                          <span
                            class="text-xs text-gray-500 dark:text-gray-400 w-12"
                            >nsec:</span
                          >
                          <code
                            class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1"
                          >
                            ••••••••••••••••••••••••••••••••••
                          </code>
                          <UButton
                            icon="i-heroicons-eye"
                            size="xs"
                            variant="outline"
                            color="red"
                            @click="showNsecConfirmModal = true"
                          >
                            {{ $t("account.reveal", "Reveal") }}
                          </UButton>
                        </div>
                        <div v-else class="space-y-2">
                          <div class="flex items-center gap-2">
                            <span
                              class="text-xs text-gray-500 dark:text-gray-400 w-12"
                              >nsec:</span
                            >
                            <code
                              class="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded flex-1 break-all border border-red-200 dark:border-red-800"
                            >
                              {{ userNsec }}
                            </code>
                          </div>
                          <div class="flex gap-2">
                            <UButton
                              icon="i-heroicons-clipboard-document"
                              size="xs"
                              variant="outline"
                              color="red"
                              @click="copyNsec"
                            >
                              {{ $t("common.copy", "Copy") }}
                            </UButton>
                            <UButton
                              icon="i-heroicons-eye-slash"
                              size="xs"
                              variant="ghost"
                              @click="hideNsec"
                            >
                              {{ $t("account.hide", "Hide") }}
                            </UButton>
                          </div>
                        </div>
                      </div>
                      <p
                        v-else
                        class="text-xs text-gray-500 dark:text-gray-400 italic"
                      >
                        {{
                          $t(
                            "account.no_nsec_available",
                            "No private key available (using NIP-07 extension)"
                          )
                        }}
                      </p>
                      <p class="text-xs text-red-500 dark:text-red-400 mt-2">
                        ⚠️
                        {{
                          $t(
                            "account.nsec_warning",
                            "Never share your nsec! Anyone with this key has full control of your account."
                          )
                        }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <UFormField name="name" :label="$t('account.name', 'Name')">
                    <UInput
                      v-model="profileForm.name"
                      placeholder="Your name"
                      class="w-full"
                      icon="i-heroicons-user"
                    />
                  </UFormField>

                  <UFormField
                    name="displayName"
                    :label="$t('account.display_name', 'Display Name')"
                  >
                    <UInput
                      v-model="profileForm.displayName"
                      placeholder="Display name"
                      icon="i-heroicons-user"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    name="nip05"
                    :label="$t('account.nip05', 'NIP-05 (Nostr Address)')"
                  >
                    <UInput
                      v-model="profileForm.nip05"
                      placeholder="you@example.com"
                      icon="i-heroicons-envelope"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    name="lud16"
                    :label="
                      $t('account.lightning_address', 'Lightning Address')
                    "
                  >
                    <UInput
                      v-model="profileForm.lud16"
                      placeholder="you@getalby.com"
                      icon="emojione-v1:lightning-mood"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    name="website"
                    :label="$t('account.website', 'Website')"
                  >
                    <UInput
                      v-model="profileForm.website"
                      placeholder="https://yoursite.com"
                      icon="iconoir:www"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    name="picture"
                    :label="$t('account.picture_url', 'Profile Picture URL')"
                  >
                    <UInput
                      v-model="profileForm.picture"
                      placeholder="https://..."
                      icon="i-heroicons-photo"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div class="mt-6">
                  <UFormField
                    name="about"
                    :label="$t('account.about', 'About')"
                  >
                    <UTextarea
                      v-model="profileForm.about"
                      :rows="4"
                      placeholder="Tell us about yourself..."
                      icon="i-heroicons-chat-bubble-left"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div class="mt-6">
                  <UFormField
                    name="banner"
                    :label="$t('account.banner_url', 'Banner Image URL')"
                  >
                    <UInput
                      v-model="profileForm.banner"
                      placeholder="https://..."
                      icon="i-heroicons-photo"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div class="flex justify-between items-center mt-6">
                  <UButton
                    variant="outline"
                    :loading="isLoadingProfile"
                    @click="loadNostrProfile"
                  >
                    <UIcon name="i-heroicons-arrow-down-tray" class="mr-2" />
                    {{ $t("account.load_from_nostr", "Load from Nostr") }}
                  </UButton>
                  <UButton
                    type="submit"
                    color="primary"
                    :loading="isUpdatingProfile"
                  >
                    <UIcon name="i-heroicons-arrow-up-tray" class="mr-2" />
                    {{ $t("account.publish_to_nostr", "Publish to Nostr") }}
                  </UButton>
                </div>
              </UForm>
            </div>
          </template>

          <!-- Security Tab -->
          <template #security>
            <div class="space-y-8">
              <!-- Change Password -->
              <div>
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                >
                  {{ $t("account.change_password") }}
                </h3>
                <UForm
                  :schema="passwordSchema"
                  :state="passwordForm"
                  @submit="changePassword"
                >
                  <div class="space-y-4">
                    <UFormField
                      name="currentPassword"
                      :label="$t('account.current_password')"
                    >
                      <UInput
                        v-model="passwordForm.currentPassword"
                        type="password"
                        icon="i-heroicons-lock-closed"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      name="newPassword"
                      :label="$t('account.new_password')"
                    >
                      <UInput
                        v-model="passwordForm.newPassword"
                        type="password"
                        icon="i-heroicons-lock-closed"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      name="confirmPassword"
                      :label="$t('account.confirm_password')"
                    >
                      <UInput
                        v-model="passwordForm.confirmPassword"
                        type="password"
                        icon="i-heroicons-lock-closed"
                        class="w-full"
                      />
                    </UFormField>
                  </div>

                  <div class="flex justify-end mt-6">
                    <UButton
                      type="submit"
                      color="primary"
                      :loading="isChangingPassword"
                      icon="i-heroicons-lock-closed"
                    >
                      {{ $t("account.update_password") }}
                    </UButton>
                  </div>
                </UForm>
              </div>

              <!-- Two-Factor Authentication -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3
                      class="text-lg font-semibold text-gray-900 dark:text-white"
                    >
                      {{ $t("account.two_factor_auth") }}
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400">
                      {{ $t("account.two_factor_description") }}
                    </p>
                  </div>
                  <USwitch
                    v-model="securitySettings.twoFactorEnabled"
                    @update:model-value="toggleTwoFactor"
                  />
                </div>

                <div
                  v-if="securitySettings.twoFactorEnabled"
                  class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg"
                >
                  <div class="flex items-center">
                    <Icon
                      name="heroicons:shield-check"
                      class="text-green-600 dark:text-green-400 text-xl mr-3"
                    />
                    <span class="text-green-800 dark:text-green-300">{{
                      $t("account.two_factor_enabled")
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Active Sessions -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                >
                  {{ $t("account.active_sessions") }}
                </h3>
                <div class="space-y-4">
                  <div
                    v-for="session in activeSessions"
                    :key="session.id"
                    class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div class="flex items-center space-x-4">
                      <Icon
                        :name="getDeviceIcon(session.device)"
                        class="text-gray-600 dark:text-gray-400 text-xl"
                      />
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ session.device }}
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          {{ session.location }} •
                          {{ formatDate(session.lastActive) }}
                        </p>
                      </div>
                      <span
                        v-if="session.current"
                        class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-full"
                      >
                        {{ $t("account.current_session") }}
                      </span>
                    </div>
                    <UButton
                      v-if="!session.current"
                      color="red"
                      variant="ghost"
                      size="sm"
                      @click="terminateSession(session.id)"
                    >
                      {{ $t("account.terminate") }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Preferences Tab -->
          <template #preferences>
            <div class="space-y-8">
              <!-- Language & Region -->
              <div>
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                >
                  {{ $t("account.language_region") }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField :label="$t('account.language')">
                    <USelect
                      v-model="preferences.language"
                      :items="languageOptions"
                      label-key="label"
                      value-key="value"
                      icon="ion:language-outline"
                      class="w-full"
                      @update:model-value="changeLanguage"
                    />
                  </UFormField>

                  <UFormField :label="$t('account.timezone')">
                    <USelect
                      v-model="preferences.timezone"
                      :items="timezoneOptions"
                      label-key="label"
                      value-key="value"
                      icon="ion:time-outline"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField :label="$t('account.date_format')">
                    <USelect
                      v-model="preferences.dateFormat"
                      :items="dateFormatOptions"
                      label-key="label"
                      value-key="value"
                      icon="ion:calendar-outline"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField :label="$t('account.currency')">
                    <USelect
                      v-model="preferences.currency"
                      :items="currencyOptions"
                      label-key="label"
                      value-key="value"
                      class="w-full"
                      icon="material-symbols:currency-bitcoin"
                    />
                  </UFormField>
                </div>
              </div>

              <!-- Display Settings -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                >
                  {{ $t("account.display_settings") }}
                </h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.dark_mode") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.dark_mode_description") }}
                      </p>
                    </div>
                    <USwitch
                      v-model="preferences.darkMode"
                      @update:model-value="toggleDarkMode"
                    />
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.compact_view") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.compact_view_description") }}
                      </p>
                    </div>
                    <USwitch v-model="preferences.compactView" />
                  </div>
                </div>
              </div>

              <!-- Save Preferences -->
              <div
                class="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700"
              >
                <UButton
                  color="primary"
                  :loading="isSavingPreferences"
                  @click="savePreferences"
                >
                  {{ $t("common.save_changes") }}
                </UButton>
              </div>
            </div>
          </template>

          <!-- Notifications Tab -->
          <template #notifications>
            <div class="space-y-8">
              <!-- Email Notifications -->
              <div>
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                >
                  {{ $t("account.email_notifications") }}
                </h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.order_updates") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.order_updates_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.email.orders" />
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.inventory_alerts") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.inventory_alerts_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.email.inventory" />
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.system_updates") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.system_updates_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.email.system" />
                  </div>
                </div>
              </div>

              <!-- Push Notifications -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                >
                  {{ $t("account.push_notifications") }}
                </h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.real_time_alerts") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.real_time_alerts_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.push.realTime" />
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.daily_summary") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.daily_summary_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.push.dailySummary" />
                  </div>
                </div>
              </div>

              <!-- Notification Schedule -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
                >
                  {{ $t("account.notification_schedule") }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField :label="$t('account.quiet_hours_start')">
                    <UInput
                      v-model="notifications.quietHours.start"
                      type="time"
                    />
                  </UFormField>

                  <UFormField :label="$t('account.quiet_hours_end')">
                    <UInput
                      v-model="notifications.quietHours.end"
                      type="time"
                    />
                  </UFormField>
                </div>
              </div>

              <!-- Save Notifications -->
              <div
                class="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700"
              >
                <UButton
                  color="primary"
                  :loading="isSavingNotifications"
                  @click="saveNotifications"
                >
                  {{ $t("common.save_changes") }}
                </UButton>
              </div>
            </div>
          </template>
        </UTabs>
      </UCard>
    </div>

    <!-- Avatar Upload Modal -->
    <UModal v-model:open="isAvatarModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ $t("account.change_avatar") }}
            </h3>
          </template>

          <div class="space-y-4">
            <div class="flex justify-center">
              <img
                :src="
                  previewAvatar || userProfile.avatar || '/default-avatar.png'
                "
                alt="Avatar preview"
                class="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
              />
            </div>

            <div class="flex justify-center">
              <input
                ref="avatarInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleAvatarUpload"
              />
              <UButton
                color="primary"
                variant="outline"
                @click="avatarInput?.click()"
              >
                {{ $t("account.choose_file") }}
              </UButton>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end space-x-3">
              <UButton
                color="gray"
                variant="ghost"
                @click="isAvatarModalOpen = false"
              >
                {{ $t("common.cancel") }}
              </UButton>
              <UButton
                color="primary"
                :loading="isUploadingAvatar"
                @click="uploadAvatar"
              >
                {{ $t("common.save") }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
    <!-- Nsec Confirmation Modal -->
    <UModal v-model:open="showNsecConfirmModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-red-600 dark:text-red-400">
              <UIcon name="i-heroicons-exclamation-triangle" class="text-xl" />
              <h3 class="text-lg font-semibold">
                {{ $t("account.nsec_confirm_title", "⚠️ Security Warning") }}
              </h3>
            </div>
          </template>

          <div class="space-y-4">
            <div
              class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
            >
              <p
                class="text-sm text-red-700 dark:text-red-300 font-medium mb-2"
              >
                {{
                  $t(
                    "account.nsec_confirm_warning",
                    "Your private key (nsec) gives FULL ACCESS to your account!"
                  )
                }}
              </p>
              <ul
                class="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside"
              >
                <li>
                  {{
                    $t(
                      "account.nsec_warning_1",
                      "Anyone with this key can sign messages as you"
                    )
                  }}
                </li>
                <li>
                  {{
                    $t(
                      "account.nsec_warning_2",
                      "They can access all your encrypted data"
                    )
                  }}
                </li>
                <li>
                  {{
                    $t(
                      "account.nsec_warning_3",
                      "You cannot revoke access once shared"
                    )
                  }}
                </li>
                <li>
                  {{
                    $t(
                      "account.nsec_warning_4",
                      "Never share on screenshots, chats, or emails"
                    )
                  }}
                </li>
              </ul>
            </div>

            <!-- Simple checkbox confirmation -->
            <div
              class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <UCheckbox v-model="nsecConfirmChecked" class="mt-0.5" />
              <label
                class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                @click="nsecConfirmChecked = !nsecConfirmChecked"
              >
                {{
                  $t(
                    "account.nsec_confirm_checkbox",
                    "I understand the risks and want to copy my private key"
                  )
                }}
              </label>
            </div>
          </div>

          <template #footer>
            <div class="flex flex-col sm:flex-row justify-end gap-2">
              <UButton
                color="gray"
                variant="ghost"
                size="lg"
                class="min-h-[44px]"
                @click="closeNsecConfirmModal"
              >
                {{ $t("common.cancel", "Cancel") }}
              </UButton>
              <UButton
                color="red"
                size="lg"
                icon="i-heroicons-clipboard-document"
                class="min-h-[44px]"
                :disabled="!nsecConfirmChecked"
                @click="confirmAndCopyNsec"
              >
                {{ $t("account.copy_key", "Copy Key") }}
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
import type { UserInfo } from "~/types";

const { t } = useI18n();
const colorMode = useColorMode();
const toast = useToast();

// Nostr composables
const nostrStorage = useNostrStorage();
const nostrUser = useNostrUser();
const nostrRelay = useNostrRelay();
const { $nostr } = useNuxtApp();

// Session tracking
const sessionManager = useSessions();

// Users composable for syncing profile to current user
const { refreshCurrentUserProfile } = useUsers();

// Page meta
definePageMeta({
  title: "Account Settings",
  middleware: "auth",
});

useHead({
  title: "Account Settings",
});

// Reactive data
const selectedTab = ref("0");
const isUpdatingProfile = ref(false);
const isChangingPassword = ref(false);
const isSavingPreferences = ref(false);
const isSavingNotifications = ref(false);
const isAvatarModalOpen = ref(false);
const isUploadingAvatar = ref(false);
const previewAvatar = ref("");
const isLoadingProfile = ref(false);
const showNsec = ref(false);
const showNsecConfirmModal = ref(false);
const nsecConfirmChecked = ref(false);
const avatarInput = ref<HTMLInputElement | null>(null);

// Current user info from Nostr
const currentUserInfo = ref<{
  pubkey?: string;
  name?: string;
  displayName?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
  userKeys?: {
    npub?: string;
    nsec?: string;
    publicKey?: string;
    privateKey?: string;
  };
} | null>(null);

// Tab configuration
const tabItems = computed(() => [
  {
    slot: "profile",
    label: t("account.profile"),
    icon: "i-heroicons-user",
  },
  {
    slot: "security",
    label: t("account.security"),
    icon: "i-heroicons-shield-check",
  },
  {
    slot: "preferences",
    label: t("account.preferences"),
    icon: "i-heroicons-cog-6-tooth",
  },
  {
    slot: "notifications",
    label: t("account.notifications"),
    icon: "i-heroicons-bell",
  },
]);

// User profile data (computed from Nostr)
const userProfile = computed(() => {
  // Get npub from userKeys or load from storage
  let npub = currentUserInfo.value?.userKeys?.npub || "";

  // If no npub in currentUserInfo, try to get from storage
  if (!npub && import.meta.client) {
    const { user } = nostrStorage.loadCurrentUser();
    npub = user?.npub || "";
  }

  return {
    id: currentUserInfo.value?.pubkey || "",
    name:
      currentUserInfo.value?.displayName ||
      currentUserInfo.value?.name ||
      "User",
    email: currentUserInfo.value?.nip05 || "",
    avatar: currentUserInfo.value?.picture || null,
    createdAt: new Date().toISOString(),
    branchId: "1",
    npub,
    pubkey: currentUserInfo.value?.pubkey || "",
  };
});

// Form schemas for Nostr profile
const profileSchema = z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
  about: z.string().optional(),
  picture: z.string().url().optional().or(z.literal("")),
  banner: z.string().url().optional().or(z.literal("")),
  nip05: z.string().optional(),
  lud16: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, t("validation.required")),
    newPassword: z.string().min(8, t("validation.min_length", { length: 8 })),
    confirmPassword: z.string().min(1, t("validation.required")),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: t("validation.passwords_dont_match"),
    path: ["confirmPassword"],
  });

// Form states - Nostr profile fields
const profileForm = reactive({
  name: "",
  displayName: "",
  about: "",
  picture: "",
  banner: "",
  nip05: "",
  lud16: "",
  website: "",
});

const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// Security settings
const securitySettings = reactive({
  twoFactorEnabled: false,
});

// Active sessions (from composable)
const activeSessions = computed(() => sessionManager.sessions.value);

// Preferences
const preferences = reactive({
  language: "lo",
  timezone: "Asia/Vientiane",
  dateFormat: "DD/MM/YYYY",
  currency: "LAK",
  darkMode: colorMode.preference === "dark",
  compactView: false,
});

// Notifications
const notifications = reactive({
  email: {
    orders: true,
    inventory: true,
    system: false,
  },
  push: {
    realTime: true,
    dailySummary: false,
  },
  quietHours: {
    start: "22:00",
    end: "07:00",
  },
});

const languageOptions = ref([
  { label: "ລາວ (Lao)", value: "lo" },
  { label: "English", value: "en" },
]);

const timezoneOptions = ref([
  { label: "Asia/Vientiane (GMT+7)", value: "Asia/Vientiane" },
  { label: "Asia/Bangkok (GMT+7)", value: "Asia/Bangkok" },
]);

const dateFormatOptions = ref([
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
]);

// Import centralized currency options
import { CURRENCY_OPTIONS } from "~/composables/use-currency";
const currencyOptions = ref(CURRENCY_OPTIONS);

// Get user's nsec from storage
const userNsec = computed(() => {
  const { userInfo, user } = nostrStorage.loadCurrentUser();
  return userInfo?.userKeys?.nsec || user?.nsec || null;
});

// Copy to clipboard helper
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: t("common.copied", "Copied!"),
      color: "success",
    });
  } catch (error) {
    console.error("Failed to copy:", error);
  }
};

// Copy nsec with extra warning
const copyNsec = async () => {
  if (!userNsec.value) return;

  try {
    await navigator.clipboard.writeText(userNsec.value);
    toast.add({
      title: t("account.nsec_copied", "Private key copied!"),
      description: t(
        "account.nsec_copied_warning",
        "Keep it safe and never share it!"
      ),
      color: "warning",
    });
  } catch (error) {
    console.error("Failed to copy nsec:", error);
  }
};

// Nsec confirmation modal functions
const closeNsecConfirmModal = () => {
  showNsecConfirmModal.value = false;
  nsecConfirmChecked.value = false;
};

const confirmAndCopyNsec = async () => {
  if (!nsecConfirmChecked.value || !userNsec.value) return;

  try {
    await navigator.clipboard.writeText(userNsec.value);
    toast.add({
      title: t("account.nsec_copied", "Private key copied!"),
      description: t(
        "account.nsec_copied_warning",
        "Keep it safe and never share it!"
      ),
      color: "warning",
    });
    closeNsecConfirmModal();
    showNsec.value = true;

    // Auto-hide after 60 seconds for security
    setTimeout(() => {
      showNsec.value = false;
    }, 60000);
  } catch (error) {
    console.error("Failed to copy nsec:", error);
    toast.add({
      title: t("common.error", "Error"),
      description: t("common.copy_failed", "Failed to copy to clipboard"),
      color: "error",
    });
  }
};

const hideNsec = () => {
  showNsec.value = false;
};

// Load profile from Nostr relays
const loadNostrProfile = async () => {
  if (!currentUserInfo.value?.pubkey) {
    toast.add({
      title: t("account.no_pubkey", "No public key found"),
      color: "error",
    });
    return;
  }

  isLoadingProfile.value = true;
  try {
    const profile = await nostrUser.getUserInfo(currentUserInfo.value.pubkey);
    if (profile) {
      profileForm.name = profile.name || "";
      profileForm.displayName = profile.displayName || "";
      profileForm.about = profile.about || "";
      profileForm.picture = profile.picture || "";
      profileForm.banner = profile.banner || "";
      profileForm.nip05 = profile.nip05 || "";
      profileForm.lud16 = profile.lud16 || "";
      profileForm.website = profile.website || "";

      toast.add({
        title: t("account.profile_loaded", "Profile loaded from Nostr"),
        color: "success",
      });
    } else {
      toast.add({
        title: t("account.profile_not_found", "No profile found on relays"),
        color: "warning",
      });
    }
  } catch (error) {
    console.error("Failed to load profile:", error);
    toast.add({
      title: t("account.load_failed", "Failed to load profile"),
      color: "error",
    });
  } finally {
    isLoadingProfile.value = false;
  }
};

// Methods
const updateProfile = async () => {
  isUpdatingProfile.value = true;
  try {
    // Call the composable function to update profile
    await nostrUser.updateUserProfile(profileForm);

    // Sync profile to bitspace_current_user (staff user system)
    refreshCurrentUserProfile();

    toast.add({
      title: t("account.profile_published", "Profile published to Nostr"),
      color: "success",
    });
  } catch (error: any) {
    console.error("Failed to publish profile:", error);
    toast.add({
      title: t("account.publish_failed", "Failed to publish profile"),
      description: error.message || t("common.error_occurred"),
      color: "error",
    });
  } finally {
    isUpdatingProfile.value = false;
  }
};

const changePassword = async (event: any) => {
  isChangingPassword.value = true;
  try {
    // API call to change password
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    // Clear form
    Object.assign(passwordForm, {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    // Show success toast
    console.log("Password changed successfully");
  } catch (error) {
    // Show error toast
    console.error("Failed to change password:", error);
  } finally {
    isChangingPassword.value = false;
  }
};

const toggleTwoFactor = async (enabled: boolean) => {
  try {
    // API call to toggle 2FA
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Two-factor authentication", enabled ? "enabled" : "disabled");
  } catch (error) {
    // Revert the toggle
    securitySettings.twoFactorEnabled = !enabled;
    console.error("Failed to toggle 2FA:", error);
  }
};

const terminateSession = async (sessionId: string) => {
  try {
    // Terminate session via composable
    const success = sessionManager.terminateSession(sessionId);
    if (success) {
      console.log("Session terminated successfully");
    }
  } catch (error) {
    console.error("Failed to terminate session:", error);
  }
};

const changeLanguage = (newLanguage: string) => {
  // Update i18n locale
  const { setLocale } = useI18n();
  setLocale(newLanguage as any);
};

const toggleDarkMode = (enabled: boolean) => {
  // Toggle dark mode using Nuxt color mode
  colorMode.preference = enabled ? "dark" : "light";
  console.log("Dark mode", enabled ? "enabled" : "disabled");
};

const savePreferences = async () => {
  isSavingPreferences.value = true;
  try {
    // API call to save preferences
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Preferences saved successfully");
  } catch (error) {
    console.error("Failed to save preferences:", error);
  } finally {
    isSavingPreferences.value = false;
  }
};

const saveNotifications = async () => {
  isSavingNotifications.value = true;
  try {
    // API call to save notification settings
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Notification settings saved successfully");
  } catch (error) {
    console.error("Failed to save notification settings:", error);
  } finally {
    isSavingNotifications.value = false;
  }
};

const openAvatarModal = () => {
  isAvatarModalOpen.value = true;
  previewAvatar.value = "";
};

const cloudinary = useCloudinary();
const selectedAvatarFile = ref<File | null>(null);

const handleAvatarUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    selectedAvatarFile.value = file;
    // Show preview locally
    const reader = new FileReader();
    reader.onload = (e) => {
      previewAvatar.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const uploadAvatar = async () => {
  if (!selectedAvatarFile.value) {
    if (previewAvatar.value) {
      // User just wants to use the preview (maybe pasted url? unlikely here but fallback)
      userProfile.value.avatar = previewAvatar.value;
      profileForm.picture = previewAvatar.value;
      isAvatarModalOpen.value = false;
    }
    return;
  }

  isUploadingAvatar.value = true;
  try {
    const result = await cloudinary.uploadImage(selectedAvatarFile.value, {
      folder: "avatars",
    });

    if (result && result.url) {
      // Update form
      profileForm.picture = result.url;

      // key step: update profile on Nostr immediately
      await nostrUser.updateUserProfile(profileForm);
      await refreshCurrentUserProfile();

      // Update local state to trigger UI update
      if (currentUserInfo.value) {
        currentUserInfo.value.picture = result.url;
      }

      toast.add({
        title: t("common.success"),
        description: t(
          "account.avatar_updated_nostr",
          "Avatar updated and published to Nostr"
        ),
        color: "success",
      });

      isAvatarModalOpen.value = false;

      // Clear selection
      selectedAvatarFile.value = null;
    } else {
      throw new Error(cloudinary.error.value || "Upload failed");
    }
  } catch (error: any) {
    console.error("Failed to upload avatar:", error);
    toast.add({
      title: t("common.error"),
      description:
        error.message || t("account.upload_failed", "Failed to upload avatar"),
      color: "error",
    });
  } finally {
    isUploadingAvatar.value = false;
  }
};

const getDeviceIcon = (device: string) => {
  if (device.includes("iPhone") || device.includes("Android")) {
    return "heroicons:device-phone-mobile";
  } else if (device.includes("iPad") || device.includes("Tablet")) {
    return "heroicons:device-tablet";
  }
  return "heroicons:computer-desktop";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Sync dark mode preference on mount and watch for external changes
onMounted(async () => {
  preferences.darkMode =
    colorMode.preference === "dark" || colorMode.value === "dark";

  // Register this device session
  sessionManager.registerLogin();

  // Load current user info from storage
  const { userInfo, user } = nostrStorage.loadCurrentUser();
  if (userInfo || user) {
    // Merge userInfo with user keys if needed
    const mergedInfo = {
      ...userInfo,
      userKeys:
        userInfo?.userKeys ||
        (user
          ? {
              npub: user.npub,
              nsec: user.nsec,
              publicKey: user.publicKey,
              privateKey: user.privateKey,
            }
          : undefined),
    };

    currentUserInfo.value = mergedInfo;

    // Pre-fill form with stored profile data
    profileForm.name = userInfo?.name || "";
    profileForm.displayName =
      userInfo?.displayName || userInfo?.display_name || "";
    profileForm.about = userInfo?.about || "";
    profileForm.picture = userInfo?.picture || "";
    profileForm.banner = userInfo?.banner || "";
    profileForm.nip05 = userInfo?.nip05 || "";
    profileForm.lud16 = userInfo?.lud16 || "";
    profileForm.website = userInfo?.website || "";
  }
});

// Watch for external color mode changes (e.g., from other components)
watch(
  () => colorMode.value,
  (newVal) => {
    preferences.darkMode = newVal === "dark";
  }
);
</script>
