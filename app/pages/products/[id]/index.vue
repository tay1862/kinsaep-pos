<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4"
    >
      <div class="flex items-center gap-4">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          @click="navigateTo('/products')"
        />
        <div v-if="product" class="flex items-center gap-4">
          <div
            class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-700"
          >
            <img
              v-if="product.image && product.image.startsWith('http')"
              :src="product.image"
              :alt="product.name"
              class="w-full h-full object-cover"
            />
            <span v-else-if="product.image" class="text-3xl">{{
              product.image
            }}</span>
            <UIcon
              v-else
              name="i-heroicons-cube"
              class="w-8 h-8 text-gray-400"
            />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ product.name }}
            </h1>
            <div class="flex items-center gap-2 mt-1">
              <UBadge
                :color="product.status === 'active' ? 'green' : 'gray'"
                :label="$t(`common.${product.status}`)"
              />
              <span class="text-sm text-gray-500">
                {{ product.sku }}
              </span>
              <span v-if="product.barcode" class="text-sm text-gray-500">
                • {{ $t("products.barcode") }}: {{ product.barcode }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="flex items-center gap-4">
          <USkeleton class="w-16 h-16 rounded-xl" />
          <div>
            <USkeleton class="h-6 w-48 mb-2" />
            <USkeleton class="h-4 w-32" />
          </div>
        </div>
      </div>
      <div v-if="product" class="flex items-center gap-2">
        <UButton
          v-if="canEditProducts"
          color="primary"
          variant="soft"
          icon="i-heroicons-pencil"
          :label="$t('common.edit')"
          @click="openProductModal"
        />
        <UButton
          v-if="canDeleteProducts"
          color="red"
          variant="soft"
          icon="i-heroicons-trash"
          :label="$t('common.delete')"
          @click="confirmDelete"
        />
      </div>
    </div>

    <!-- Tabs -->
    <div v-if="product" class="px-4">
      <UTabs v-model="activeTab" :items="tabs">
        <template #content="{ item }">
          <!-- Overview Tab -->
          <div v-if="item.value === 'overview'" class="pt-6 space-y-6">
            <!-- Product Info Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <CommonStatCard
                :label="$t('products.price')"
                :value="formatCurrency(product.price)"
                icon="i-heroicons-currency-dollar"
                icon-color="green"
              />
              <CommonStatCard
                :label="$t('products.stock')"
                :value="String(product.stock)"
                icon="i-heroicons-cube"
                :icon-color="product.stock <= product.minStock ? 'red' : 'blue'"
              />
              <CommonStatCard
                :label="$t('products.minStock')"
                :value="String(product.minStock)"
                icon="i-heroicons-exclamation-triangle"
                icon-color="yellow"
              />
              <CommonStatCard
                :label="$t('products.category')"
                :value="getCategoryName(product.categoryId)"
                icon="i-heroicons-folder"
                icon-color="purple"
              />
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Basic Info -->
              <div
                class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
              >
                <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t("products.basicInfo") }}
                </h3>
                <dl class="space-y-3">
                  <div class="flex justify-between">
                    <dt class="text-gray-500">{{ $t("products.sku") }}</dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      <code
                        class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm"
                      >
                        {{ product.sku }}
                      </code>
                    </dd>
                  </div>
                  <div v-if="product.barcode" class="flex justify-between">
                    <dt class="text-gray-500">{{ $t("products.barcode") }}</dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      <code
                        class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm"
                      >
                        {{ product.barcode }}
                      </code>
                      <span
                        v-if="product.barcodeType"
                        class="text-xs text-gray-500 ml-1"
                      >
                        ({{ product.barcodeType.toUpperCase() }})
                      </span>
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ $t("products.productType") }}
                    </dt>
                    <dd
                      class="font-medium text-gray-900 dark:text-white capitalize"
                    >
                      {{
                        $t(
                          "products.productTypes." +
                            (product.productType || "good")
                        )
                      }}
                    </dd>
                  </div>
                  <div v-if="product.brand" class="flex justify-between">
                    <dt class="text-gray-500">{{ $t("products.brand") }}</dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ product.brand }}
                    </dd>
                  </div>
                  <div v-if="product.manufacturer" class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ $t("products.manufacturer") }}
                    </dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ product.manufacturer }}
                    </dd>
                  </div>
                  <div v-if="product.description" class="pt-2">
                    <dt class="text-gray-500 mb-1">
                      {{ $t("products.description") }}
                    </dt>
                    <dd class="text-gray-900 dark:text-white text-sm">
                      {{ product.description }}
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Inventory Settings -->
              <div
                class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
              >
                <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t("products.inventorySettings") }}
                </h3>
                <dl class="space-y-3">
                  <div class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ $t("products.trackStock") }}
                    </dt>
                    <dd>
                      <UBadge
                        :color="product.trackStock !== false ? 'green' : 'gray'"
                        :label="
                          product.trackStock !== false
                            ? $t('common.yes')
                            : $t('common.no')
                        "
                      />
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ $t("products.trackLots") }}
                    </dt>
                    <dd>
                      <UBadge
                        :color="product.trackLots ? 'green' : 'gray'"
                        :label="
                          product.trackLots ? $t('common.yes') : $t('common.no')
                        "
                      />
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ $t("products.hasExpiry") }}
                    </dt>
                    <dd>
                      <UBadge
                        :color="product.hasExpiry ? 'yellow' : 'gray'"
                        :label="
                          product.hasExpiry ? $t('common.yes') : $t('common.no')
                        "
                      />
                    </dd>
                  </div>
                  <div
                    v-if="product.hasExpiry && product.defaultShelfLifeDays"
                    class="flex justify-between"
                  >
                    <dt class="text-gray-500">
                      {{ $t("products.shelfLife") }}
                    </dt>
                    <dd class="font-medium text-gray-900 dark:text-white">
                      {{ product.defaultShelfLifeDays }} {{ $t("common.days") }}
                    </dd>
                  </div>
                  <div v-if="product.storageType" class="flex justify-between">
                    <dt class="text-gray-500">
                      {{ $t("products.storageType") }}
                    </dt>
                    <dd
                      class="font-medium text-gray-900 dark:text-white capitalize"
                    >
                      {{ $t("products.storageTypes." + product.storageType) }}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Tags -->
            <div
              v-if="product.tags && product.tags.length > 0"
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
                {{ $t("products.tags") }}
              </h3>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="tag in product.tags"
                  :key="tag"
                  color="blue"
                  variant="subtle"
                  :label="tag"
                />
              </div>
            </div>

            <!-- Timestamps -->
            <div
              class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 text-sm text-gray-500"
            >
              <div class="flex flex-wrap gap-x-6 gap-y-2">
                <span
                  >{{ $t("common.created") }}:
                  {{ $d(new Date(product.createdAt), "long") }}</span
                >
                <span v-if="product.createdBy"
                  >{{ $t("common.createdBy") }}: {{ product.createdBy }}</span
                >
                <span
                  >{{ $t("common.updated") }}:
                  {{ $d(new Date(product.updatedAt), "long") }}</span
                >
                <span v-if="product.updatedBy"
                  >{{ $t("common.updatedBy") }}: {{ product.updatedBy }}</span
                >
              </div>
            </div>
          </div>

          <!-- Inventory Tab -->
          <div v-if="item.value === 'inventory'" class="pt-6 space-y-6">
            <!-- Stock Summary -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CommonStatCard
                :label="$t('products.currentStock')"
                :value="String(product.stock)"
                icon="i-heroicons-cube"
                :icon-color="
                  product.stock <= product.minStock ? 'red' : 'green'
                "
              />
              <CommonStatCard
                :label="$t('products.minStock')"
                :value="String(product.minStock)"
                icon="i-heroicons-exclamation-triangle"
                icon-color="yellow"
              />
              <CommonStatCard
                :label="$t('inventory.stockValue')"
                :value="
                  formatCurrency(
                    product.stock * (product.costPrice || product.price)
                  )
                "
                icon="i-heroicons-banknotes"
                icon-color="blue"
              />
            </div>

            <!-- Stock Lots (if tracking lots) -->
            <div
              v-if="product.trackLots"
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div
                class="px-6 py-4 border-b border-gray-200 dark:border-gray-800"
              >
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ $t("inventory.stockLots") }}
                </h3>
              </div>
              <div v-if="stockLots.length > 0" class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-gray-800/50">
                      <th
                        class="text-left py-3 px-4 text-sm font-medium text-gray-500"
                      >
                        {{ $t("inventory.lotNumber") }}
                      </th>
                      <th
                        class="text-left py-3 px-4 text-sm font-medium text-gray-500"
                      >
                        {{ $t("inventory.quantity") }}
                      </th>
                      <th
                        class="text-left py-3 px-4 text-sm font-medium text-gray-500"
                      >
                        {{ $t("inventory.expiryDate") }}
                      </th>
                      <th
                        class="text-left py-3 px-4 text-sm font-medium text-gray-500"
                      >
                        {{ $t("inventory.receivedDate") }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="lot in stockLots"
                      :key="lot.id"
                      class="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td class="py-3 px-4">
                        <code
                          class="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
                        >
                          {{ lot.lotNumber }}
                        </code>
                      </td>
                      <td class="py-3 px-4 font-medium">{{ lot.quantity }}</td>
                      <td class="py-3 px-4">
                        <span
                          :class="
                            isExpiringSoon(lot.expiryDate) ? 'text-red-500' : ''
                          "
                        >
                          {{
                            lot.expiryDate ? formatDate(lot.expiryDate) : "-"
                          }}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-gray-500">
                        {{ formatDate(lot.receivedDate) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="p-8 text-center text-gray-500">
                <UIcon
                  name="i-heroicons-cube"
                  class="w-12 h-12 mx-auto mb-2 text-gray-300"
                />
                <p>{{ $t("inventory.noLots") }}</p>
              </div>
            </div>

            <!-- Quick Actions -->
            <div v-if="canEditProducts" class="flex gap-3">
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-plus"
                :label="$t('inventory.addStock')"
                @click="openStockAdjustment('add')"
              />
              <UButton
                color="yellow"
                variant="soft"
                icon="i-heroicons-minus"
                :label="$t('inventory.removeStock')"
                @click="openStockAdjustment('remove')"
              />
            </div>
          </div>

          <!-- History Tab -->
          <div v-if="item.value === 'history'" class="pt-6 space-y-6">
            <!-- Filters -->
            <div class="flex flex-wrap gap-3">
              <USelect
                v-model="historyFilter"
                :items="historyFilterOptions"
                label-key="label"
                value-key="value"
                class="w-48"
              />
              <UButton
                color="neutral"
                variant="soft"
                icon="i-heroicons-arrow-path"
                :label="$t('common.refresh')"
                :loading="loadingHistory"
                @click="loadActivityHistory"
              />
            </div>

            <!-- Activity Timeline -->
            <div v-if="loadingHistory" class="space-y-4">
              <div v-for="i in 5" :key="i" class="flex gap-4">
                <USkeleton class="w-10 h-10 rounded-full shrink-0" />
                <div class="flex-1">
                  <USkeleton class="h-4 w-3/4 mb-2" />
                  <USkeleton class="h-3 w-1/2" />
                </div>
              </div>
            </div>

            <div v-else-if="activityLogs.length > 0" class="space-y-4">
              <div
                v-for="log in filteredActivityLogs"
                :key="log.id"
                class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
              >
                <div class="flex items-start gap-4">
                  <!-- Action Icon -->
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                      getActivityColor(log.action),
                    ]"
                  >
                    <UIcon
                      :name="getActivityIcon(log.action)"
                      class="w-5 h-5"
                    />
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <h4 class="font-medium text-gray-900 dark:text-white">
                        {{ getActivityLabel(log.action) }}
                      </h4>
                      <span class="text-sm text-gray-500 shrink-0">
                        {{ formatDateTime(log.timestamp) }}
                      </span>
                    </div>

                    <!-- User info -->
                    <p class="text-sm text-gray-500 mt-1">
                      {{ $t("common.by") }} {{ log.userName || log.userId }}
                      <span v-if="log.userRole" class="text-xs"
                        >({{ log.userRole }})</span
                      >
                    </p>

                    <!-- Changes -->
                    <div
                      v-if="log.changes && log.changes.length > 0"
                      class="mt-3 space-y-2"
                    >
                      <div
                        v-for="(change, idx) in log.changes"
                        :key="idx"
                        class="text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-2"
                      >
                        <span class="text-gray-500">{{ change.field }}:</span>
                        <span class="text-red-500 line-through mx-2">{{
                          formatChangeValue(change.oldValue)
                        }}</span>
                        <UIcon
                          name="i-heroicons-arrow-right"
                          class="w-3 h-3 inline text-gray-400"
                        />
                        <span class="text-green-500 ml-2">{{
                          formatChangeValue(change.newValue)
                        }}</span>
                      </div>
                    </div>

                    <!-- Stock change -->
                    <div
                      v-if="
                        log.action === 'stock_adjust' &&
                        log.stockBefore !== undefined
                      "
                      class="mt-2 text-sm"
                    >
                      <span class="text-gray-500"
                        >{{ $t("products.stock") }}:</span
                      >
                      <span class="text-red-500 mx-2">{{
                        log.stockBefore
                      }}</span>
                      <UIcon
                        name="i-heroicons-arrow-right"
                        class="w-3 h-3 inline text-gray-400"
                      />
                      <span class="text-green-500 ml-2">{{
                        log.stockAfter
                      }}</span>
                      <span v-if="log.stockReason" class="text-gray-500 ml-2"
                        >({{ log.stockReason }})</span
                      >
                    </div>

                    <!-- Price change -->
                    <div
                      v-if="
                        log.action === 'price_change' &&
                        log.priceBefore !== undefined
                      "
                      class="mt-2 text-sm"
                    >
                      <span class="text-gray-500"
                        >{{ $t("products.price") }}:</span
                      >
                      <span class="text-red-500 mx-2">{{
                        formatCurrency(log.priceBefore)
                      }}</span>
                      <UIcon
                        name="i-heroicons-arrow-right"
                        class="w-3 h-3 inline text-gray-400"
                      />
                      <span class="text-green-500 ml-2">{{
                        formatCurrency(log.priceAfter!)
                      }}</span>
                    </div>

                    <!-- Notes -->
                    <p
                      v-if="log.notes"
                      class="text-sm text-gray-500 mt-2 italic"
                    >
                      {{ log.notes }}
                    </p>

                    <!-- Nostr sync status -->
                    <div
                      v-if="log.nostrEventId"
                      class="mt-2 flex items-center gap-1 text-xs text-gray-400"
                    >
                      <UIcon
                        name="i-heroicons-cloud-arrow-up"
                        class="w-3 h-3"
                      />
                      <span>{{ $t("common.synced") }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Load More -->
              <div v-if="hasMoreLogs" class="text-center">
                <UButton
                  color="neutral"
                  variant="ghost"
                  :label="$t('common.loadMore')"
                  :loading="loadingMore"
                  @click="loadMoreLogs"
                />
              </div>
            </div>

            <div v-else class="text-center py-12">
              <UIcon
                name="i-heroicons-clock"
                class="w-16 h-16 mx-auto mb-4 text-gray-300"
              />
              <h3
                class="text-lg font-medium text-gray-900 dark:text-white mb-2"
              >
                {{ $t("products.noActivityLogs") }}
              </h3>
              <p class="text-gray-500">
                {{ $t("products.noActivityLogsHint") }}
              </p>
            </div>
          </div>

          <!-- Recipes Tab (if linked to recipes) -->
          <div v-if="item.value === 'recipes'" class="pt-6 space-y-6">
            <div
              v-if="linkedRecipes.length > 0"
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <NuxtLinkLocale
                v-for="recipe in linkedRecipes"
                :key="recipe.id"
                :to="`/recipes/${recipe.id}`"
                class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-primary-500 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                  >
                    <span class="text-2xl">{{ recipe.icon || "🍽️" }}</span>
                  </div>
                  <div>
                    <h4 class="font-medium text-gray-900 dark:text-white">
                      {{ recipe.name }}
                    </h4>
                    <p class="text-sm text-gray-500">{{ recipe.category }}</p>
                  </div>
                </div>
              </NuxtLinkLocale>
            </div>
            <div v-else class="text-center py-12">
              <UIcon
                name="i-heroicons-beaker"
                class="w-16 h-16 mx-auto mb-4 text-gray-300"
              />
              <h3
                class="text-lg font-medium text-gray-900 dark:text-white mb-2"
              >
                {{ $t("products.noLinkedRecipes") }}
              </h3>
              <p class="text-gray-500">
                {{ $t("products.noLinkedRecipesHint") }}
              </p>
            </div>
          </div>
        </template>
      </UTabs>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-primary-500"
      />
    </div>

    <!-- Not Found -->
    <div v-else-if="!product" class="text-center py-20">
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-16 h-16 mx-auto mb-4 text-yellow-500"
      />
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {{ $t("products.notFound") }}
      </h2>
      <p class="text-gray-500 mb-4">
        {{ $t("products.notFoundHint") }}
      </p>
      <UButton
        color="primary"
        :label="$t('products.backToList')"
        @click="navigateTo('/products')"
      />
    </div>

    <!-- Product Modal -->
    <ProductsProductModal
      v-if="product"
      v-model:open="showProductModal"
      :product="product"
      :categories="categories"
      :units="units"
      :branches="branches"
      :loading="saving"
      @save="handleSaveProduct"
      @cancel="showProductModal = false"
    />

    <!-- Delete Confirmation -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center gap-4 mb-4">
            <div
              class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-6 h-6 text-red-600"
              />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ $t("products.confirmDelete") }}
              </h3>
              <p class="text-gray-500">
                {{ $t("products.deleteWarning", { name: product?.name }) }}
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="outline"
              :label="$t('common.cancel')"
              @click="showDeleteModal = false"
            />
            <UButton
              color="red"
              :label="$t('common.delete')"
              :loading="deleting"
              @click="handleDelete"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Stock Adjustment Modal -->
    <UModal v-model:open="showStockModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{
              stockAdjustmentType === "add"
                ? $t("inventory.addStock")
                : $t("inventory.removeStock")
            }}
          </h3>
          <div class="space-y-4">
            <UFormField :label="$t('inventory.quantity')">
              <UInputNumber
                v-model="stockAdjustmentQty"
                type="number"
                :min="0"
                :placeholder="$t('inventory.enterQuantity')"
              />
            </UFormField>
            <UFormField :label="$t('inventory.reason')">
              <USelect
                v-model="stockAdjustmentReason"
                :items="stockReasonOptions"
                label-key="label"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('common.notes')">
              <UTextarea
                v-model="stockAdjustmentNotes"
                :placeholder="$t('common.optional')"
                :rows="2"
                class="w-full"
              />
            </UFormField>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <UButton
              color="neutral"
              variant="outline"
              :label="$t('common.cancel')"
              @click="showStockModal = false"
            />
            <UButton
              :color="stockAdjustmentType === 'add' ? 'primary' : 'yellow'"
              :label="$t('common.confirm')"
              :loading="adjustingStock"
              @click="handleStockAdjustment"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Product, ProductActivityLog } from "~/types";

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "Product Details",
});

const route = useRoute();
const { t } = useI18n();
const { formatCurrency } = useCurrency();
const {
  getProductById,
  updateProduct,
  deleteProduct: removeProduct,
  getProductActivityLogs,
  categories,
  units,
  branches,
} = useProductsStore();
const permissions = usePermissions();

// Product ID from route
const productId = computed(() => route.params.id as string);

// State
const product = ref<Product | null>(null);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const showProductModal = ref(false);
const showDeleteModal = ref(false);
const activeTab = ref("overview");

// Activity Logs
const activityLogs = ref<ProductActivityLog[]>([]);
const loadingHistory = ref(false);
const loadingMore = ref(false);
const historyFilter = ref("all");
const historyLimit = ref(20);
const hasMoreLogs = ref(false);

// Stock Adjustment
const showStockModal = ref(false);
const stockAdjustmentType = ref<"add" | "remove">("add");
const stockAdjustmentQty = ref(0);
const stockAdjustmentReason = ref("");
const stockAdjustmentNotes = ref("");
const adjustingStock = ref(false);

// Linked data
const stockLots = ref<
  {
    id: string;
    lotNumber: string;
    quantity: number;
    expiryDate?: string;
    receivedDate: string;
  }[]
>([]);
const linkedRecipes = ref<
  { id: string; name: string; icon?: string; category?: string }[]
>([]);

// Permissions
const canEditProducts = computed(
  () => permissions.currentUser.value?.permissions?.canEditProducts ?? false
);
const canDeleteProducts = computed(
  () => permissions.currentUser.value?.permissions?.canDeleteProducts ?? false
);

// Tabs
const tabs = computed(() => [
  {
    label: t("common.overview", "Overview"),
    value: "overview",
    icon: "i-heroicons-information-circle",
  },
  {
    label: t("inventory.inventory", "Inventory"),
    value: "inventory",
    icon: "i-heroicons-cube",
  },
  {
    label: t("products.history", "History"),
    value: "history",
    icon: "i-heroicons-clock",
  },
  {
    label: t("products.recipes", "Recipes"),
    value: "recipes",
    icon: "i-heroicons-beaker",
  },
]);

const historyFilterOptions = [
  { label: t("common.all", "All"), value: "all" },
  { label: t("products.activityCreate", "Create"), value: "create" },
  { label: t("products.activityUpdate", "Update"), value: "update" },
  {
    label: t("products.activityPriceChange", "Price Change"),
    value: "price_change",
  },
  {
    label: t("products.activityStockAdjust", "Stock Adjust"),
    value: "stock_adjust",
  },
  { label: t("products.activityDelete", "Delete"), value: "delete" },
];

const stockReasonOptions = [
  { label: t("inventory.reasonReceived", "Received"), value: "received" },
  { label: t("inventory.reasonReturned", "Returned"), value: "returned" },
  { label: t("inventory.reasonDamaged", "Damaged"), value: "damaged" },
  { label: t("inventory.reasonExpired", "Expired"), value: "expired" },
  { label: t("inventory.reasonLost", "Lost"), value: "lost" },
  { label: t("inventory.reasonAdjustment", "Adjustment"), value: "adjustment" },
  { label: t("inventory.reasonTransfer", "Transfer"), value: "transfer" },
  { label: t("common.other", "Other"), value: "other" },
];

// Computed
const filteredActivityLogs = computed(() => {
  if (historyFilter.value === "all") return activityLogs.value;
  return activityLogs.value.filter((log) => log.action === historyFilter.value);
});

// Methods
async function loadProduct() {
  loading.value = true;
  try {
    // Use async getProductById which tries: memory → local DB → Nostr relay
    product.value = await getProductById(productId.value);
    if (product.value) {
      // Load related data
      await Promise.all([loadStockLots(), loadLinkedRecipes()]);
    }
  } catch (err) {
    console.error("Failed to load product:", err);
  } finally {
    loading.value = false;
  }
}

async function loadActivityHistory() {
  loadingHistory.value = true;
  try {
    const logs = await getProductActivityLogs(
      productId.value,
      historyLimit.value
    );
    activityLogs.value = logs as ProductActivityLog[];
    hasMoreLogs.value = activityLogs.value.length >= historyLimit.value;
  } catch (err) {
    console.error("Failed to load activity logs:", err);
  } finally {
    loadingHistory.value = false;
  }
}

async function loadMoreLogs() {
  loadingMore.value = true;
  try {
    historyLimit.value += 20;
    await loadActivityHistory();
  } finally {
    loadingMore.value = false;
  }
}

async function loadStockLots() {
  if (!product.value?.trackLots) return;
  // TODO: Implement stock lots loading from use-stock-lots composable
  stockLots.value = [];
}

async function loadLinkedRecipes() {
  // TODO: Implement recipe linking
  linkedRecipes.value = [];
}

function getCategoryName(categoryId: string): string {
  const category = categories.value.find((c) => c.id === categoryId);
  return category?.name || "-";
}

function _getUnitName(unitId: string): string {
  const unit = units.value.find((u) => u.id === unitId);
  return unit?.name || unit?.symbol || "-";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString();
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString();
}

function isExpiringSoon(expiryDate: string | undefined): boolean {
  if (!expiryDate) return false;
  const daysUntilExpiry = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry <= (product.value?.expiryWarningDays || 7);
}

function getActivityIcon(action: string): string {
  const icons: Record<string, string> = {
    create: "i-heroicons-plus-circle",
    update: "i-heroicons-pencil",
    delete: "i-heroicons-trash",
    price_change: "i-heroicons-currency-dollar",
    stock_adjust: "i-heroicons-cube",
    status_change: "i-heroicons-arrow-path",
    restore: "i-heroicons-arrow-uturn-left",
  };
  return icons[action] || "i-heroicons-information-circle";
}

function getActivityColor(action: string): string {
  const colors: Record<string, string> = {
    create: "bg-green-100 dark:bg-green-900/30 text-green-600",
    update: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
    delete: "bg-red-100 dark:bg-red-900/30 text-red-600",
    price_change: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600",
    stock_adjust: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
    status_change: "bg-gray-100 dark:bg-gray-800 text-gray-600",
    restore: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
  };
  return colors[action] || "bg-gray-100 dark:bg-gray-800 text-gray-600";
}

function getActivityLabel(action: string): string {
  const labels: Record<string, string> = {
    create: t("products.activityCreate"),
    update: t("products.activityUpdate"),
    delete: t("products.activityDelete"),
    price_change: t("products.activityPriceChange"),
    stock_adjust: t("products.activityStockAdjust"),
    status_change: t("products.activityStatusChange"),
    restore: t("products.activityRestore"),
  };
  return labels[action] || action;
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean")
    return value ? t("common.yes") : t("common.no");
  if (typeof value === "number") return String(value);
  return String(value);
}

function openProductModal() {
  showProductModal.value = true;
}

function confirmDelete() {
  showDeleteModal.value = true;
}

async function handleSaveProduct(data: Partial<Product>) {
  saving.value = true;
  try {
    await updateProduct(productId.value, data);
    showProductModal.value = false;
    await loadProduct();
  } catch (err) {
    console.error("Failed to update product:", err);
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  deleting.value = true;
  try {
    await removeProduct(productId.value);
    navigateTo("/products");
  } catch (err) {
    console.error("Failed to delete product:", err);
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
  }
}

function openStockAdjustment(type: "add" | "remove") {
  stockAdjustmentType.value = type;
  stockAdjustmentQty.value = 0;
  stockAdjustmentReason.value = "";
  stockAdjustmentNotes.value = "";
  showStockModal.value = true;
}

async function handleStockAdjustment() {
  if (!product.value || stockAdjustmentQty.value <= 0) return;

  adjustingStock.value = true;
  try {
    const newStock =
      stockAdjustmentType.value === "add"
        ? product.value.stock + stockAdjustmentQty.value
        : Math.max(0, product.value.stock - stockAdjustmentQty.value);

    await updateProduct(productId.value, {
      ...product.value,
      stock: newStock,
    });

    showStockModal.value = false;
    await loadProduct();
    await loadActivityHistory();
  } catch (error) {
    console.error("Failed to adjust stock:", error);
  } finally {
    adjustingStock.value = false;
  }
}

// Watch for tab changes to load data
watch(activeTab, (tab) => {
  if (tab === "history" && activityLogs.value.length === 0) {
    loadActivityHistory();
  }
});

// Initial load
onMounted(() => {
  loadProduct();
});
</script>
