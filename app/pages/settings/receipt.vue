<template>
  <div class="p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <CommonPageHeader
      :title="$t('settings.receipt.title')"
      :description="$t('settings.receipt.description')"
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="outline"
          :label="$t('settings.receipt.printTest')"
          icon="i-heroicons-printer"
          @click="printTestReceipt"
        />
        <UButton
          color="primary"
          :label="$t('common.save')"
          icon="i-heroicons-check"
          :loading="saving"
          @click="saveSettings"
        />
      </template>
    </CommonPageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <!-- Settings Panel -->
      <div class="space-y-6">
        <!-- Logo Settings -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-photo" class="w-5 h-5 text-primary" />
              <span class="font-semibold">{{
                $t("settings.receipt.logo.title")
              }}</span>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Storage Type Selector -->
            <UFormField :label="$t('settings.receipt.logo.storageType')">
              <div class="flex flex-col gap-2 mt-1">
                <label
                  class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="
                    settings.logoStorageType === 'local'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  "
                >
                  <input
                    type="radio"
                    v-model="settings.logoStorageType"
                    value="local"
                    class="mt-0.5"
                  />
                  <div>
                    <div class="font-medium flex items-center gap-2">
                      <UIcon
                        name="i-heroicons-device-phone-mobile"
                        class="w-4 h-4"
                      />
                      {{ $t("settings.receipt.logo.storageLocal") }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ $t("settings.receipt.logo.storageLocalDesc") }}
                    </div>
                  </div>
                </label>
                <label
                  class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="
                    settings.logoStorageType === 'cloudinary'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  "
                >
                  <input
                    type="radio"
                    v-model="settings.logoStorageType"
                    value="cloudinary"
                    class="mt-0.5"
                  />
                  <div>
                    <div class="font-medium flex items-center gap-2">
                      <UIcon
                        name="i-heroicons-cloud-arrow-up"
                        class="w-4 h-4"
                      />
                      {{ $t("settings.receipt.logo.storageCloudinary") }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ $t("settings.receipt.logo.storageCloudinaryDesc") }}
                    </div>
                  </div>
                </label>
              </div>
            </UFormField>

            <!-- Logo Preview and Upload -->
            <div class="flex items-center gap-4">
              <div
                class="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden relative"
              >
                <div
                  v-if="uploadingLogo"
                  class="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-6 h-6 animate-spin text-primary"
                  />
                </div>
                <img
                  v-if="settings.logo"
                  :src="settings.logo"
                  alt="Logo"
                  class="max-w-full max-h-full object-contain"
                />
                <UIcon
                  v-else
                  name="i-heroicons-photo"
                  class="w-8 h-8 text-gray-400"
                />
              </div>
              <div class="flex flex-col gap-2">
                <UButton
                  color="primary"
                  variant="outline"
                  :label="
                    uploadingLogo
                      ? $t('settings.receipt.logo.uploading')
                      : $t('settings.receipt.logo.upload')
                  "
                  :icon="
                    uploadingLogo
                      ? 'i-heroicons-arrow-path'
                      : 'i-heroicons-arrow-up-tray'
                  "
                  size="sm"
                  :loading="uploadingLogo"
                  :disabled="uploadingLogo"
                  @click="triggerLogoUpload"
                />
                <UButton
                  v-if="settings.logo"
                  color="error"
                  variant="ghost"
                  :label="$t('settings.receipt.logo.remove')"
                  icon="i-heroicons-trash"
                  size="sm"
                  :disabled="uploadingLogo"
                  @click="removeLogo"
                />
                <input
                  ref="logoInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleLogoUpload"
                />
                <p class="text-xs text-gray-500">
                  {{ $t("settings.receipt.logo.maxSize") }}
                </p>
              </div>
            </div>
            <UCheckbox
              v-model="settings.showLogo"
              :label="$t('settings.receipt.logo.showOnReceipt')"
            />
          </div>
        </UCard>

        <!-- Header Settings -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-document-text"
                class="w-5 h-5 text-primary"
              />
              <span class="font-semibold">{{
                $t("settings.receipt.header.title")
              }}</span>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="$t('settings.receipt.header.businessName')">
              <UInput v-model="settings.header.businessName" class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.receipt.header.address')">
              <UTextarea
                v-model="settings.header.address"
                :rows="2"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.receipt.header.phone')">
              <UInput
                v-model="settings.header.phone"
                type="tel"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.receipt.header.email')">
              <UInput
                v-model="settings.header.email"
                type="email"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.receipt.header.taxId')">
              <UInput v-model="settings.header.taxId" class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.receipt.header.customText')">
              <UTextarea
                v-model="settings.header.customText"
                :rows="2"
                :placeholder="
                  $t('settings.receipt.header.customTextPlaceholder')
                "
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Content Settings -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-list-bullet"
                class="w-5 h-5 text-primary"
              />
              <span class="font-semibold">{{
                $t("settings.receipt.content.title")
              }}</span>
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-gray-500">
              {{ $t("settings.receipt.content.description") }}
            </p>

            <div class="grid grid-cols-2 gap-3">
              <UCheckbox
                v-model="settings.content.showOrderSequence"
                :label="$t('settings.receipt.content.currentSequence')"
              />
              <UCheckbox
                v-model="settings.content.showOrderNumber"
                :label="$t('settings.receipt.content.orderNumber')"
              />
              <UCheckbox
                v-model="settings.content.showDateTime"
                :label="$t('settings.receipt.content.dateTime')"
              />
              <UCheckbox
                v-model="settings.content.showCashier"
                :label="$t('settings.receipt.content.cashier')"
              />
              <UCheckbox
                v-model="settings.content.showCustomer"
                :label="$t('settings.receipt.content.customer')"
              />
              <UCheckbox
                v-model="settings.content.showItemSku"
                :label="$t('settings.receipt.content.itemSku')"
              />
              <UCheckbox
                v-model="settings.content.showItemPrice"
                :label="$t('settings.receipt.content.itemPrice')"
              />
              <UCheckbox
                v-model="settings.content.showSubtotal"
                :label="$t('settings.receipt.content.subtotal')"
              />
              <UCheckbox
                v-model="settings.content.showDiscount"
                :label="$t('settings.receipt.content.discount')"
              />
              <UCheckbox
                v-model="settings.content.showTax"
                :label="$t('settings.receipt.content.tax')"
              />
              <UCheckbox
                v-model="settings.content.showTaxBreakdown"
                :label="$t('settings.receipt.content.taxBreakdown')"
              />
              <UCheckbox
                v-model="settings.content.showPaymentMethod"
                :label="$t('settings.receipt.content.paymentMethod')"
              />
              <UCheckbox
                v-model="settings.content.showChange"
                :label="$t('settings.receipt.content.change')"
              />
            </div>

            <!-- Daily Order Number Reset -->
            <div
              class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800"
            >
              <h4 class="text-sm font-medium mb-3">
                {{
                  $t("settings.receipt.content.dailyOrderNumber", "Daily Order Number Sequence")
                }}
              </h4>
              <div class="flex items-end gap-3">
                <UFormField
                  :label="
                    $t('settings.receipt.content.currentSequence', 'Current Sequence')
                  "
                  name="orderNumber"
                  class="flex-1"
                >
                  <UInput
                    v-model="currentOrderSequence"
                    type="number"
                    min="0"
                  />
                </UFormField>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{
                  $t("settings.receipt.content.sequenceHint", "Manually reset the daily counter. The next order will be this number + 1.")
                }}
              </p>
              <div class="mt-3">
                <UCheckbox
                  v-model="autoResetDailyLocal"
                  :label="
                    $t('settings.receipt.content.autoResetDaily', 'Auto-reset daily')
                  "
                />
                <p class="text-xs text-gray-500 mt-1 ml-6">
                  {{
                    $t(
                      "settings.receipt.content.autoResetDailyHint",
                      `When enabled, the sequence resets to 0 at the start of each day. When disabled, the sequence
                  continues
                  indefinitely.`
                    )
                  }}
                </p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Footer Settings -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-chat-bubble-bottom-center-text"
                class="w-5 h-5 text-primary"
              />
              <span class="font-semibold">{{
                $t("settings.receipt.footer.title")
              }}</span>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="$t('settings.receipt.footer.thankYouMessage')">
              <UInput
                v-model="settings.footer.thankYouMessage"
                :placeholder="$t('settings.receipt.footer.thankYouPlaceholder')"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.receipt.footer.returnPolicy')">
              <UTextarea
                v-model="settings.footer.returnPolicy"
                :rows="2"
                :placeholder="
                  $t('settings.receipt.footer.returnPolicyPlaceholder')
                "
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.receipt.footer.customText')">
              <UTextarea
                v-model="settings.footer.customText"
                :rows="2"
                :placeholder="
                  $t('settings.receipt.footer.customTextPlaceholder')
                "
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UCheckbox
                v-model="settings.footer.showQrCode"
                :label="$t('settings.receipt.footer.showQrCode')"
              />
              <UCheckbox
                v-model="settings.footer.showBarcode"
                :label="$t('settings.receipt.footer.showBarcode')"
              />
              <UCheckbox
                v-model="settings.footer.showSocialMedia"
                :label="$t('settings.receipt.footer.showSocialMedia')"
              />
              <UCheckbox
                v-model="settings.footer.showWebsite"
                :label="$t('settings.receipt.footer.showWebsite')"
              />
            </div>

            <UFormField
              v-if="settings.footer.showWebsite"
              :label="$t('settings.receipt.footer.websiteUrl')"
            >
              <UInput
                v-model="settings.footer.websiteUrl"
                type="url"
                class="w-full"
              />
            </UFormField>

            <!-- E-Bill URL Setting -->
            <UFormField
              v-if="settings.footer.showQrCode"
              :label="$t('settings.receipt.footer.eBillBaseUrl')"
            >
              <UInput
                v-model="settings.eBillBaseUrl"
                type="url"
                :placeholder="
                  $t('settings.receipt.footer.eBillBaseUrlPlaceholder')
                "
                class="w-full"
              />
              <template #hint>
                <span class="text-xs text-gray-500">
                  {{ $t("settings.receipt.footer.eBillBaseUrlHint") }}
                </span>
              </template>
            </UFormField>
          </div>
        </UCard>

        <!-- Paper & Print Settings -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-printer" class="w-5 h-5 text-primary" />
              <span class="font-semibold">{{
                $t("settings.receipt.paper.title")
              }}</span>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="$t('settings.receipt.paper.width')">
              <USelect
                v-model="settings.paper.width"
                :items="paperWidthOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.receipt.paper.fontSize')">
              <USelect
                v-model="settings.paper.fontSize"
                :items="fontSizeOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.receipt.paper.copies')">
              <UInput
                v-model.number="settings.paper.copies"
                type="number"
                min="1"
                max="5"
                class="w-full"
              />
            </UFormField>

            <UCheckbox
              v-model="settings.paper.autoPrint"
              :label="$t('settings.receipt.paper.autoPrint')"
            />
          </div>
        </UCard>
      </div>

      <!-- Preview Panel -->
      <div>
        <div class="sticky top-6">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-eye" class="w-5 h-5 text-primary" />
                  <span class="font-semibold">{{
                    $t("settings.receipt.preview.title")
                  }}</span>
                </div>
                <UBadge color="info" variant="subtle">{{
                  $t("settings.receipt.preview.live")
                }}</UBadge>
              </div>
            </template>

            <!-- Receipt Preview Container - with dark mode background -->
            <div
              class="flex justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
            >
              <!-- Receipt Paper - always white like thermal paper -->
              <div
                ref="receiptPreview"
                class="bg-white text-gray-900 p-4 shadow-xl font-mono rounded-sm border border-gray-200 dark:border-gray-700 transition-all"
                :style="{
                  width: `${paperWidthPx}px`,
                  fontSize: `${settings.paper.fontSize}px`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }"
              >
                <!-- Logo -->
                <div
                  v-if="settings.showLogo && settings.logo"
                  class="text-center mb-3"
                >
                  <img
                    :src="settings.logo"
                    alt="Logo"
                    class="max-h-12 mx-auto"
                  />
                </div>

                <!-- Header -->
                <div
                  class="text-center border-b border-dashed border-gray-400 pb-2 mb-2"
                >
                  <div
                    v-if="settings.header.businessName"
                    class="font-bold text-lg text-gray-900"
                  >
                    {{ settings.header.businessName }}
                  </div>
                  <div
                    v-if="settings.header.address"
                    class="text-xs text-gray-600"
                  >
                    {{ settings.header.address }}
                  </div>
                  <div
                    v-if="settings.header.phone"
                    class="text-xs text-gray-600"
                  >
                    {{ $t("settings.receipt.preview.tel") }}:
                    {{ settings.header.phone }}
                  </div>
                  <div
                    v-if="settings.header.email"
                    class="text-xs text-gray-600"
                  >
                    {{ settings.header.email }}
                  </div>
                  <div
                    v-if="settings.header.taxId"
                    class="text-xs text-gray-600"
                  >
                    {{ $t("settings.receipt.preview.taxId") }}:
                    {{ settings.header.taxId }}
                  </div>
                  <div v-if="settings.header.customText" class="text-xs mt-1">
                    {{ settings.header.customText }}
                  </div>
                </div>

                <!-- Order Info -->
                <div
                  class="border-b border-dashed border-gray-400 pb-2 mb-2 text-xs"
                >
                  <div
                    v-if="settings.content.showOrderSequence"
                    class="flex justify-between"
                  >
                    <span> No: </span>
                    <span>#{{ currentOrderSequence }}</span>
                  </div>
                  <div
                    v-if="settings.content.showOrderNumber"
                    class="flex justify-between"
                  >
                    <span>{{ $t("settings.receipt.preview.orderNo") }}:</span>
                    <span>#ORD-001234</span>
                  </div>
                  <div
                    v-if="settings.content.showDateTime"
                    class="flex justify-between"
                  >
                    <span>{{ $t("settings.receipt.preview.date") }}:</span>
                    <span>{{ new Date().toLocaleString() }}</span>
                  </div>
                  <div
                    v-if="settings.content.showCashier"
                    class="flex justify-between"
                  >
                    <span>{{ $t("settings.receipt.preview.cashier") }}:</span>
                    <span>John Doe</span>
                  </div>
                  <div
                    v-if="settings.content.showCustomer"
                    class="flex justify-between"
                  >
                    <span>{{ $t("settings.receipt.preview.customer") }}:</span>
                    <span>Jane Smith</span>
                  </div>
                </div>

                <!-- Items -->
                <div
                  class="border-b border-dashed dark:border-gray-700 border-gray-400 pb-2 mb-2"
                >
                  <div class="text-xs font-bold mb-1">
                    {{ $t("settings.receipt.preview.items") }}
                  </div>
                  <div
                    v-for="item in sampleItems"
                    :key="item.name"
                    class="text-xs mb-1"
                  >
                    <div class="flex justify-between text-gray-900">
                      <span>{{ item.name }}</span>
                      <span>{{ formatCurrency(item.price * item.qty) }}</span>
                    </div>
                    <div class="flex justify-between text-gray-600">
                      <span
                        >{{ item.qty }} x {{ formatCurrency(item.price) }}</span
                      >
                      <span v-if="settings.content.showItemSku">{{
                        item.sku
                      }}</span>
                    </div>
                  </div>
                </div>

                <!-- Totals -->
                <div class="text-xs mb-2">
                  <div
                    v-if="settings.content.showSubtotal"
                    class="flex justify-between"
                  >
                    <span>{{ $t("settings.receipt.preview.subtotal") }}:</span>
                    <span>{{ formatCurrency(sampleSubtotal) }}</span>
                  </div>
                  <div
                    v-if="settings.content.showDiscount"
                    class="flex justify-between text-green-600"
                  >
                    <span>{{ $t("settings.receipt.preview.discount") }}:</span>
                    <span>-{{ formatCurrency(5) }}</span>
                  </div>
                  <div
                    v-if="settings.content.showTax"
                    class="flex justify-between"
                  >
                    <span>{{ $t("settings.receipt.preview.tax") }} (10%):</span>
                    <span>{{ formatCurrency(sampleSubtotal * 0.1) }}</span>
                  </div>
                  <div
                    v-if="settings.content.showTaxBreakdown"
                    class="text-gray-500 pl-2"
                  >
                    <div class="flex justify-between">
                      <span>VAT 7%:</span>
                      <span>{{ formatCurrency(sampleSubtotal * 0.07) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Service 3%:</span>
                      <span>{{ formatCurrency(sampleSubtotal * 0.03) }}</span>
                    </div>
                  </div>
                  <div
                    class="flex justify-between font-bold text-sm border-t dark:border-gray-700 border-gray-300 mt-1 pt-1"
                  >
                    <span>{{ $t("settings.receipt.preview.total") }}:</span>
                    <span>{{ formatCurrency(sampleTotal) }}</span>
                  </div>
                </div>

                <!-- Payment Info -->
                <div
                  v-if="
                    settings.content.showPaymentMethod ||
                    settings.content.showChange
                  "
                  class="border-t dark:border-gray-700 border-dashed border-gray-400 pt-2 mb-2 text-xs"
                >
                  <div
                    v-if="settings.content.showPaymentMethod"
                    class="flex justify-between"
                  >
                    <span
                      >{{ $t("settings.receipt.preview.paymentMethod") }}:</span
                    >
                    <span>Cash</span>
                  </div>
                  <div
                    v-if="settings.content.showPaymentMethod"
                    class="flex justify-between"
                  >
                    <span>{{ $t("settings.receipt.preview.received") }}:</span>
                    <span>{{ formatCurrency(50) }}</span>
                  </div>
                  <div
                    v-if="settings.content.showChange"
                    class="flex justify-between font-bold"
                  >
                    <span>{{ $t("settings.receipt.preview.change") }}:</span>
                    <span>{{ formatCurrency(50 - sampleTotal) }}</span>
                  </div>
                </div>

                <!-- Footer -->
                <div
                  class="text-center text-xs border-t border-dashed border-gray-400 pt-2 text-gray-900"
                >
                  <div
                    v-if="settings.footer.thankYouMessage"
                    class="font-bold mb-1 text-gray-900"
                  >
                    {{ settings.footer.thankYouMessage }}
                  </div>
                  <div
                    v-if="settings.footer.returnPolicy"
                    class="text-gray-500 mb-1"
                  >
                    {{ settings.footer.returnPolicy }}
                  </div>
                  <div v-if="settings.footer.customText" class="mb-1">
                    {{ settings.footer.customText }}
                  </div>
                  <div
                    v-if="
                      settings.footer.showWebsite && settings.footer.websiteUrl
                    "
                    class="mb-1"
                  >
                    {{ settings.footer.websiteUrl }}
                  </div>
                  <div
                    v-if="settings.footer.showQrCode"
                    class="flex justify-center my-2"
                  >
                    <div
                      class="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs text-gray-400"
                    >
                      QR Code
                    </div>
                  </div>
                  <div
                    v-if="settings.footer.showBarcode"
                    class="flex justify-center my-2"
                  >
                    <div
                      class="h-8 w-32 bg-gray-200 flex items-center justify-center text-xs text-gray-400"
                    >
                      |||||||||||||||
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Templates Section -->
    <UCard class="mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-document-duplicate"
              class="w-5 h-5 text-primary"
            />
            <span class="font-semibold">{{
              $t("settings.receipt.templates.title")
            }}</span>
          </div>
          <UButton
            color="primary"
            variant="outline"
            :label="$t('settings.receipt.templates.saveAsTemplate')"
            icon="i-heroicons-plus"
            size="sm"
            @click="saveAsTemplate"
          />
        </div>
      </template>

      <div v-if="templates.length === 0" class="text-center py-8 text-gray-500">
        <UIcon
          name="i-heroicons-document-duplicate"
          class="w-12 h-12 mx-auto mb-2 opacity-50"
        />
        <p>{{ $t("settings.receipt.templates.empty") }}</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="template in templates"
          :key="template.id"
          class="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
          :class="{
            'border-primary bg-primary/5': activeTemplateId === template.id,
          }"
          @click="loadTemplate(template)"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="font-medium">{{ template.name }}</div>
              <div class="text-xs text-gray-500">
                {{ new Date(template.createdAt).toLocaleDateString() }}
              </div>
            </div>
            <UDropdownMenu :items="getTemplateActions(template)">
              <UButton
                icon="i-heroicons-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                size="xs"
                @click.stop
              />
            </UDropdownMenu>
          </div>
          <div v-if="template.isDefault" class="mt-2">
            <UBadge color="primary" variant="subtle" size="xs">
              {{ $t("settings.receipt.templates.default") }}
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Save Template Modal -->
    <UModal v-model:open="showTemplateModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">{{
                $t("settings.receipt.templates.saveTitle")
              }}</span>
              <UButton
                icon="i-heroicons-x-mark"
                color="neutral"
                variant="ghost"
                @click="showTemplateModal = false"
              />
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="$t('settings.receipt.templates.name')">
              <UInput v-model="newTemplateName" class="w-full" />
            </UFormField>
            <UCheckbox
              v-model="newTemplateIsDefault"
              :label="$t('settings.receipt.templates.setAsDefault')"
            />
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :label="$t('common.cancel')"
                @click="showTemplateModal = false"
              />
              <UButton
                color="primary"
                :label="$t('common.save')"
                @click="confirmSaveTemplate"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "permission"],
});

useHead({
  title: "Receipt Settings",
});

const { t } = useI18n();
const toast = useToast();
const shop = useShop();
const receipt = useReceipt(); // Use the composable
const orderNumberStore = useOrderNumber();
const { formatCurrency } = useCurrency();
const cloudinary = useCloudinary();

// State
const saving = ref(false);
const uploadingLogo = ref(false);
const logoInput = ref<HTMLInputElement | null>(null);
const receiptPreview = ref<HTMLElement | null>(null);

type LogoStorageType = "local" | "cloudinary";

interface ReceiptSettings {
  logo: string;
  logoStorageType: LogoStorageType;
  showLogo: boolean;
  eBillBaseUrl: string;
  header: {
    businessName: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
    customText: string;
  };
  content: {
    showOrderSequence: boolean;
    showOrderNumber: boolean;
    showDateTime: boolean;
    showCashier: boolean;
    showCustomer: boolean;
    showItemSku: boolean;
    showItemPrice: boolean;
    showSubtotal: boolean;
    showDiscount: boolean;
    showTax: boolean;
    showTaxBreakdown: boolean;
    showPaymentMethod: boolean;
    showChange: boolean;
  };
  footer: {
    thankYouMessage: string;
    returnPolicy: string;
    customText: string;
    showQrCode: boolean;
    showBarcode: boolean;
    showSocialMedia: boolean;
    showWebsite: boolean;
    websiteUrl: string;
  };
  paper: {
    width: string;
    fontSize: number;
    copies: number;
    autoPrint: boolean;
  };
}

interface ReceiptTemplate {
  id: string;
  name: string;
  settings: ReceiptSettings;
  isDefault: boolean;
  createdAt: string;
}

const defaultSettings: ReceiptSettings = {
  logo: "",
  logoStorageType: "local",
  showLogo: true,
  eBillBaseUrl: "", // Empty = auto-detect from current URL
  header: {
    businessName: "bnos.space",
    address: "",
    phone: "",
    email: "",
    taxId: "",
    customText: "",
  },
  content: {
    showOrderSequence: true,
    showOrderNumber: true,
    showDateTime: true,
    showCashier: true,
    showCustomer: true,
    showItemSku: true,
    showItemPrice: true,
    showSubtotal: true,
    showDiscount: true,
    showTax: true,
    showTaxBreakdown: false,
    showPaymentMethod: true,
    showChange: true,
  },
  footer: {
    thankYouMessage: "Thank you for your purchase!",
    returnPolicy: "Returns accepted within 30 days with receipt",
    customText: "",
    showQrCode: false,
    showBarcode: true,
    showSocialMedia: false,
    showWebsite: false,
    websiteUrl: "",
  },
  paper: {
    width: "80mm",
    fontSize: 12,
    copies: 1,
    autoPrint: false,
  },
};

const settings = ref<ReceiptSettings>(
  JSON.parse(JSON.stringify(defaultSettings))
);
const templates = ref<ReceiptTemplate[]>([]);
const activeTemplateId = ref<string | null>(null);

// Template modal
const showTemplateModal = ref(false);
const newTemplateName = ref("");
const newTemplateIsDefault = ref(false);
const currentOrderSequence = ref(0);
const autoResetDailyLocal = ref(true);

// Options
const paperWidthOptions = [
  { value: "58mm", label: '58mm (2.25")' },
  { value: "80mm", label: '80mm (3.15")' },
  { value: "112mm", label: '112mm (4.41")' },
];

const fontSizeOptions = [
  { value: 10, label: "10px - Small" },
  { value: 12, label: "12px - Normal" },
  { value: 14, label: "14px - Large" },
];

// Sample data for preview
const sampleItems = [
  { name: "Coffee Latte", sku: "SKU001", price: 5.5, qty: 2 },
  { name: "Croissant", sku: "SKU002", price: 3.0, qty: 1 },
  { name: "Orange Juice", sku: "SKU003", price: 4.0, qty: 1 },
];

const sampleSubtotal = computed(() => {
  return sampleItems.reduce((sum, item) => sum + item.price * item.qty, 0);
});

const sampleTotal = computed(() => {
  return sampleSubtotal.value * 1.1 - 5; // 10% tax, $5 discount
});

const paperWidthPx = computed(() => {
  const widthMap: Record<string, number> = {
    "58mm": 220,
    "80mm": 300,
    "112mm": 420,
  };
  return widthMap[settings.value.paper.width] || 300;
});

// Methods
function triggerLogoUpload() {
  logoInput.value?.click();
}

async function handleLogoUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    toast.add({
      title: t("common.error"),
      description: t("settings.receipt.logo.maxSize"),
      color: "error",
    });
    return;
  }

  // Check storage type
  if (settings.value.logoStorageType === "cloudinary") {
    // Upload to Cloudinary
    if (!cloudinary.isConfigured()) {
      toast.add({
        title: t("common.error"),
        description: t("settings.receipt.logo.cloudinaryNotConfigured"),
        color: "error",
      });
      return;
    }

    uploadingLogo.value = true;
    try {
      const result = await cloudinary.uploadImage(file);
      if (result) {
        settings.value.logo = result.url;
        toast.add({
          title: t("settings.receipt.logo.uploadSuccess"),
          color: "success",
        });
      } else {
        toast.add({
          title: t("settings.receipt.logo.uploadFailed"),
          description: cloudinary.error.value || "Unknown error",
          color: "error",
        });
      }
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      toast.add({
        title: t("settings.receipt.logo.uploadFailed"),
        color: "error",
      });
    } finally {
      uploadingLogo.value = false;
    }
  } else {
    // Local storage (base64)
    const reader = new FileReader();
    reader.onload = (e) => {
      settings.value.logo = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Clear input so same file can be re-selected
  target.value = "";
}

function removeLogo() {
  settings.value.logo = "";
}

async function saveSettings() {
  saving.value = true;
  try {
    localStorage.setItem(
      "pos_receipt_settings",
      JSON.stringify(settings.value)
    );
    orderNumberStore.resetSequence(Number(currentOrderSequence.value));
    orderNumberStore.setAutoResetDaily(autoResetDailyLocal.value);
    toast.add({
      title: t("settings.receipt.messages.saveSuccess"),
      color: "success",
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    toast.add({
      title: t("settings.receipt.messages.saveError"),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

function printTestReceipt() {
  if (!receiptPreview.value) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Receipt</title>
      <style>
        body { 
          font-family: monospace; 
          margin: 0; 
          padding: 20px;
        }
        @media print {
          body { margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body>
      ${receiptPreview.value.innerHTML}
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
}

function saveAsTemplate() {
  newTemplateName.value = "";
  newTemplateIsDefault.value = false;
  showTemplateModal.value = true;
}

function confirmSaveTemplate() {
  if (!newTemplateName.value.trim()) {
    toast.add({
      title: t("settings.receipt.messages.templateNameRequired"),
      color: "error",
    });
    return;
  }

  const template: ReceiptTemplate = {
    id: Date.now().toString(),
    name: newTemplateName.value,
    settings: JSON.parse(JSON.stringify(settings.value)),
    isDefault: newTemplateIsDefault.value,
    createdAt: new Date().toISOString(),
  };

  // If setting as default, unset other defaults
  if (newTemplateIsDefault.value) {
    templates.value.forEach((t) => (t.isDefault = false));
  }

  templates.value.push(template);
  activeTemplateId.value = template.id;
  saveTemplates();

  showTemplateModal.value = false;
  toast.add({
    title: t("settings.receipt.messages.templateSaved"),
    color: "success",
  });
}

function loadTemplate(template: ReceiptTemplate) {
  settings.value = JSON.parse(JSON.stringify(template.settings));
  activeTemplateId.value = template.id;
  toast.add({
    title: t("settings.receipt.messages.templateLoaded"),
    color: "success",
  });
}

function getTemplateActions(template: ReceiptTemplate) {
  return [
    [
      {
        label: t("settings.receipt.templates.setAsDefault"),
        icon: "i-heroicons-star",
        disabled: template.isDefault,
        onSelect: () => setAsDefault(template),
      },
      {
        label: t("common.delete"),
        icon: "i-heroicons-trash",
        color: "error" as const,
        onSelect: () => deleteTemplate(template),
      },
    ],
  ];
}

function setAsDefault(template: ReceiptTemplate) {
  templates.value.forEach((t) => (t.isDefault = false));
  template.isDefault = true;
  saveTemplates();
  toast.add({
    title: t("settings.receipt.messages.defaultSet"),
    color: "success",
  });
}

function deleteTemplate(template: ReceiptTemplate) {
  const index = templates.value.findIndex((t) => t.id === template.id);
  if (index !== -1) {
    templates.value.splice(index, 1);
    if (activeTemplateId.value === template.id) {
      activeTemplateId.value = null;
    }
    saveTemplates();
    toast.add({
      title: t("settings.receipt.messages.templateDeleted"),
      color: "success",
    });
  }
}

function saveTemplates() {
  localStorage.setItem(
    "pos_receipt_templates",
    JSON.stringify(templates.value)
  );
}

function loadData() {
  // Load settings
  const savedSettings = localStorage.getItem("pos_receipt_settings");
  const savedSequence = localStorage.getItem("bitspace_order_sequence");
  const savedAutoReset = localStorage.getItem(
    "bitspace_order_auto_reset_daily"
  );
  currentOrderSequence.value = savedSequence ? parseInt(savedSequence) : 0;
  autoResetDailyLocal.value = savedAutoReset !== "false"; // Default to true
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      settings.value = { ...defaultSettings, ...parsed };
    } catch {
      // Use defaults
    }
  }

  // Load templates
  const savedTemplates = localStorage.getItem("pos_receipt_templates");
  if (savedTemplates) {
    try {
      templates.value = JSON.parse(savedTemplates);
    } catch {
      templates.value = [];
    }
  }
}

onMounted(() => {
  loadData();
});
</script>
