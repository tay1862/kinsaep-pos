<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4"
        />
        <p class="text-gray-500">{{ $t("common.loading") }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="flex items-center justify-center min-h-screen p-4"
    >
      <UCard class="max-w-md w-full">
        <div class="text-center py-6">
          <div
            class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-10 h-10 text-red-500"
            />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {{ $t("order.invalidLink", "Invalid Link") }}
          </h1>
          <p class="text-gray-500 mb-6">{{ error }}</p>
          <p class="text-sm text-gray-400">
            {{ $t("order.askStaff", "Please ask staff for a new QR code") }}
          </p>
        </div>
      </UCard>
    </div>

    <!-- Order Submitted State with Tracking -->
    <div
      v-else-if="orderSubmitted"
      class="flex items-center justify-center min-h-screen p-4"
    >
      <UCard class="max-w-md w-full">
        <div class="text-center py-6">
          <div
            class="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            :class="getOrderStatusBgClass(currentOrderStatus)"
          >
            <UIcon
              :name="getOrderStatusIcon(currentOrderStatus)"
              class="w-12 h-12"
              :class="getOrderStatusIconClass(currentOrderStatus)"
            />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {{ getOrderStatusTitle(currentOrderStatus) }}
          </h1>
          <p class="text-gray-500 mb-4">
            {{ getOrderStatusDescription(currentOrderStatus) }}
          </p>

          <!-- Order Number -->
          <div class="bg-primary-50 dark:bg-primary-900/30 rounded-xl p-4 mb-4">
            <p class="text-sm text-gray-500 mb-1">
              {{ $t("order.orderNumber", "Order #") }}
            </p>
            <p
              class="text-2xl font-bold text-primary-600 dark:text-primary-400"
            >
              {{ submittedOrderId }}
            </p>
          </div>

          <!-- Order Status Timeline -->
          <div class="mb-6">
            <div class="flex justify-between items-center px-4">
              <div
                v-for="(step, index) in orderStatusSteps"
                :key="step.key"
                class="flex flex-col items-center flex-1"
              >
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300"
                  :class="getStepClass(step.key, index)"
                >
                  {{ step.icon }}
                </div>
                <span class="text-xs mt-1 text-gray-500">{{ step.label }}</span>
                <div
                  v-if="index < orderStatusSteps.length - 1"
                  class="absolute h-1 bg-gray-200 dark:bg-gray-700"
                  style="width: 60px; top: 20px"
                  :class="{ 'bg-primary-500': isStepCompleted(step.key) }"
                />
              </div>
            </div>
          </div>

          <!-- Table Info -->
          <div
            class="flex items-center justify-center gap-2 text-gray-500 mb-4"
          >
            <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
            <span>{{
              tableInfo?.tableName || `Table ${tableInfo?.tableNumber}`
            }}</span>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <UButton color="primary" size="lg" block @click="startNewOrder">
              <UIcon name="i-heroicons-plus" class="w-5 h-5 mr-2" />
              {{ $t("order.orderMore", "Order More") }}
            </UButton>
            <UButton
              v-if="orderHistory.length > 0"
              color="neutral"
              variant="soft"
              size="lg"
              block
              @click="showOrderHistoryModal = true"
            >
              <UIcon name="i-heroicons-clock" class="w-5 h-5 mr-2" />
              {{ $t("order.viewHistory", "View Order History") }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Valid Token - Show Menu -->
    <template v-else-if="tableInfo">
      <!-- Header -->
      <div
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm safe-area-top"
      >
        <div class="container mx-auto px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div>
                <h1 class="text-lg font-bold text-gray-900 dark:text-white">
                  📍
                  {{ tableInfo.tableName || `Table ${tableInfo.tableNumber}` }}
                </h1>
                <p class="text-xs text-gray-500">
                  {{ $t("order.browseMenu", "Browse our menu") }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <!-- View Tab Button -->
              <UButton
                v-if="sessionOrderCount > 0"
                color="emerald"
                variant="ghost"
                size="sm"
                icon="i-heroicons-receipt-percent"
                @click="showTabModal = true"
              >
                <span class="hidden sm:inline">Tab</span>
                <span class="sm:hidden">{{ sessionOrderCount }}</span>
              </UButton>
              <!-- Order History Button -->
              <UButton
                v-if="orderHistory.length > 0"
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-heroicons-clock"
                @click="showOrderHistoryModal = true"
              />
              <!-- Cart Button -->
              <UButton
                v-if="cart.length > 0"
                color="primary"
                variant="solid"
                size="sm"
                class="min-h-[44px] min-w-[44px]"
                @click="showCartModal = true"
              >
                🛒 {{ cartItemCount }}
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Tabs - Horizontal Scroll -->
      <div
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[60px] z-10"
      >
        <div class="container mx-auto px-4">
          <div
            class="flex gap-2 overflow-x-auto py-3 scrollbar-hide -mx-4 px-4"
          >
            <UButton
              v-for="category in menuCategories"
              :key="category.id"
              :color="selectedCategory === category.id ? 'primary' : 'neutral'"
              :variant="selectedCategory === category.id ? 'solid' : 'ghost'"
              size="sm"
              class="flex-shrink-0 min-h-[44px] min-w-[44px]"
              @click="selectedCategory = category.id"
            >
              {{ category.icon }} {{ category.name }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Menu Content -->
      <div class="container mx-auto px-4 py-4 pb-40">
        <!-- Products Grid - Mobile Optimized -->
        <div
          v-if="filteredMenuProducts.length > 0"
          class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        >
          <div
            v-for="product in filteredMenuProducts"
            :key="product.id"
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden active:scale-[0.98] transition-transform touch-manipulation"
            @click="addToCart(product)"
          >
            <!-- Product Image -->
            <div
              class="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden relative"
            >
              <img
                v-if="product.image"
                :src="product.image"
                :alt="product.name"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-4xl"
              >
                🍽️
              </div>

              <!-- Quantity Badge -->
              <div
                v-if="getCartQuantity(product.id) > 0"
                class="absolute top-2 right-2 bg-primary-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg text-sm"
              >
                {{ getCartQuantity(product.id) }}
              </div>
            </div>

            <!-- Product Info -->
            <div class="p-3">
              <h3
                class="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1"
              >
                {{ product.name }}
              </h3>
              <p
                class="font-bold text-primary-600 dark:text-primary-400 text-sm mt-1"
              >
                {{ formatPrice(product.price) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <UIcon
            name="i-heroicons-shopping-bag"
            class="w-16 h-16 text-gray-300 mx-auto mb-4"
          />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {{ $t("order.noProducts", "No products available") }}
          </h2>
          <p class="text-gray-500">
            {{
              $t("order.noProductsDesc", "Please ask staff for assistance")
            }}
          </p>
        </div>
      </div>

      <!-- Bottom Action Bar - Mobile Optimized -->
      <div
        class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-20 safe-area-bottom"
      >
        <div class="container mx-auto p-3">
          <!-- Quick Actions Row -->
          <div class="flex gap-2 mb-3">
            <UButton
              color="amber"
              variant="soft"
              size="sm"
              class="flex-1 min-h-[44px]"
              :loading="isCallingWaiter"
              @click="callWaiter"
            >
              <UIcon name="i-heroicons-bell-alert" class="w-4 h-4 mr-1" />
              {{ $t("order.callWaiter", "Call Waiter") }}
            </UButton>
            <UButton
              color="emerald"
              variant="soft"
              size="sm"
              class="flex-1 min-h-[44px]"
              :loading="isRequestingBill"
              @click="requestBill"
            >
              <UIcon name="i-heroicons-receipt-percent" class="w-4 h-4 mr-1" />
              {{ $t("order.requestBill", "Request Bill") }}
            </UButton>
          </div>

          <!-- View Cart Button -->
          <UButton
            v-if="cart.length > 0"
            color="primary"
            size="lg"
            block
            class="min-h-[52px]"
            @click="showCartModal = true"
          >
            <div class="flex items-center justify-between w-full">
              <span class="flex items-center gap-2">
                <span class="bg-white/20 rounded-full px-2 py-0.5 text-sm">{{
                  cartItemCount
                }}</span>
                {{ $t("order.viewCart", "View Cart") }}
              </span>
              <span class="font-bold">{{ formatPrice(cartTotal) }}</span>
            </div>
          </UButton>
        </div>
      </div>

      <!-- Cart Modal - Bottom Sheet Style -->
      <UModal v-model:open="showCartModal">
        <template #content>
          <UCard
            class="max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">
                  🛒 {{ $t("order.yourCart", "Your Cart") }}
                </h3>
                <UButton
                  v-if="cart.length > 0"
                  color="red"
                  variant="ghost"
                  size="xs"
                  @click="clearCart"
                >
                  {{ $t("order.clearCart", "Clear") }}
                </UButton>
              </div>
            </template>

            <div class="overflow-y-auto max-h-[50vh] -mx-4 px-4">
              <!-- Empty Cart -->
              <div v-if="cart.length === 0" class="text-center py-8">
                <UIcon
                  name="i-heroicons-shopping-cart"
                  class="w-16 h-16 text-gray-300 mx-auto mb-4"
                />
                <p class="text-gray-500">
                  {{ $t("order.cartEmpty", "Your cart is empty") }}
                </p>
              </div>

              <!-- Cart Items -->
              <div v-else class="space-y-3">
                <div
                  v-for="(item, index) in cart"
                  :key="item.product.id"
                  class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <!-- Product Image -->
                  <div
                    class="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0"
                  >
                    <img
                      v-if="item.product.image"
                      :src="item.product.image"
                      :alt="item.product.name"
                      class="w-full h-full object-cover"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-xl"
                    >
                      🍽️
                    </div>
                  </div>

                  <!-- Product Info -->
                  <div class="flex-1 min-w-0">
                    <h4
                      class="font-medium text-gray-900 dark:text-white text-sm truncate"
                    >
                      {{ item.product.name }}
                      <span
                        v-if="item.selectedVariant"
                        class="ml-1 px-1.5 py-0.5 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                      >
                        {{ item.selectedVariant.shortName }}
                      </span>
                    </h4>
                    <p class="text-xs text-primary-600 dark:text-primary-400">
                      {{ formatPrice(getItemPrice(item)) }}
                    </p>

                    <!-- Notes Input -->
                    <UInput
                      v-model="item.notes"
                      size="xs"
                      :placeholder="$t('order.addNote', 'Add note...')"
                      class="mt-1"
                    />
                  </div>

                  <!-- Quantity Controls -->
                  <div class="flex items-center gap-1">
                    <UButton
                      color="gray"
                      variant="soft"
                      size="xs"
                      icon="i-heroicons-minus"
                      class="min-h-[36px] min-w-[36px]"
                      @click="decreaseQuantity(index)"
                    />
                    <span class="w-6 text-center font-bold text-sm">{{
                      item.quantity
                    }}</span>
                    <UButton
                      color="primary"
                      variant="soft"
                      size="xs"
                      icon="i-heroicons-plus"
                      class="min-h-[36px] min-w-[36px]"
                      @click="increaseQuantity(index)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <template #footer v-if="cart.length > 0">
              <div class="space-y-3">
                <!-- Totals -->
                <div class="flex justify-between text-lg font-bold">
                  <span>{{ $t("order.total", "Total") }}</span>
                  <span class="text-primary-600 dark:text-primary-400">{{
                    formatPrice(cartTotal)
                  }}</span>
                </div>

                <!-- Submit Order Button -->
                <UButton
                  color="primary"
                  size="lg"
                  block
                  class="min-h-[52px]"
                  :loading="isSubmitting"
                  @click="submitOrder"
                >
                  <UIcon
                    name="i-heroicons-paper-airplane"
                    class="w-5 h-5 mr-2"
                  />
                  {{ $t("order.placeOrder", "Place Order") }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- Order History Modal -->
      <UModal v-model:open="showOrderHistoryModal">
        <template #content>
          <UCard
            class="max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">
                  📋 {{ $t("order.orderHistory", "Order History") }}
                </h3>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-x-mark"
                  @click="showOrderHistoryModal = false"
                />
              </div>
            </template>

            <div class="overflow-y-auto max-h-[60vh] -mx-4 px-4">
              <div v-if="orderHistory.length === 0" class="text-center py-8">
                <UIcon
                  name="i-heroicons-document-text"
                  class="w-16 h-16 text-gray-300 mx-auto mb-4"
                />
                <p class="text-gray-500">
                  {{ $t("order.noHistory", "No order history yet") }}
                </p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="historyOrder in orderHistory"
                  :key="historyOrder.id"
                  class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <!-- Order Header -->
                  <div class="flex items-center justify-between mb-2">
                    <div>
                      <span class="font-bold text-sm">
                        #{{ historyOrder.code || historyOrder.id }}
                      </span>
                      <span class="text-xs text-gray-500 ml-2">
                        {{ formatOrderTime(historyOrder.date) }}
                      </span>
                    </div>
                    <UBadge
                      :color="getStatusColor(historyOrder.kitchenStatus)"
                      size="xs"
                    >
                      {{ getStatusLabel(historyOrder.kitchenStatus) }}
                    </UBadge>
                  </div>

                  <!-- Order Items -->
                  <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {{
                      historyOrder.items
                        .map((i) => `${i.quantity}x ${i.product.name}`)
                        .join(", ")
                    }}
                  </div>

                  <!-- Order Total & Reorder -->
                  <div class="flex items-center justify-between">
                    <span
                      class="font-bold text-primary-600 dark:text-primary-400"
                    >
                      {{ formatPrice(historyOrder.total) }}
                    </span>
                    <UButton
                      color="primary"
                      variant="soft"
                      size="xs"
                      class="min-h-[36px]"
                      @click="reorderFromHistory(historyOrder)"
                    >
                      <UIcon
                        name="i-heroicons-arrow-path"
                        class="w-4 h-4 mr-1"
                      />
                      {{ $t("order.reorder", "Reorder") }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </UModal>

      <!-- Current Tab Modal -->
      <UModal v-model:open="showTabModal">
        <template #content>
          <UCard
            class="max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">
                  🍽️ {{ $t("order.currentTab", "Current Tab") }}
                </h3>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-x-mark"
                  @click="showTabModal = false"
                />
              </div>
            </template>

            <div class="overflow-y-auto max-h-[50vh] -mx-4 px-4">
              <!-- Session Info -->
              <div
                v-if="currentSession"
                class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-500">Table</span>
                  <span class="font-semibold text-gray-900 dark:text-white">
                    {{
                      currentSession.tableName ||
                      `#${currentSession.tableNumber}`
                    }}
                  </span>
                </div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-500">Session Duration</span>
                  <span class="text-sm text-gray-700 dark:text-gray-300">
                    {{
                      tableSession.calculateDuration(currentSession.startTime)
                    }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500">Status</span>
                  <UBadge
                    :color="
                      currentSession.status === 'requesting_bill'
                        ? 'emerald'
                        : 'primary'
                    "
                    size="xs"
                  >
                    {{
                      currentSession.status === "requesting_bill"
                        ? "Bill Requested"
                        : "Active"
                    }}
                  </UBadge>
                </div>
              </div>

              <!-- Empty State -->
              <div v-if="sessionOrders.length === 0" class="text-center py-8">
                <UIcon
                  name="i-heroicons-document-text"
                  class="w-16 h-16 text-gray-300 mx-auto mb-4"
                />
                <p class="text-gray-500">
                  {{
                    $t("order.noOrdersYet", "No orders in this session yet")
                  }}
                </p>
              </div>

              <!-- Session Orders -->
              <div v-else class="space-y-3">
                <div
                  v-for="(sessionOrder, index) in sessionOrders"
                  :key="sessionOrder.id"
                  class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <!-- Order Header -->
                  <div class="flex items-center justify-between mb-2">
                    <div>
                      <span class="font-bold text-sm">
                        #{{ sessionOrder.code || sessionOrder.id }}
                      </span>
                      <span class="text-xs text-gray-500 ml-2">
                        {{ formatOrderTime(sessionOrder.date) }}
                      </span>
                    </div>
                    <UBadge
                      :color="getStatusColor(sessionOrder.kitchenStatus)"
                      size="xs"
                    >
                      {{ getStatusLabel(sessionOrder.kitchenStatus) }}
                    </UBadge>
                  </div>

                  <!-- Order Items -->
                  <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {{
                      sessionOrder.items
                        .map((i) => `${i.quantity}x ${i.product.name}`)
                        .join(", ")
                    }}
                  </div>

                  <!-- Order Total -->
                  <div
                    class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700"
                  >
                    <span class="text-xs text-gray-500">Order Total</span>
                    <span
                      class="font-bold text-primary-600 dark:text-primary-400"
                    >
                      {{ formatPrice(sessionOrder.total) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <template #footer v-if="sessionOrders.length > 0">
              <div class="space-y-3">
                <!-- Session Total -->
                <div class="bg-gray-900 dark:bg-gray-950 rounded-2xl p-4">
                  <div class="flex justify-between items-center">
                    <div>
                      <p class="text-gray-400 text-sm">Session Total</p>
                      <p class="text-gray-500 text-xs">
                        {{ sessionOrderCount }} orders
                      </p>
                    </div>
                    <span class="text-3xl font-bold text-white">
                      {{ formatPrice(sessionTotal) }}
                    </span>
                  </div>
                </div>

                <!-- Request Bill Button -->
                <UButton
                  v-if="currentSession?.status !== 'requesting_bill'"
                  color="emerald"
                  size="lg"
                  block
                  class="min-h-[52px]"
                  :loading="isRequestingBill"
                  @click="
                    requestBill();
                    showTabModal = false;
                  "
                >
                  <UIcon
                    name="i-heroicons-receipt-percent"
                    class="w-5 h-5 mr-2"
                  />
                  {{ $t("order.requestBill", "Request Bill") }}
                </UButton>
                <div v-else class="text-center py-2">
                  <UBadge color="emerald" size="lg">
                    <UIcon
                      name="i-heroicons-check-circle"
                      class="w-4 h-4 mr-1"
                    />
                    Bill Requested - Staff will be with you shortly
                  </UBadge>
                </div>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- Call Waiter Success Toast -->
      <!-- Request Bill Success Toast -->

      <!-- Product Variant Selection Modal -->
      <ProductsProductVariantModal
        v-model:open="showVariantModal"
        :product="selectedProductForVariant"
        @confirm="handleVariantConfirm"
        @cancel="selectedProductForVariant = null"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  Product,
  ProductVariant,
  ProductModifier,
  Category,
  Order,
} from "~/types";
import { EntityId } from "~/utils/id";

definePageMeta({
  layout: "blank",
  auth: false,
});

useHead({
  title: "Customer Order",
});

const { t } = useI18n();
const route = useRoute();
const toast = useToast();
const tablesStore = useTables();
const productsStore = useProductsStore();
const ordersStore = useOrders();
const receiptGenerator = useReceiptGenerator();
const { format: formatPrice } = useCurrency();
const notificationsStore = useNotifications();
const tableSession = useTableSession();

const isLoading = ref(true);
const error = ref<string | null>(null);
const tableInfo = ref<{
  tableId: string;
  tableNumber: string;
  tableName: string;
} | null>(null);

const selectedCategory = ref("all");
const cart = ref<
  {
    product: Product;
    quantity: number;
    notes?: string;
    selectedVariant?: ProductVariant;
    selectedModifiers?: ProductModifier[];
  }[]
>([]);
const showCartModal = ref(false);
const showOrderHistoryModal = ref(false);
const showVariantModal = ref(false);
const showTabModal = ref(false);
const selectedProductForVariant = ref<Product | null>(null);
const isSubmitting = ref(false);
const orderSubmitted = ref(false);
const submittedOrderId = ref<string | null>(null);
const currentOrderStatus = ref<"new" | "preparing" | "ready" | "served">("new");

// Service action states
const isCallingWaiter = ref(false);
const isRequestingBill = ref(false);

// Local state for customer menu (loaded from owner's Nostr data)
const ownerProducts = ref<Product[]>([]);
const ownerCategories = ref<Category[]>([]);
const ownerPubkey = ref<string | null>(null);
const nostrData = useNostrData();

// Order history from localStorage
const orderHistory = ref<Order[]>([]);
const ORDER_HISTORY_KEY = "bitspace_customer_orders";
const PENDING_ORDERS_KEY = "bitspace_pending_orders"; // For admin to pick up

// Table session tracking
const currentSession = ref<ReturnType<typeof tableSession.getSession> | null>(
  null
);
const sessionOrders = ref<Order[]>([]); // All orders in current session

// BroadcastChannel for instant cross-tab communication
let orderChannel: BroadcastChannel | null = null;
if (import.meta.client) {
  orderChannel = new BroadcastChannel("bitspace-orders");
}

// 🔔 Publish POS_ALERT for cross-device real-time notifications via Nostr
const nostrRelay = useNostrRelay();

/**
 * Publish POS alert to Nostr relays with retry logic
 *
 * Features:
 * - Anonymous customer signing (no nsec required)
 * - Automatic retry on failure (up to 2 retries)
 * - Multiple premium relays for reliability
 * - Non-blocking (won't prevent order if Nostr fails)
 */
const publishPosAlert = async (
  type: "new-order" | "bill-request" | "waiter-call",
  data: {
    tableNumber?: string;
    tableName?: string;
    total?: number;
    orderCount?: number;
    sessionId?: string;
    orderId?: string;
    orderCode?: string;
  },
  retryCount = 0
) => {
  if (!ownerPubkey.value) {
    console.warn("[Order] ⚠️ No ownerPubkey - cannot publish POS_ALERT");
    return false;
  }

  try {
    // Create POS alert event (kind 30050 - parameterized replaceable)
    // Using 30050 for reliable relay storage and cross-device propagation
    const { NOSTR_KINDS } = await import("~/types/nostr-kinds");

    const content = JSON.stringify({
      type,
      ...data,
      timestamp: Date.now(),
    });

    // Create unsigned event with anonymous ephemeral key
    const { generateSecretKey, finalizeEvent } = await import("nostr-tools");
    const sk = generateSecretKey(); // Anonymous customer key (no nsec needed)
    const timestamp = Math.floor(Date.now() / 1000);

    const event = finalizeEvent(
      {
        kind: NOSTR_KINDS.POS_ALERT, // POS_ALERT (1050 - Regular)
        created_at: timestamp,
        tags: [
          ["p", ownerPubkey.value], // Target the shop owner
          // Add company tag for shop-wide broadcast (any staff with this tag can see it)
          ["c", ownerPubkey.value],
          ["t", type], // Event type tag
        ],
        content,
      },
      sk
    );

    // Publish to relays
    await nostrRelay.publishEvent(event);
    return true;
  } catch (e) {
    console.error(`[Order] ❌ Failed to publish ${type} alert:`, e);

    // Retry up to 2 times with exponential backoff
    if (retryCount < 2) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
      console.log(`[Order] 🔄 Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return publishPosAlert(type, data, retryCount + 1);
    }

    // Non-blocking - order still works even if Nostr fails
    console.warn(
      `[Order] ⚠️ All retries exhausted for ${type} alert. Falling back to BroadcastChannel only.`
    );
    return false;
  }
};

// Broadcast new order to other tabs (admin/kitchen tabs)
const broadcastOrderToAdmin = (order: Order) => {
  if (!import.meta.client) return;

  try {
    // Serialize order to plain object (removes Vue reactive proxies)
    const plainOrder = JSON.parse(JSON.stringify(order));

    // Method 1: BroadcastChannel (instant, same-origin only)
    if (orderChannel) {
      orderChannel.postMessage({ type: "new-order", order: plainOrder });
    }

    // Method 2: localStorage (fallback, triggers storage event in other tabs)
    const existing = localStorage.getItem(PENDING_ORDERS_KEY);
    const pendingOrders: Order[] = existing ? JSON.parse(existing) : [];
    pendingOrders.unshift(plainOrder);
    if (pendingOrders.length > 100) pendingOrders.splice(100);
    localStorage.setItem(PENDING_ORDERS_KEY, JSON.stringify(pendingOrders));

    // Method 3: IndexedDB is already shared across tabs via ordersStore.createOrder()

    // Method 4: Add notification to POS Notification Center
    const itemsSummary = order.items
      .slice(0, 3)
      .map((i) => `${i.quantity}x ${i.product.name}`)
      .join(", ");
    const moreItems =
      order.items.length > 3 ? ` +${order.items.length - 3} more` : "";
    const tableName = order.tableNumber || "Unknown Table";

    // Create detailed notification
    notificationsStore.addNotification({
      type: "order",
      title: `New Order from ${tableName}`,
      message: `Order #${
        order.code || order.id
      }: ${itemsSummary}${moreItems}. Total: ${formatPrice(order.total)}`,
      priority: "high",
      actionUrl: "/orders",
      data: {
        orderId: order.id,
        orderCode: order.code,
        tableNumber: order.tableNumber,
        total: order.total,
        itemCount: order.items.length,
      },
    });
  } catch (e) {
    console.error("Failed to broadcast order:", e);
  }
};

// Order status steps for timeline
const orderStatusSteps = [
  { key: "new", icon: "📝", label: t("order.statusNew", "Placed") },
  {
    key: "preparing",
    icon: "👨‍🍳",
    label: t("order.statusPreparing", "Preparing"),
  },
  { key: "ready", icon: "✅", label: t("order.statusReady", "Ready") },
  { key: "served", icon: "🍽️", label: t("order.statusServed", "Served") },
];

// Menu categories (with "All" option)
const menuCategories = computed(() => {
  // Use locally loaded categories if available, else use default categories
  const cats =
    ownerCategories.value.length > 0
      ? ownerCategories.value.filter((c) => c.id !== "favorites")
      : productsStore.categories.value.filter((c) => c.id !== "favorites");
  return [{ id: "all", name: t("common.all", "All"), icon: "📦" }, ...cats];
});

// Filtered products based on selected category
const filteredMenuProducts = computed(() => {
  // Use locally loaded products if available, else try productsStore
  const products =
    ownerProducts.value.length > 0
      ? ownerProducts.value
      : productsStore.publicProducts.value;
  if (selectedCategory.value === "all") {
    return products;
  }
  return products.filter((p) => p.categoryId === selectedCategory.value);
});

// Cart calculations
const cartItemCount = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.quantity, 0);
});

const cartTotal = computed(() => {
  return cart.value.reduce((sum, item) => {
    let price = item.product.price;
    // Add variant price modifier
    if (item.selectedVariant) {
      if (item.selectedVariant.priceModifierType === "percentage") {
        price += price * (item.selectedVariant.priceModifier / 100);
      } else {
        price += item.selectedVariant.priceModifier;
      }
    }
    // Add modifier prices
    if (item.selectedModifiers) {
      for (const mod of item.selectedModifiers) {
        price += mod.price;
      }
    }
    return sum + price * item.quantity;
  }, 0);
});

// Session calculations
const sessionTotal = computed(() => {
  return sessionOrders.value.reduce((sum, order) => sum + order.total, 0);
});

const sessionOrderCount = computed(() => {
  return sessionOrders.value.length;
});

// Get quantity in cart for a product
const getCartQuantity = (productId: string) => {
  const item = cart.value.find((item) => item.product.id === productId);
  return item?.quantity || 0;
};

// Order status helpers
const getStepClass = (stepKey: string, index: number) => {
  const statusOrder = ["new", "preparing", "ready", "served"];
  const currentIndex = statusOrder.indexOf(currentOrderStatus.value);
  const stepIndex = statusOrder.indexOf(stepKey);

  if (stepIndex < currentIndex) {
    return "bg-primary-500 text-white";
  } else if (stepIndex === currentIndex) {
    return "bg-primary-500 text-white animate-pulse";
  }
  return "bg-gray-200 dark:bg-gray-700 text-gray-500";
};

const isStepCompleted = (stepKey: string) => {
  const statusOrder = ["new", "preparing", "ready", "served"];
  const currentIndex = statusOrder.indexOf(currentOrderStatus.value);
  const stepIndex = statusOrder.indexOf(stepKey);
  return stepIndex <= currentIndex;
};

const getOrderStatusBgClass = (status: string) => {
  switch (status) {
    case "new":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "preparing":
      return "bg-amber-100 dark:bg-amber-900/30 animate-pulse";
    case "ready":
      return "bg-green-100 dark:bg-green-900/30";
    case "served":
      return "bg-primary-100 dark:bg-primary-900/30";
    default:
      return "bg-gray-100 dark:bg-gray-900/30";
  }
};

const getOrderStatusIcon = (status: string) => {
  switch (status) {
    case "new":
      return "i-heroicons-document-check";
    case "preparing":
      return "i-heroicons-fire";
    case "ready":
      return "i-heroicons-check-circle";
    case "served":
      return "i-heroicons-hand-thumb-up";
    default:
      return "i-heroicons-clock";
  }
};

const getOrderStatusIconClass = (status: string) => {
  switch (status) {
    case "new":
      return "text-blue-500";
    case "preparing":
      return "text-amber-500";
    case "ready":
      return "text-green-500";
    case "served":
      return "text-primary-500";
    default:
      return "text-gray-500";
  }
};

const getOrderStatusTitle = (status: string) => {
  switch (status) {
    case "new":
      return t("order.orderPlaced", "Order Placed!");
    case "preparing":
      return t("order.orderPreparing", "Being Prepared...");
    case "ready":
      return t("order.orderReady", "Order Ready!");
    case "served":
      return t("order.orderServed", "Enjoy Your Meal!");
    default:
      return t("order.orderPlaced", "Order Placed!");
  }
};

const getOrderStatusDescription = (status: string) => {
  switch (status) {
    case "new":
      return (
        t("order.orderPlacedDesc", "Your order has been sent to the kitchen")
      );
    case "preparing":
      return (
        t("order.orderPreparingDesc", "The chef is preparing your order")
      );
    case "ready":
      return (
        t("order.orderReadyDesc", "Your order is ready for pickup or delivery")
      );
    case "served":
      return t("order.orderServedDesc", "Thank you for dining with us!");
    default:
      return "";
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case "new":
      return "info" as const;
    case "pending":
      return "info" as const;
    case "preparing":
      return "warning" as const;
    case "ready":
      return "success" as const;
    case "served":
      return "primary" as const;
    default:
      return "neutral" as const;
  }
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case "new":
      return t("order.statusNew", "New");
    case "pending":
      return t("order.statusPending", "Pending");
    case "preparing":
      return t("order.statusPreparing", "Preparing");
    case "ready":
      return t("order.statusReady", "Ready");
    case "served":
      return t("order.statusServed", "Served");
    default:
      return status || "Unknown";
  }
};

const formatOrderTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Cart actions
const addToCart = (product: Product) => {
  // If product has variants, show variant selection modal
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    selectedProductForVariant.value = product;
    showVariantModal.value = true;
    return;
  }

  // No variants, add directly
  const existing = cart.value.find(
    (item) => item.product.id === product.id && !item.selectedVariant
  );
  if (existing) {
    existing.quantity++;
  } else {
    cart.value.push({ product, quantity: 1 });
  }

  // Show toast
  toast.add({
    title: `${product.name} added`,
    icon: "i-heroicons-check-circle",
    color: "green",
    timeout: 1500,
  });
};

// Handle variant modal confirmation
const handleVariantConfirm = (data: {
  product: Product;
  variant?: ProductVariant;
  modifiers: ProductModifier[];
  notes: string;
  quantity: number;
}) => {
  // Create unique key for cart item with variant
  const existingIndex = cart.value.findIndex(
    (item) =>
      item.product.id === data.product.id &&
      item.selectedVariant?.id === data.variant?.id &&
      JSON.stringify(item.selectedModifiers) === JSON.stringify(data.modifiers)
  );

  if (existingIndex !== -1) {
    cart.value[existingIndex].quantity += data.quantity;
  } else {
    cart.value.push({
      product: data.product,
      quantity: data.quantity,
      notes: data.notes || undefined,
      selectedVariant: data.variant,
      selectedModifiers: data.modifiers.length > 0 ? data.modifiers : undefined,
    });
  }

  // Show toast
  const sizeName = data.variant ? ` (${data.variant.shortName})` : "";
  toast.add({
    title: `${data.product.name}${sizeName} added`,
    icon: "i-heroicons-check-circle",
    color: "green",
    timeout: 1500,
  });

  selectedProductForVariant.value = null;
};

// Get item price including variant modifiers
const getItemPrice = (item: (typeof cart.value)[0]) => {
  let price = item.product.price;
  if (item.selectedVariant) {
    if (item.selectedVariant.priceModifierType === "percentage") {
      price += price * (item.selectedVariant.priceModifier / 100);
    } else {
      price += item.selectedVariant.priceModifier;
    }
  }
  if (item.selectedModifiers) {
    for (const mod of item.selectedModifiers) {
      price += mod.price;
    }
  }
  return price;
};

const increaseQuantity = (index: number) => {
  cart.value[index].quantity++;
};

const decreaseQuantity = (index: number) => {
  if (cart.value[index].quantity > 1) {
    cart.value[index].quantity--;
  } else {
    cart.value.splice(index, 1);
  }
};

const clearCart = () => {
  cart.value = [];
  showCartModal.value = false;
};

// Service actions
const callWaiter = async () => {
  isCallingWaiter.value = true;
  try {
    // Create a service request order
    const serviceRequest = {
      id: `SVC-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`,
      customer: "Customer",
      branch: "main",
      date: new Date().toISOString(),
      total: 0,
      totalSats: 0,
      currency: "LAK" as const,
      status: "pending" as const,
      orderType: "dine_in" as const,
      tableNumber:
        tableInfo.value?.tableName || tableInfo.value?.tableNumber || "",
      items: [],
      kitchenStatus: "new" as const,
      kitchenNotes: "🔔 CALL WAITER - Customer needs assistance",
    };

    await ordersStore.createOrder(serviceRequest);

    // Notify POS staff
    notificationsStore.addNotification({
      type: "alert",
      title: `🔔 Waiter Call from ${
        tableInfo.value?.tableName || tableInfo.value?.tableNumber
      }`,
      message: "Customer needs assistance",
      priority: "high",
      actionUrl: "/tables",
      data: {
        tableNumber: tableInfo.value?.tableNumber,
        tableName: tableInfo.value?.tableName,
        serviceType: "waiter_call",
      },
    });

    // Show toast to customer
    toast.add({
      title: t("order.waiterCalled", "Waiter Called!"),
      description:
        t("order.waiterCalledDesc", "Staff will be with you shortly"),
      icon: "i-heroicons-bell-alert",
      color: "amber",
    });

    // 🔔 Broadcast to POS for real-time notification (instant)
    if (import.meta.client) {
      const channel = new BroadcastChannel("bitspace-pos-commands");
      channel.postMessage({
        type: "waiter-call",
        tableNumber: tableInfo.value?.tableNumber,
        tableName: tableInfo.value?.tableName,
      });
      channel.close();
    }

    // 🔔 Publish to Nostr for cross-device notifications
    publishPosAlert("waiter-call", {
      tableNumber: tableInfo.value?.tableNumber,
      tableName: tableInfo.value?.tableName,
    });
  } catch (e) {
    console.error("Failed to call waiter:", e);
    toast.add({
      title: t("common.error", "Error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isCallingWaiter.value = false;
  }
};

const requestBill = async () => {
  isRequestingBill.value = true;
  try {
    // Mark session as requesting bill
    if (currentSession.value) {
      tableSession.requestBill(currentSession.value.sessionId);
      currentSession.value = tableSession.getSession(
        currentSession.value.sessionId
      );
    }

    // Get session info for notifications
    const sessionInfo = currentSession.value
      ? `${sessionOrderCount.value} orders, Total: ${formatPrice(
          sessionTotal.value
        )}`
      : "No active session";

    // Notify staff via notification store (persistent)
    notificationsStore.addNotification({
      type: "alert",
      title: `💰 Bill Request from ${
        tableInfo.value?.tableName || tableInfo.value?.tableNumber
      }`,
      message: `Customer wants to pay. ${sessionInfo}`,
      priority: "high",
      actionUrl: "/pos",
      data: {
        tableNumber: tableInfo.value?.tableNumber,
        tableName: tableInfo.value?.tableName,
        serviceType: "bill_request",
        sessionId: currentSession.value?.sessionId,
        sessionTotal: sessionTotal.value,
        sessionOrderCount: sessionOrderCount.value,
      },
    });

    // Show toast to customer
    toast.add({
      title: t("order.billRequested", "Bill Requested!"),
      description:
        t("order.billRequestedDesc", "Staff will bring your bill shortly"),
      icon: "i-heroicons-receipt-percent",
      color: "emerald",
    });

    // 🔔 Broadcast to POS for real-time notification (instant)
    if (import.meta.client) {
      const channel = new BroadcastChannel("bitspace-pos-commands");
      channel.postMessage({
        type: "bill-requested",
        tableNumber: tableInfo.value?.tableNumber,
        tableName: tableInfo.value?.tableName,
        sessionId: currentSession.value?.sessionId,
        sessionTotal: sessionTotal.value,
        orderCount: sessionOrderCount.value,
      });
      channel.close();
    }

    // 🔔 Publish to Nostr for cross-device notifications
    publishPosAlert("bill-request", {
      tableNumber: tableInfo.value?.tableNumber,
      tableName: tableInfo.value?.tableName,
      total: sessionTotal.value,
      orderCount: sessionOrderCount.value,
      sessionId: currentSession.value?.sessionId,
    });
  } catch (e) {
    console.error("Failed to request bill:", e);
    toast.add({
      title: t("common.error", "Error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isRequestingBill.value = false;
  }
};

// Re-order from history
const reorderFromHistory = (historyOrder: Order) => {
  // Clear current cart
  cart.value = [];

  // Add items from history order
  for (const item of historyOrder.items) {
    cart.value.push({
      product: item.product,
      quantity: item.quantity,
      notes: item.notes,
    });
  }

  showOrderHistoryModal.value = false;
  showCartModal.value = true;

  toast.add({
    title: t("order.reorderAdded", "Items Added to Cart"),
    icon: "i-heroicons-check-circle",
    color: "green",
  });
};

// Load session orders from OrderStore
const loadSessionOrders = async () => {
  if (!currentSession.value) return;

  try {
    const orders: Order[] = [];
    for (const orderId of currentSession.value.orders) {
      const order = ordersStore.getOrder(orderId);
      if (order) {
        orders.push(order);
      }
    }
    sessionOrders.value = orders;
  } catch (e) {
    console.error("Failed to load session orders:", e);
  }
};

// Load order history from localStorage
const loadOrderHistory = () => {
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem(ORDER_HISTORY_KEY);
      if (stored) {
        const allOrders = JSON.parse(stored) as Order[];
        // Filter to only show orders for this table (today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        orderHistory.value = allOrders
          .filter((o) => {
            const orderDate = new Date(o.date);
            return (
              orderDate >= today &&
              o.tableNumber ===
                (tableInfo.value?.tableName || tableInfo.value?.tableNumber)
            );
          })
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
      }
    } catch (e) {
      console.error("Failed to load order history:", e);
    }
  }
};

// Save order to history
const saveOrderToHistory = (order: Order) => {
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem(ORDER_HISTORY_KEY);
      const allOrders: Order[] = stored ? JSON.parse(stored) : [];
      allOrders.unshift(order);
      // Keep only last 50 orders
      if (allOrders.length > 50) {
        allOrders.splice(50);
      }
      localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(allOrders));
      orderHistory.value.unshift(order);
    } catch (e) {
      console.error("Failed to save order to history:", e);
    }
  }
};

// Submit order
const submitOrder = async () => {
  if (cart.value.length === 0) return;

  isSubmitting.value = true;

  try {
    // Generate order ID and code using EntityId utility
    const { id: orderId, code: orderCode } = EntityId.order();

    const order: Order = {
      id: orderId,
      code: orderCode,
      customer: "Customer",
      branch: "main",
      date: new Date().toISOString(),
      total: cartTotal.value,
      totalSats: 0,
      currency: "LAK" as const,
      status: "pending" as const,
      orderType: "dine_in" as const,
      tableNumber:
        tableInfo.value?.tableName || tableInfo.value?.tableNumber || "",
      items: cart.value.map((item) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        total: item.product.price * item.quantity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        product: item.product,
        notes: item.notes,
      })),
      kitchenStatus: "new" as const,
      kitchenNotes: cart.value
        .filter((item) => item.notes)
        .map((item) => `${item.product.name}: ${item.notes}`)
        .join("; "),
    };

    // Save order to local IndexedDB
    await ordersStore.createOrder(order);

    // Add order to current session
    if (currentSession.value) {
      tableSession.addOrderToSession(
        currentSession.value.sessionId,
        order.id,
        order.total
      );
      currentSession.value = tableSession.getSession(
        currentSession.value.sessionId
      );
      // Reload session orders
      await loadSessionOrders();
    }

    // Sync to Nostr if we have owner pubkey (ephemeral key signing for anonymous customer)
    if (ownerPubkey.value) {
      nostrData
        .saveOrderAsAnonymous(order, ownerPubkey.value)
        .then((event) => {
          if (event) {
          }
        })
        .catch((e) => {
          console.warn(
            "[Order] Failed to sync to Nostr (order still saved locally):",
            e
          );
        });
    }

    // Broadcast to admin tabs (localStorage/BroadcastChannel)
    broadcastOrderToAdmin(order);

    // 🔔 Publish to Nostr for cross-device notifications
    publishPosAlert("new-order", {
      tableNumber: tableInfo.value?.tableNumber,
      tableName: tableInfo.value?.tableName,
      total: order.total,
      orderId: order.id,
      orderCode: order.code,
      sessionId: currentSession.value?.sessionId,
    });

    // Save to local history
    saveOrderToHistory(order);

    // Generate public receipt (creates Nostr event + QR code)
    try {
      await receiptGenerator.createReceiptFromOrder(order, {
        method: "cash",
        paidAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[Order] Failed to generate receipt:", e);
      // Continue anyway - order is still saved
    }

    // Update state (use code for customer display, id for tracking)
    submittedOrderId.value = order.code || order.id;
    currentOrderStatus.value = "new";
    orderSubmitted.value = true;
    showCartModal.value = false;
    cart.value = [];

    toast.add({
      title: t("order.orderSuccess", "Order placed!"),
      description:
        t("order.orderSuccessDesc", "Your order has been sent to the kitchen"),
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    // Start polling for order status updates
    startOrderStatusPolling(order.id);
  } catch (e) {
    console.error("Failed to submit order:", e);
    toast.add({
      title: t("common.error", "Error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Order status polling
let statusPollInterval: ReturnType<typeof setInterval> | null = null;

const startOrderStatusPolling = (orderId: string) => {
  // Poll every 10 seconds for status updates
  statusPollInterval = setInterval(async () => {
    try {
      const order = ordersStore.getOrder(orderId);
      if (order?.kitchenStatus) {
        currentOrderStatus.value = order.kitchenStatus as
          | "new"
          | "preparing"
          | "ready"
          | "served";

        // Stop polling if order is served
        if (
          order.kitchenStatus === "served" ||
          order.kitchenStatus === "ready"
        ) {
          if (statusPollInterval) {
            clearInterval(statusPollInterval);
            statusPollInterval = null;
          }
        }
      }
    } catch (e) {
      console.error("Failed to poll order status:", e);
    }
  }, 10000);
};

// Start new order after submission
const startNewOrder = () => {
  orderSubmitted.value = false;
  submittedOrderId.value = null;
  currentOrderStatus.value = "new";
  if (statusPollInterval) {
    clearInterval(statusPollInterval);
    statusPollInterval = null;
  }
};

onMounted(async () => {
  const token = route.query.t as string;

  if (!token) {
    error.value = t("order.noToken", "No table token provided");
    isLoading.value = false;
    return;
  }

  const result = await tablesStore.validateTableToken(token);

  if (!result.valid) {
    error.value =
      result.error || t("order.invalidToken", "Invalid or expired token");
    isLoading.value = false;
    return;
  }

  tableInfo.value = {
    tableId: result.tableId || "",
    tableNumber: result.tableNumber || "",
    tableName: result.tableName || "",
  };

  // Try to load products from owner's Nostr data if pubkey is available
  if (result.ownerPubkey) {
    ownerPubkey.value = result.ownerPubkey;
    try {
      const [products, categories] = await Promise.all([
        nostrData.getProductsForOwner(result.ownerPubkey),
        nostrData.getCategoriesForOwner(result.ownerPubkey),
      ]);

      ownerProducts.value = products;
      ownerCategories.value = categories;
    } catch (e) {
      console.error("[Order] Failed to load from Nostr:", e);
    }
  }

  // Fallback: Also try local store (if on same browser as admin)
  if (ownerProducts.value.length === 0) {
    await productsStore.init();
  }

  await ordersStore.init();

  // Create or load table session
  if (tableInfo.value) {
    currentSession.value = tableSession.getOrCreateSession(
      tableInfo.value.tableId,
      tableInfo.value.tableNumber,
      tableInfo.value.tableName,
      "LAK"
    );
    // Load existing orders in session
    await loadSessionOrders();
  }

  // Load order history
  loadOrderHistory();

  isLoading.value = false;
});

onUnmounted(() => {
  if (statusPollInterval) {
    clearInterval(statusPollInterval);
  }
});
</script>

<style scoped>
/* Scoped styles removed - moved to global main.css */
</style>
