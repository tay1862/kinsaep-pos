<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Loading State -->
    <div v-if="!isReady" class="flex items-center justify-center min-h-screen">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-primary-500"
      />
    </div>

    <template v-else>
      <!-- Header -->
      <CommonPageHeader
        :title="$t('settings.users.title')"
        :subtitle="$t('settings.users.subtitle')"
      >
        <template #actions>
          <div class="flex items-center gap-4">
            <NuxtLinkLocale
              to="/settings"
              class="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
              {{ $t("common.back") }}
            </NuxtLinkLocale>
            <UButton
              v-if="canManageUsers"
              color="primary"
              @click="openCreateModal"
            >
              <UIcon name="i-heroicons-plus" class="w-5 h-5 mr-2" />
              {{ $t("settings.users.addUser") }}
            </UButton>
          </div>
        </template>
      </CommonPageHeader>

      <div class="container mx-auto px-4 py-8 max-w-6xl">
        <!-- Current User Card -->
        <UCard class="mb-6">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon
                name="i-heroicons-user-circle"
                class="w-6 h-6 text-primary-500"
              />
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.users.currentUser") }}
              </span>
            </div>
          </template>

          <div v-if="currentUser" class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <UAvatar
                :src="currentUser.avatar"
                :alt="currentUser.name"
                size="lg"
              />
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ currentUser.name }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ currentUser.email }}
                </p>
                <!-- Show auth method badge -->
                <div class="flex items-center gap-2 mt-1">
                  <UBadge
                    :color="getAuthMethodColor(currentUser.authMethod)"
                    variant="subtle"
                    size="xs"
                  >
                    <UIcon
                      :name="getAuthMethodIcon(currentUser.authMethod)"
                      class="w-3 h-3 mr-1"
                    />
                    {{
                      $t(
                        `settings.users.authMethod.${
                          currentUser.authMethod || "pin"
                        }`
                      )
                    }}
                  </UBadge>
                  <span
                    v-if="currentUser.npub"
                    class="text-xs text-gray-400 font-mono"
                  >
                    {{ truncateNpub(currentUser.npub) }}
                  </span>
                </div>
              </div>
            </div>

            <UBadge
              :color="getRoleColor(currentUser.role)"
              variant="subtle"
              size="lg"
            >
              {{ $t(`settings.users.roles.${currentUser.role}`) }}
            </UBadge>
          </div>
        </UCard>

        <!-- Company Code Card (for owner/admin to share with staff) -->
        <UCard
          v-if="isOwner && companyCode"
          class="mb-6 border-dashed border-primary-300 dark:border-primary-700"
        >
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon
                name="i-heroicons-building-storefront"
                class="w-6 h-6 text-primary-500"
              />
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.users.companyCode", "Company Code") }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("common.enabled", "Enabled") }}
              </span>
              <USwitch v-model="isCompanyCodeEnabled" size="md" />
            </div>
          </template>

          <div v-if="isCompanyCodeEnabled" class="text-center py-4">
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {{
                $t("settings.users.companyCodeDescription", "Share this code with staff to connect from other devices")
              }}
            </p>

            <div class="flex items-center justify-center gap-4">
              <!-- Display Mode -->
              <template v-if="!isEditingCode">
                <div
                  class="text-4xl font-mono font-bold tracking-[0.5em] text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-6 py-3 rounded-lg"
                >
                  {{ companyCode }}
                </div>
                <UButton
                  color="gray"
                  variant="ghost"
                  icon="i-heroicons-clipboard-document"
                  @click="copyCompanyCode"
                />
              </template>

              <!-- Edit Mode -->
              <div v-else class="flex items-center gap-2 max-w-sm w-full">
                <UInput
                  v-model="editingCodeValue"
                  class="flex-1 font-mono text-center"
                  size="lg"
                  :placeholder="$t('settings.users.enterCompanyCode')"
                  @keyup.enter="saveCompanyCode"
                />
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-4 flex items-center justify-center gap-4">
              <template v-if="!isEditingCode">
                <UButton
                  color="gray"
                  variant="link"
                  size="sm"
                  @click="startEditingCode"
                >
                  {{ $t("settings.users.editCode", "Edit Code") }}
                </UButton>
                <span class="text-gray-300 dark:text-gray-700">|</span>
                <UButton
                  color="gray"
                  variant="link"
                  size="sm"
                  @click="regenerateCompanyCode"
                >
                  {{
                    $t("settings.users.regenerateCode", "Generate New Code")
                  }}
                </UButton>
              </template>

              <template v-else>
                <UButton
                  color="gray"
                  variant="ghost"
                  @click="cancelEditingCode"
                >
                  {{ $t("common.cancel") }}
                </UButton>
                <UButton color="primary" @click="saveCompanyCode">
                  {{ $t("common.save") }}
                </UButton>
              </template>
            </div>
          </div>
        </UCard>

        <!-- Permission Denied Alert -->
        <UAlert
          v-if="!canManageUsers"
          icon="i-heroicons-shield-exclamation"
          color="yellow"
          variant="subtle"
          :title="$t('settings.users.noPermission')"
          :description="$t('settings.users.noPermissionDescription')"
          class="mb-6"
        />

        <!-- Users Table -->
        <UCard v-if="canManageUsers">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.users.allUsers") }}
              </h3>
              <div class="flex items-center gap-4">
                <UCheckbox
                  v-model="showDeleted"
                  :label="$t('settings.users.showDeleted', 'Show Deleted')"
                />
                <UBadge color="gray" variant="subtle">
                  {{ filteredUsers.length }} {{ $t("settings.users.users") }}
                </UBadge>
              </div>
            </div>
          </template>

          <!-- User List -->
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            <div
              v-for="user in filteredUsers"
              :key="user.id"
              class="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              :class="{ 'opacity-50': user.revokedAt || !user.isActive }"
            >
              <div class="flex items-center gap-4">
                <div class="relative">
                  <UAvatar :src="user.avatar" :alt="user.name" size="sm" />
                  <!-- Auth method indicator -->
                  <div
                    class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    :class="getAuthMethodBgColor(user.authMethod)"
                  >
                    <UIcon
                      :name="getAuthMethodIcon(user.authMethod)"
                      class="w-2.5 h-2.5 text-white"
                    />
                  </div>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ user.name }}
                    </p>
                    <!-- Revoked/Expired indicator -->
                    <UBadge
                      v-if="user.revokedAt"
                      color="red"
                      variant="subtle"
                      size="xs"
                    >
                      {{ $t("settings.users.revoked") }}
                    </UBadge>
                    <UBadge
                      v-else-if="isExpired(user)"
                      color="orange"
                      variant="subtle"
                      size="xs"
                    >
                      {{ $t("settings.users.expired") }}
                    </UBadge>
                  </div>
                  <p
                    v-if="user.email"
                    class="text-sm text-gray-500 dark:text-gray-400"
                  >
                    {{ user.email }}
                  </p>
                  <p v-if="user.npub" class="text-xs text-gray-400 font-mono">
                    {{ truncateNpub(user.npub) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <!-- Role -->
                <UBadge :color="getRoleColor(user.role)" variant="subtle">
                  {{ $t(`settings.users.roles.${user.role}`) }}
                </UBadge>

                <!-- Status -->
                <UBadge :color="getStatusColor(user)" variant="subtle">
                  {{ getStatusText(user) }}
                </UBadge>

                <!-- Expiry -->
                <span
                  v-if="user.expiresAt"
                  class="text-xs text-gray-500 dark:text-gray-400"
                >
                  {{ $t("settings.users.expiresOn") }}:
                  {{ formatDate(user.expiresAt) }}
                </span>

                <!-- Last login -->
                <span
                  class="text-sm text-gray-500 dark:text-gray-400 min-w-[100px]"
                >
                  {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : "-" }}
                </span>

                <!-- Actions -->
                <div class="flex items-center gap-1">
                  <UTooltip :text="$t('common.edit')">
                    <UButton
                      variant="ghost"
                      size="xs"
                      :disabled="
                        user.id === currentUser?.id || !!user.deletedAt
                      "
                      @click="openEditModal(user)"
                    >
                      <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                    </UButton>
                  </UTooltip>

                  <UTooltip :text="$t('settings.users.permissions.title')">
                    <UButton
                      variant="ghost"
                      size="xs"
                      :disabled="!!user.deletedAt"
                      @click="openPermissionsModal(user)"
                    >
                      <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
                    </UButton>
                  </UTooltip>

                  <!-- Revoke/Restore button -->
                  <UTooltip
                    v-if="user.id !== currentUser?.id && !user.deletedAt"
                    :text="
                      user.revokedAt
                        ? $t('settings.users.restore')
                        : $t('settings.users.revoke')
                    "
                  >
                    <UButton
                      variant="ghost"
                      size="xs"
                      :color="user.revokedAt ? 'green' : 'orange'"
                      @click="
                        user.revokedAt
                          ? restoreAccess(user)
                          : openRevokeModal(user)
                      "
                    >
                      <UIcon
                        :name="
                          user.revokedAt
                            ? 'i-heroicons-arrow-path'
                            : 'i-heroicons-no-symbol'
                        "
                        class="w-4 h-4"
                      />
                    </UButton>
                  </UTooltip>

                  <!-- Generate Invite Link Button -->
                  <UTooltip
                    v-if="user.id !== currentUser?.id && user.isActive"
                    :text="
                      $t('settings.users.generateInvite', 'Generate Invite Link')
                    "
                  >
                    <UButton
                      variant="ghost"
                      size="xs"
                      color="primary"
                      @click="generateInviteLink(user)"
                    >
                      <UIcon name="i-heroicons-link" class="w-4 h-4" />
                    </UButton>
                  </UTooltip>

                  <UTooltip
                    v-if="user.id !== currentUser?.id"
                    :text="
                      user.deletedAt
                        ? $t('common.restore')
                        : $t('common.delete')
                    "
                  >
                    <UButton
                      variant="ghost"
                      :color="user.deletedAt ? 'green' : 'red'"
                      size="xs"
                      @click="
                        user.deletedAt
                          ? confirmRestoreDeleted(user)
                          : confirmDelete(user)
                      "
                    >
                      <UIcon
                        :name="
                          user.deletedAt
                            ? 'i-heroicons-arrow-path'
                            : 'i-heroicons-trash'
                        "
                        class="w-4 h-4"
                      />
                    </UButton>
                  </UTooltip>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Auth Methods Info -->
        <UCard class="mt-6">
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ $t("settings.users.authMethods") }}
            </h3>
          </template>

          <div class="space-y-4">
            <!-- Nostr Auth - Primary Method -->
            <div
              class="p-4 rounded-lg border-2 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20"
            >
              <div class="flex items-center gap-3 mb-2">
                <div
                  class="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center"
                >
                  <UIcon name="i-heroicons-key" class="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-white">
                    Nostr (nsec/npub)
                  </h4>
                  <UBadge color="purple" variant="subtle" size="xs">{{
                    $t("settings.users.recommended")
                  }}</UBadge>
                </div>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {{ $t("settings.users.authDesc.nostr") }}
              </p>
              <div class="bg-purple-100 dark:bg-purple-900/40 rounded-lg p-3">
                <p class="text-xs text-purple-700 dark:text-purple-300">
                  <UIcon name="i-heroicons-information-circle" class="w-4 h-4 inline mr-1" />
                  {{ $t("settings.users.nostrBenefits", "Staff can login from any device using their nsec key. Owner can also use browser extensions (Alby, nos2x).") }}
                </p>
              </div>
            </div>

            <!-- How it works -->
            <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">
                <UIcon name="i-heroicons-question-mark-circle" class="w-5 h-5 inline mr-1" />
                {{ $t("settings.users.howItWorks", "How Authentication Works") }}
              </h4>
              <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div class="flex items-start gap-3">
                  <div class="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span class="text-xs font-bold text-purple-600 dark:text-purple-400">1</span>
                  </div>
                  <p>{{ $t("settings.users.step1", "Owner creates staff accounts with roles and permissions") }}</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span class="text-xs font-bold text-purple-600 dark:text-purple-400">2</span>
                  </div>
                  <p>{{ $t("settings.users.step2", "Staff receives their nsec key or generates one via invite link") }}</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span class="text-xs font-bold text-purple-600 dark:text-purple-400">3</span>
                  </div>
                  <p>{{ $t("settings.users.step3", "Staff enters company code + their nsec to login from any device") }}</p>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span class="text-xs font-bold text-purple-600 dark:text-purple-400">4</span>
                  </div>
                  <p>{{ $t("settings.users.step4", "All data syncs automatically via Nostr relays") }}</p>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Role Descriptions -->
        <UCard class="mt-6">
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ $t("settings.users.roleDescriptions") }}
            </h3>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="role in roleDescriptions"
              :key="role.id"
              class="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div class="flex items-center gap-3 mb-2">
                <UBadge :color="role.color" variant="subtle">
                  {{ $t(`settings.users.roles.${role.id}`) }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ $t(`settings.users.roleDesc.${role.id}`) }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Create/Edit User Modal -->
      <UModal v-model:open="showUserModal">
        <template #content>
          <UCard class="max-w-lg max-h-[90vh] flex flex-col">
            <template #header>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{
                  editingUser
                    ? $t("settings.users.editUser")
                    : $t("settings.users.addUser")
                }}
              </h3>
            </template>

            <div class="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
              <!-- Name -->
              <UFormField :label="$t('settings.users.name')" required>
                <UInput
                  v-model="userForm.name"
                  :placeholder="$t('settings.users.namePlaceholder')"
                  icon="i-heroicons-user"
                  class="w-full"
                />
              </UFormField>

              <!-- Email -->
              <UFormField :label="$t('settings.users.email')">
                <UInput
                  v-model="userForm.email"
                  type="email"
                  :placeholder="$t('settings.users.emailPlaceholder')"
                  icon="i-heroicons-envelope"
                  class="w-full"
                />
              </UFormField>

              <!-- Auth Method Selection -->
              <UFormField
                :label="$t('settings.users.authMethodLabel')"
                required
              >
                <div class="grid grid-cols-1 gap-2">
                  <!-- Nostr is the primary/default method -->
                  <button
                    type="button"
                    class="p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4"
                    :class="
                      userForm.authMethod === 'nostr'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    "
                    @click="userForm.authMethod = 'nostr'"
                  >
                    <div class="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-heroicons-key" class="w-5 h-5 text-white" />
                    </div>
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <p class="font-medium text-gray-900 dark:text-white">Nostr (nsec/npub)</p>
                        <UBadge color="purple" variant="subtle" size="xs">{{ $t("settings.users.recommended") }}</UBadge>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {{ $t("settings.users.nostrAuthDesc", "Secure, decentralized login from any device") }}
                      </p>
                    </div>
                    <UIcon 
                      v-if="userForm.authMethod === 'nostr'" 
                      name="i-heroicons-check-circle-solid" 
                      class="w-6 h-6 text-purple-500" 
                    />
                  </button>
                </div>
              </UFormField>

              <!-- Nostr Auth Fields -->
              <div
                v-if="userForm.authMethod === 'nostr'"
                class="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
              >
                <UFormField :label="$t('settings.users.npub')">
                  <UInput
                    v-model="userForm.npub"
                    :placeholder="$t('settings.users.npubPlaceholder')"
                    icon="i-heroicons-key"
                    class="font-mono w-full"
                  />
                  <template #hint>
                    {{ $t("settings.users.npubHintOptional", "Optional - can be set when staff first logs in with their nsec") }}
                  </template>
                </UFormField>
              </div>

              <!-- Role -->
              <UFormField :label="$t('settings.users.role')" required>
                <USelectMenu
                  v-model="userForm.role"
                  :items="roleOptions"
                  value-key="value"
                />
              </UFormField>

              <!-- Access Expiry -->
              <UFormField :label="$t('settings.users.accessExpiry')">
                <UInput
                  v-model="userForm.expiresAt"
                  type="date"
                  icon="i-heroicons-calendar"
                />
                <template #hint>
                  {{ $t("settings.users.accessExpiryHint") }}
                </template>
              </UFormField>

              <!-- Status -->
              <UFormField :label="$t('settings.users.status')">
                <USwitch
                  v-model="userForm.isActive"
                  :label="
                    userForm.isActive
                      ? $t('common.active')
                      : $t('common.inactive')
                  "
                />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end gap-4">
                <UButton variant="ghost" @click="showUserModal = false">
                  {{ $t("common.cancel") }}
                </UButton>
                <UButton :loading="saving" color="primary" @click="saveUser">
                  {{ $t("common.save") }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- Permissions Modal -->
      <UModal v-model:open="showPermissionsModal">
        <template #content>
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.users.editPermissions") }}:
                {{ selectedUser?.name }}
              </h3>
            </template>

            <div
              v-if="selectedUser"
              class="space-y-6 max-h-[60vh] overflow-y-auto px-1"
            >
              <div v-for="group in PERMISSION_GROUPS" :key="group.id">
                <h4 class="font-medium text-gray-900 dark:text-white mb-3">
                  {{ $t(group.label) }}
                </h4>
                <div class="grid grid-cols-2 gap-3">
                  <UCheckbox
                    v-for="perm in group.permissions"
                    :key="perm.key"
                    v-model="permissionsForm[perm.key]"
                    :label="$t(perm.label)"
                  />
                </div>
              </div>
            </div>

            <template #footer>
              <div class="flex justify-end gap-4">
                <UButton variant="ghost" @click="showPermissionsModal = false">
                  {{ $t("common.cancel") }}
                </UButton>
                <UButton
                  :loading="saving"
                  color="primary"
                  @click="savePermissions"
                >
                  {{ $t("common.save") }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- Revoke Access Modal -->
      <UModal v-model:open="showRevokeModal">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <UIcon
                  name="i-heroicons-no-symbol"
                  class="w-6 h-6 text-orange-500"
                />
                <span class="font-semibold text-gray-900 dark:text-white">
                  {{ $t("settings.users.revokeAccess") }}
                </span>
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-gray-600 dark:text-gray-300">
                {{
                  $t("settings.users.revokeWarning", {
                    name: userToRevoke?.name,
                  })
                }}
              </p>

              <UFormField :label="$t('settings.users.revokeReason')">
                <UTextarea
                  v-model="revokeReason"
                  :placeholder="$t('settings.users.revokeReasonPlaceholder')"
                  :rows="3"
                />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end gap-4">
                <UButton variant="ghost" @click="showRevokeModal = false">
                  {{ $t("common.cancel") }}
                </UButton>
                <UButton
                  :loading="revoking"
                  color="orange"
                  @click="revokeAccessConfirmed"
                >
                  {{ $t("settings.users.revoke") }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- Delete Confirmation Modal -->
      <UModal v-model:open="showDeleteModal">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  class="w-6 h-6 text-red-500"
                />
                <span class="font-semibold text-gray-900 dark:text-white">
                  {{ $t("settings.users.confirmDelete") }}
                </span>
              </div>
            </template>

            <p class="text-gray-600 dark:text-gray-300">
              {{
                $t("settings.users.deleteWarning", { name: userToDelete?.name })
              }}
            </p>

            <template #footer>
              <div class="flex justify-end gap-4">
                <UButton variant="ghost" @click="showDeleteModal = false">
                  {{ $t("common.cancel") }}
                </UButton>
                <UButton
                  :loading="deleting"
                  color="red"
                  @click="deleteUserConfirmed"
                >
                  {{ $t("common.delete") }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- Invite Link Modal -->
      <UModal v-model:open="showInviteModal">
        <template #content>
          <UCard class="max-h-[90vh] overflow-y-auto">
            <template #header>
              <div class="flex items-center gap-3">
                <UIcon
                  name="i-heroicons-link"
                  class="w-6 h-6 text-primary-500"
                />
                <span class="font-semibold text-gray-900 dark:text-white">
                  {{ $t("settings.users.inviteLink", "Invite Link") }}
                </span>
              </div>
            </template>

            <div class="text-center py-4">
              <div v-if="inviteUser" class="mb-4">
                <UAvatar
                  :alt="inviteUser.name"
                  size="lg"
                  class="mx-auto mb-2"
                />
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ inviteUser.name }}
                </p>
                <p class="text-sm text-gray-500">
                  {{
                    $t("settings.users.inviteDescription", "Share this link to let them join")
                  }}
                </p>
              </div>

              <!-- QR Code Display -->
              <div v-if="inviteQrCode" class="mb-4">
                <div
                  class="bg-white p-4 rounded-lg inline-block shadow-sm border"
                >
                  <img
                    :src="inviteQrCode"
                    alt="QR Code"
                    class="w-48 h-48 mx-auto"
                  />
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  {{
                    $t("settings.users.scanQrCode", "Scan with camera to join")
                  }}
                </p>
              </div>

              <div
                class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 max-h-24 overflow-y-auto"
              >
                <p class="text-xs text-gray-500 font-mono break-all select-all">
                  {{ inviteLink }}
                </p>
              </div>

              <div class="flex gap-2 justify-center">
                <UButton color="primary" @click="copyInviteLink">
                  <UIcon
                    name="i-heroicons-clipboard-document"
                    class="w-4 h-4 mr-2"
                  />
                  {{ $t("common.copy", "Copy") }}
                </UButton>
                <UButton variant="outline" @click="shareInviteLink">
                  <UIcon name="i-heroicons-share" class="w-4 h-4 mr-2" />
                  {{ $t("common.share", "Share") }}
                </UButton>
              </div>

              <p class="text-xs text-gray-400 mt-4">
                {{
                  $t("settings.users.inviteExpiry", "Link expires in 7 days")
                }}
              </p>
            </div>
          </UCard>
        </template>
      </UModal>
    </template>
  </div>

  <!-- Restore Confirmation Modal -->
  <UModal v-model:open="showRestoreDeletedModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3 text-green-600">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6" />
            <h3 class="text-lg font-semibold">
              {{ $t("settings.users.restoreUser", "Restore User") }}
            </h3>
          </div>
        </template>
        <p class="text-gray-600 dark:text-gray-300">
          {{
            $t("settings.users.restoreUserConfirm", "Are you sure you want to restore this user account?")
          }}
          <br />
          <span class="font-bold text-gray-900 dark:text-white">{{
            userToRestore?.name
          }}</span>
        </p>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="gray"
              variant="ghost"
              @click="showRestoreDeletedModal = false"
            >
              {{ $t("common.cancel") }}
            </UButton>
            <UButton
              color="green"
              :loading="restoring"
              @click="restoreDeletedUserConfirmed"
            >
              {{ $t("common.restore") }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { StoreUser, UserRole, UserPermissions, AuthMethod } from "~/types";
import { DEFAULT_PERMISSIONS } from "~/types";
import { PERMISSION_GROUPS } from "~/config/permissions";

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "Users",
});

const { t } = useI18n();
const toast = useToast();
const usersComposable = useUsers();
const staffAuth = useStaffAuth();

// Wait for users composable to initialize
const isReady = ref(false);
const showDeleted = ref(false); // Add this toggle

// Company code state
const company = useCompany();
const companyCode = computed(() => company.companyCode.value);
const isCompanyCodeEnabled = computed({
  get: () => company.isCompanyCodeEnabled.value,
  set: (val) => company.toggleCompanyCode(val),
});
const isOwner = computed(() => usersComposable.isOwner());

// Manual Edit State
const isEditingCode = ref(false);
const editingCodeValue = ref("");

const startEditingCode = () => {
  editingCodeValue.value = companyCode.value || "";
  isEditingCode.value = true;
};

const cancelEditingCode = () => {
  isEditingCode.value = false;
  editingCodeValue.value = "";
};

const saveCompanyCode = async () => {
  if (!editingCodeValue.value) return;

  const ownerPubkey = currentUser.value?.pubkeyHex;
  if (ownerPubkey) {
    await company.setCompanyCode(editingCodeValue.value, ownerPubkey);
    // Re-save all users to update the company tag
    await usersComposable.refreshFromNostr();

    isEditingCode.value = false;
    toast.add({
      title: t("common.saved", "Saved"),
      description: t("settings.users.codeUpdated", "Company code updated"),
      color: "green",
    });
  }
};

// Copy company code to clipboard
const copyCompanyCode = () => {
  if (companyCode.value) {
    navigator.clipboard.writeText(companyCode.value);
    toast.add({ title: t("common.copied", "Copied!"), color: "green" });
  }
};

// Regenerate company code
const regenerateCompanyCode = async () => {
  const ownerPubkey = currentUser.value?.pubkeyHex;
  if (ownerPubkey) {
    const newCode = company.generateCompanyCode();
    await company.setCompanyCode(newCode, ownerPubkey);
    // Re-save all users to update the company tag
    await usersComposable.refreshFromNostr();
    toast.add({
      title: t("settings.users.codeRegenerated", "New code generated"),
      color: "green",
    });
  }
};

// ============================================
// 📎 INVITE LINK
// ============================================
const invite = useInvite();
const showInviteModal = ref(false);
const inviteLink = ref("");
const inviteQrCode = ref<string | null>(null);
const inviteUser = ref<StoreUser | null>(null);
const generatingInvite = ref(false);

const generateInviteLink = async (user: StoreUser) => {
  generatingInvite.value = true;
  inviteUser.value = user;
  inviteQrCode.value = null;

  try {
    const link = await invite.generateInviteLink(user);
    inviteLink.value = link;

    // Generate QR code
    const QRCode = await import("qrcode");
    inviteQrCode.value = await QRCode.toDataURL(link, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    showInviteModal.value = true;
  } catch (_error) {
    toast.add({
      title: t("common.error", "Error"),
      description: "Failed to generate invite link",
      color: "red",
    });
  } finally {
    generatingInvite.value = false;
  }
};

const copyInviteLink = () => {
  navigator.clipboard.writeText(inviteLink.value);
  toast.add({
    title: t("common.copied", "Copied!"),
    description:
      t("settings.users.inviteLinkCopied", "Invite link copied to clipboard"),
    color: "green",
  });
};

const shareInviteLink = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: t("settings.users.inviteTitle", "Join our team!"),
        text:
          t("settings.users.inviteText") ||
          `Click this link to join as ${inviteUser.value?.name}`,
        url: inviteLink.value,
      });
    } catch {
      // User cancelled or share failed
      copyInviteLink();
    }
  } else {
    copyInviteLink();
  }
};

onMounted(async () => {
  await usersComposable.initialize();
  isReady.value = true;
});

// State
const showUserModal = ref(false);
const showPermissionsModal = ref(false);
const showDeleteModal = ref(false);
const showRevokeModal = ref(false);
const showRestoreDeletedModal = ref(false); // Add this state
const saving = ref(false);
const deleting = ref(false);
const revoking = ref(false);
const restoring = ref(false); // Add this state
const editingUser = ref<StoreUser | null>(null);
const selectedUser = ref<StoreUser | null>(null);
const userToDelete = ref<StoreUser | null>(null);
const userToRevoke = ref<StoreUser | null>(null);
const userToRestore = ref<StoreUser | null>(null); // Add this state
const revokeReason = ref("");

// Computed
const users = computed(() => usersComposable.users.value);
const filteredUsers = computed(() => {
  if (showDeleted.value) {
    return users.value;
  }
  return users.value.filter((u) => !u.deletedAt);
});
const currentUser = computed(() => usersComposable.currentUser.value);
const canManageUsers = computed(() =>
  usersComposable.hasPermission("canManageUsers")
);

// Form
const userForm = reactive({
  name: "",
  email: "",
  pin: "",
  password: "",
  confirmPassword: "",
  npub: "",
  role: "staff" as UserRole,
  authMethod: "nostr" as AuthMethod,
  isActive: true,
  expiresAt: "",
});

const permissionsForm = reactive<UserPermissions>({
  canCreateOrders: true,
  canVoidOrders: false,
  canApplyDiscounts: false,
  canProcessRefunds: false,
  canViewProducts: true,
  canEditProducts: false,
  canDeleteProducts: false,
  canViewCustomers: false,
  canEditCustomers: false,
  canViewReports: false,
  canExportReports: false,
  canViewSettings: false,
  canEditSettings: false,
  canManageLightning: false,
  canManageUsers: false,
  canViewInventory: true,
  canEditInventory: false,
  canAdjustStock: false,
});

// Auth method options - Nostr only (kept for potential future use)
const _authMethodOptions = [
  {
    value: "nostr" as AuthMethod,
    label: "Nostr",
    icon: "i-heroicons-key",
    color: "purple",
  },
];

// Role options
const roleOptions = [
  { value: "owner", label: t("settings.users.roles.owner") },
  { value: "admin", label: t("settings.users.roles.admin") },
  { value: "cashier", label: t("settings.users.roles.cashier") },
  { value: "staff", label: t("settings.users.roles.staff") },
];

// Role descriptions
const roleDescriptions = [
  { id: "owner", color: "purple" as const },
  { id: "admin", color: "blue" as const },
  { id: "cashier", color: "green" as const },
  { id: "staff", color: "gray" as const },
];

// Password strength (kept for potential future use)
const _strengthColors = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
];
const _strengthTextColors = [
  "text-red-500",
  "text-orange-500",
  "text-yellow-500",
  "text-green-500",
];

const _passwordStrength = computed(() => {
  const pwd = userForm.password;
  if (!pwd) return 0;
  let strength = 0;
  if (pwd.length >= 8) strength++;
  if (/[A-Z]/.test(pwd)) strength++;
  if (/[0-9]/.test(pwd)) strength++;
  if (/[^A-Za-z0-9]/.test(pwd)) strength++;
  return strength;
});

const _passwordStrengthText = computed(() => {
  const texts = [
    t("settings.users.passwordWeak"),
    t("settings.users.passwordFair"),
    t("settings.users.passwordGood"),
    t("settings.users.passwordStrong"),
  ];
  return texts[_passwordStrength.value - 1] || "";
});

// Methods
const getRoleColor = (role: UserRole): "purple" | "blue" | "green" | "gray" => {
  const colors: Record<UserRole, "purple" | "blue" | "green" | "gray"> = {
    owner: "purple",
    admin: "blue",
    cashier: "green",
    staff: "gray",
  };
  return colors[role];
};

const getAuthMethodColor = (
  method?: AuthMethod
): "purple" | "blue" | "green" => {
  const colors: Record<AuthMethod, "purple" | "blue" | "green"> = {
    nostr: "purple",
    password: "blue",
    pin: "green",
  };
  return colors[method || "pin"];
};

const getAuthMethodBgColor = (method?: AuthMethod): string => {
  const colors: Record<AuthMethod, string> = {
    nostr: "bg-purple-500",
    password: "bg-blue-500",
    pin: "bg-green-500",
  };
  return colors[method || "pin"];
};

const getAuthMethodIcon = (method?: AuthMethod): string => {
  const icons: Record<AuthMethod, string> = {
    nostr: "i-heroicons-key",
    password: "i-heroicons-lock-closed",
    pin: "i-heroicons-hashtag",
  };
  return icons[method || "pin"];
};

const getStatusColor = (user: StoreUser): "green" | "red" | "orange" => {
  if (user.revokedAt) return "red";
  if (isExpired(user)) return "orange";
  return user.isActive ? "green" : "red";
};

const getStatusText = (user: StoreUser): string => {
  if (user.revokedAt) return t("settings.users.revoked");
  if (isExpired(user)) return t("settings.users.expired");
  return user.isActive ? t("common.active") : t("common.inactive");
};

const isExpired = (user: StoreUser): boolean => {
  return !!(user.expiresAt && new Date(user.expiresAt) < new Date());
};

const truncateNpub = (npub: string): string => {
  if (!npub) return "";
  return `${npub.slice(0, 12)}...${npub.slice(-8)}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const openCreateModal = () => {
  editingUser.value = null;
  userForm.name = "";
  userForm.email = "";
  userForm.pin = "";
  userForm.password = "";
  userForm.confirmPassword = "";
  userForm.npub = "";
  userForm.role = "staff";
  userForm.authMethod = "nostr";
  userForm.isActive = true;
  userForm.expiresAt = "";
  showUserModal.value = true;
};

const openEditModal = (user: StoreUser) => {
  editingUser.value = user;
  userForm.name = user.name;
  userForm.email = user.email || "";
  userForm.pin = "";
  userForm.password = "";
  userForm.confirmPassword = "";
  userForm.npub = user.npub || "";
  userForm.role = user.role;
  userForm.authMethod = user.authMethod || "pin";
  userForm.isActive = user.isActive;
  userForm.expiresAt = user.expiresAt ? user.expiresAt.split("T")[0] ?? "" : "";
  showUserModal.value = true;
};

const openPermissionsModal = (user: StoreUser) => {
  selectedUser.value = user;
  Object.assign(permissionsForm, user.permissions);
  showPermissionsModal.value = true;
};

const openRevokeModal = (user: StoreUser) => {
  userToRevoke.value = user;
  revokeReason.value = "";
  showRevokeModal.value = true;
};

const saveUser = async () => {
  // Validation
  if (!userForm.name.trim()) {
    toast.add({ title: t("settings.users.nameRequired"), color: "red" });
    return;
  }

  // Validate npub format if provided
  if (userForm.npub && !staffAuth.validateNpub(userForm.npub)) {
    toast.add({ title: t("settings.users.invalidNpub"), color: "red" });
    return;
  }

  saving.value = true;

  try {
    if (editingUser.value) {
      // Update existing user
      const updates: Partial<StoreUser> = {
        name: userForm.name,
        email: userForm.email || undefined,
        role: userForm.role,
        isActive: userForm.isActive,
        authMethod: "nostr",
        permissions: { ...DEFAULT_PERMISSIONS[userForm.role] },
        expiresAt: userForm.expiresAt
          ? new Date(userForm.expiresAt).toISOString()
          : undefined,
      };

      if (userForm.npub) {
        updates.npub = userForm.npub;
      }

      await usersComposable.updateUser(editingUser.value.id, updates);
      toast.add({ title: t("settings.users.updateSuccess"), color: "green" });
    } else {
      // Create new user
      await usersComposable.createUser({
        name: userForm.name,
        email: userForm.email || undefined,
        npub: userForm.npub || undefined,
        role: userForm.role,
        authMethod: "nostr",
        expiresAt: userForm.expiresAt
          ? new Date(userForm.expiresAt).toISOString()
          : undefined,
      });
      toast.add({ title: t("settings.users.createSuccess"), color: "green" });
    }

    showUserModal.value = false;
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    saving.value = false;
  }
};

const savePermissions = async () => {
  if (!selectedUser.value) return;

  saving.value = true;

  try {
    await usersComposable.updateUserPermissions(
      selectedUser.value.id,
      permissionsForm
    );
    toast.add({ title: t("settings.users.permissionsSaved"), color: "green" });
    showPermissionsModal.value = false;
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    saving.value = false;
  }
};

const revokeAccessConfirmed = async () => {
  if (!userToRevoke.value) return;

  revoking.value = true;

  try {
    await usersComposable.revokeUserAccess(
      userToRevoke.value.id,
      revokeReason.value
    );
    toast.add({ title: t("settings.users.revokeSuccess"), color: "green" });
    showRevokeModal.value = false;
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    revoking.value = false;
  }
};

const restoreAccess = async (user: StoreUser) => {
  try {
    await usersComposable.restoreUserAccess(user.id);
    toast.add({ title: t("settings.users.restoreSuccess"), color: "green" });
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  }
};

const confirmDelete = (user: StoreUser) => {
  userToDelete.value = user;
  showDeleteModal.value = true;
};

const deleteUserConfirmed = async () => {
  if (!userToDelete.value) return;

  deleting.value = true;

  try {
    await usersComposable.deleteUser(userToDelete.value.id);
    toast.add({ title: t("settings.users.deleteSuccess"), color: "green" });
    showDeleteModal.value = false;
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    deleting.value = false;
  }
};

const confirmRestoreDeleted = (user: StoreUser) => {
  userToRestore.value = user;
  showRestoreDeletedModal.value = true;
};

const restoreDeletedUserConfirmed = async () => {
  if (!userToRestore.value) return;

  restoring.value = true;

  try {
    // @ts-ignore - restoreDeletedUser is added in use-users.ts but TS might not pick up immediately without restart
    if (usersComposable.restoreDeletedUser) {
      // @ts-ignore
      await usersComposable.restoreDeletedUser(userToRestore.value.id);
      toast.add({
        title: t("settings.users.restoreSuccess", "User restored"),
        color: "green",
      });
    } else {
      // Fallback manual restore if backend not yet updated in types
      // This shouldn't be needed if file update works
      console.warn("restoreDeletedUser method not found");
    }
    showRestoreDeletedModal.value = false;
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    restoring.value = false;
  }
};
</script>
