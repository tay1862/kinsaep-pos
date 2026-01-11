<template>
  <div class="bill-print-container">
    <!-- Screen View Controls -->
    <div class="print:hidden mb-6 flex justify-between items-center p-4">
      <div class="flex items-center gap-4">
        <UButton
          :label="$t('orders.backToOrders')"
          icon="i-heroicons-arrow-left"
          variant="outline"
          @click="$router.go(-1)"
        />
      </div>
      <div class="flex items-center gap-2">
        <UButton
          :label="$t('common.print')"
          icon="i-heroicons-printer"
          @click="printBill"
        />
        <UButton
          :label="$t('common.export', { type: 'PDF' })"
          icon="i-heroicons-document-arrow-down"
          variant="outline"
          @click="downloadPDF"
        />
      </div>
    </div>

    <!-- Print Content -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-10 h-10 animate-spin text-primary-500"
      />
    </div>
    <UCard v-else class="bill-print-content max-w-4xl mx-auto">
      <div class="space-y-6">
        <!-- Header Section -->
        <div
          class="flex justify-between items-start border-b border-gray-200 dark:border-slate-800 pb-6"
        >
          <div class="flex items-start gap-6">
            <img
              v-if="companyInfo.logo"
              :src="companyInfo.logo"
              :alt="companyInfo.name"
              class="h-16 w-16 object-contain"
            />
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ companyInfo.name }}
              </h1>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {{ companyInfo.address }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("common.phone") }}: {{ companyInfo.phone }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("common.email") }}: {{ companyInfo.email }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <h2 class="text-2xl font-bold text-primary-600">
              {{ $t("orders.invoice") }}
            </h2>
            <p class="text-lg font-semibold mt-1 text-gray-900 dark:text-white">
              #{{ billData.invoiceNumber }}
            </p>
            <p
              v-if="billData.orderNumber"
              class="text-3xl font-bold text-gray-900 dark:text-white mt-1"
            >
              #{{ billData.orderNumber }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {{ $t("common.branch") }}: {{ currentBranch?.name }}
            </p>
          </div>
        </div>

        <!-- Bill Info and Customer Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Customer Information -->
          <div>
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-3"
            >
              {{ $t("orders.billTo") }}
            </h3>
            <div class="space-y-1">
              <p class="font-medium text-gray-900 dark:text-white">
                {{ billData.customer.name }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ billData.customer.address }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("common.phone") }}: {{ billData.customer.phone }}
              </p>
              <p
                class="text-sm text-gray-600 dark:text-gray-400"
                v-if="billData.customer.email"
              >
                {{ $t("common.email") }}: {{ billData.customer.email }}
              </p>
              <p
                class="text-sm text-gray-600 dark:text-gray-400"
                v-if="billData.customer.taxId"
              >
                {{ $t("orders.taxId") }}: {{ billData.customer.taxId }}
              </p>
            </div>
          </div>

          <!-- Invoice Details -->
          <div>
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-3"
            >
              {{ $t("orders.orderInfo") }}
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400"
                  >{{ $t("orders.invoiceDate") }}:</span
                >
                <span class="font-medium text-gray-900 dark:text-white">{{
                  formatDate(billData.date)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400"
                  >{{ $t("orders.dueDate") }}:</span
                >
                <span class="font-medium text-gray-900 dark:text-white">{{
                  formatDate(billData.dueDate)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400"
                  >{{ $t("orders.paymentTerms") }}:</span
                >
                <span class="font-medium text-gray-900 dark:text-white">{{
                  billData.paymentTerms
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400"
                  >{{ $t("orders.salesPerson") }}:</span
                >
                <span class="font-medium text-gray-900 dark:text-white">{{
                  billData.salesPerson
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="overflow-x-auto">
          <table
            class="w-full border-collapse border dark:border-slate-800 border-gray-300"
          >
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {{ $t("common.items") }}
                </th>
                <th
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {{ $t("common.quantity") }}
                </th>
                <th
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {{ $t("products.unit") }}
                </th>
                <th
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {{ $t("orders.unitPrice") }}
                </th>
                <th
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {{ $t("common.discount") }}
                </th>
                <th
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {{ $t("common.total") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in billData.items"
                :key="index"
                class="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3"
                >
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ item.name }}
                    </p>
                    <p
                      class="text-sm text-gray-600 dark:text-gray-400"
                      v-if="item.description"
                    >
                      {{ item.description }}
                    </p>
                    <p
                      class="text-xs text-gray-500 dark:text-gray-500"
                      v-if="item.sku"
                    >
                      {{ $t("products.sku") }}: {{ item.sku }}
                    </p>
                    <p
                      class="text-xs text-green-600 dark:text-green-400 font-semibold mt-1"
                      v-if="item.freeQuantity && item.freeQuantity > 0"
                    >
                      🎁 {{ item.freeQuantity }} FREE
                    </p>
                  </div>
                </td>
                <td
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-center text-gray-900 dark:text-white"
                >
                  {{ formatNumber(item.quantity) }}
                </td>
                <td
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-center text-gray-900 dark:text-white"
                >
                  {{ item.unit }}
                </td>
                <td
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right text-gray-900 dark:text-white"
                >
                  {{ formatCurrency(item.unitPrice) }}
                </td>
                <td
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right text-gray-900 dark:text-white"
                >
                  {{ item.discount > 0 ? formatCurrency(item.discount) : "-" }}
                </td>
                <td
                  class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right font-medium text-gray-900 dark:text-white"
                >
                  {{ formatCurrency(item.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Promotions Detail Section -->
        <div
          v-if="billData.appliedPromotions && billData.appliedPromotions.length > 0 && receiptSettings.settings.value.content.showPromotionDetails"
          class="mt-6 mb-4 border-4 border-green-300 dark:border-green-700 rounded-xl p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30"
        >
          <h3 class="font-bold text-green-800 dark:text-green-300 mb-4 flex items-center gap-3 text-xl border-b-2 border-green-300 dark:border-green-700 pb-2">
            <span class="text-3xl">🎁</span>
            <span>PROMOTIONS APPLIED</span>
          </h3>
          <div class="space-y-4">
            <div
              v-for="promo in billData.appliedPromotions"
              :key="promo.promotionId"
              class="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-green-400 dark:border-green-600 shadow-md"
            >
              <!-- Promotion Name -->
              <div class="font-bold text-green-800 dark:text-green-300 mb-2 text-lg border-b border-green-200 dark:border-green-700 pb-2">
                {{ promo.promotionName }}
              </div>

              <!-- Description -->
              <div v-if="promo.description" class="text-green-700 dark:text-green-400 mb-3 italic">
                ✨ {{ promo.description }}
              </div>

              <!-- Savings Highlight -->
              <div class="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 p-3 rounded-lg border-2 border-green-500 dark:border-green-600">
                <div class="flex justify-between items-center">
                  <span class="text-green-800 dark:text-green-300 font-bold text-base">💰 You Saved:</span>
                  <span class="text-green-800 dark:text-green-200 font-black text-2xl">
                    {{ formatCurrency(promo.discountAmount) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Savings Footer -->
          <div class="mt-4 pt-3 border-t-2 border-green-300 dark:border-green-700">
            <div class="flex justify-between items-center">
              <span class="text-green-800 dark:text-green-300 font-bold text-lg">🎉 Total Promotion Savings:</span>
              <span class="text-green-800 dark:text-green-200 font-black text-3xl">
                {{ formatCurrency(billData.appliedPromotions.reduce((sum, p) => sum + p.discountAmount, 0)) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Summary Section -->
        <div class="flex justify-end">
          <div class="w-full md:w-96 space-y-3">
            <div class="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">
              SUMMARY
            </div>
            <div
              class="flex justify-between py-2 border-t dark:border-slate-800 border-gray-200"
            >
              <span class="text-gray-600 dark:text-gray-400"
                >{{ $t("common.subtotal") }}:</span
              >
              <span class="font-medium text-gray-900 dark:text-white">{{
                formatCurrency(billData.subtotal)
              }}</span>
            </div>
            <!-- Total Promotion Savings -->
            <div
              v-if="billData.appliedPromotions && billData.appliedPromotions.length > 0"
              class="flex justify-between py-2"
            >
              <span class="text-green-600 dark:text-green-400 font-medium">
                Promotion Savings:
              </span>
              <span class="font-bold text-green-600 dark:text-green-400">
                -{{ formatCurrency(billData.appliedPromotions.reduce((sum, p) => sum + p.discountAmount, 0)) }}
              </span>
            </div>
            <!-- Regular Discount -->
            <div v-if="billData.discount > 0" class="flex justify-between py-2">
              <span class="text-gray-600 dark:text-gray-400"
                >{{ $t("common.discount") }}:</span
              >
              <span class="font-medium text-red-600"
                >-{{ formatCurrency(billData.discount) }}</span
              >
            </div>
            <div v-if="billData.tax > 0" class="flex justify-between py-2">
              <span class="text-gray-600 dark:text-gray-400"
                >{{ $t("common.tax") }} ({{ billData.taxRate }}%):</span
              >
              <span class="font-medium text-gray-900 dark:text-white">{{
                formatCurrency(billData.tax)
              }}</span>
            </div>
            <div v-if="billData.shipping > 0" class="flex justify-between py-2">
              <span class="text-gray-600 dark:text-gray-400"
                >{{ $t("orders.shipping") }}:</span
              >
              <span class="font-medium text-gray-900 dark:text-white">{{
                formatCurrency(billData.shipping)
              }}</span>
            </div>
            <div
              class="flex justify-between py-3 border-t-2 dark:border-slate-800 border-gray-300 bg-gray-50 dark:bg-gray-800 px-2 rounded"
            >
              <span class="text-xl font-bold text-gray-900 dark:text-white"
                >TOTAL PAID:</span
              >
              <span class="text-xl font-bold text-primary-600">{{
                formatCurrency(billData.total)
              }}</span>
            </div>
            <div
              v-if="billData.amountPaid > 0"
              class="flex justify-between py-2"
            >
              <span class="text-gray-600 dark:text-gray-400"
                >{{ $t("orders.paid") }}:</span
              >
              <span class="font-medium text-green-600">{{
                formatCurrency(billData.amountPaid)
              }}</span>
            </div>
            <div v-if="billData.balance > 0" class="flex justify-between py-2">
              <span class="text-gray-600 dark:text-gray-400"
                >{{ $t("orders.balanceDue") }}:</span
              >
              <span class="font-bold text-red-600">{{
                formatCurrency(billData.balance)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Payment Information -->
        <div
          v-if="billData.paymentMethod"
          class="border-t dark:border-slate-800 border-gray-200 pt-6"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {{ $t("orders.paymentMethod") }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p>
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ billData.paymentMethod || "Cash" }}
                </span>
              </p>
              <p v-if="billData.paymentReference">
                <span class="text-gray-600 dark:text-gray-400">Reference:</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ billData.paymentReference }}
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- Notes and Terms -->
        <div
          v-if="billData.notes || billData.terms"
          class="border-t dark:border-slate-800 border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div v-if="billData.notes">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            >
              {{ $t("common.notes") }}
            </h3>
            <p
              class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line"
            >
              {{ billData.notes }}
            </p>
          </div>
          <div v-if="billData.terms">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            >
              {{ $t("orders.paymentTerms") }}
            </h3>
            <p
              class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line"
            >
              {{ billData.terms }}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="border-t border-gray-200 dark:border-slate-800 pt-6 text-center text-sm text-gray-500"
        >
          <p>{{ $t("receipt.thankYou") }}</p>
          <p class="mt-2">
            {{ $t("common.created") }}: {{ formatDateTime(new Date()) }}
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
interface CustomerInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  taxId?: string;
}

interface BillItem {
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
}

interface BillData {
  invoiceNumber: string;
  orderNumber?: number;
  date: string;
  dueDate: string;
  paymentTerms: string;
  salesPerson: string;
  customer: CustomerInfo;
  items: BillItem[];
  subtotal: number;
  appliedPromotions?: Array<{
    promotionId: string;
    promotionName: string;
    discountAmount: number;
    description?: string;
  }>;
  discount: number;
  tax: number;
  taxRate: number;
  shipping: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  terms?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface CompanyInfo {
  name: string;
  logo?: string;
  address: string;
  phone: string;
  email: string;
}

const { t } = useI18n();
const route = useRoute();
const receiptSettings = useReceiptSettings();
const shop = useShop();

// Computed
const currentBranch = computed(() => shop.currentBranch.value);

const companyInfo = computed<CompanyInfo>(() => ({
  name: receiptSettings.merchantName.value,
  logo: receiptSettings.showLogo.value
    ? receiptSettings.logoUrl.value
    : undefined,
  address: receiptSettings.merchantAddress.value,
  phone: receiptSettings.merchantPhone.value,
  email: receiptSettings.merchantEmail.value || "",
}));

const billData = ref<BillData>({
  invoiceNumber: "",
  orderNumber: undefined,
  date: new Date().toISOString(),
  dueDate: "",
  paymentTerms: "",
  salesPerson: "",
  customer: {
    name: "",
    address: "",
    phone: "",
    email: "",
    taxId: "",
  },
  items: [],
  subtotal: 0,
  appliedPromotions: [],
  discount: 0,
  tax: 0,
  taxRate: 0,
  shipping: 0,
  total: 0,
  amountPaid: 0,
  balance: 0,
  paymentMethod: "",
  paymentReference: "",
  notes: "",
  terms: "",
});

// Methods
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (number: number): string => {
  return new Intl.NumberFormat("lo-LA").format(number);
};

const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat("lo-LA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));
};

const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat("lo-LA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const printBill = (): void => {
  window.print();
};

const downloadPDF = (): void => {
  // Implement PDF download functionality
  // You might want to use libraries like jsPDF or html2pdf
  console.log("Download PDF functionality to be implemented");
};

// Initialize
const isLoading = ref(true);
const ordersStore = useOrders();

onMounted(async () => {
  const orderId = route.params.id as string;
  if (orderId) {
    isLoading.value = true;
    try {
      const order = await ordersStore.getOrderById(orderId);
      if (order) {
        // Map Order to BillData
        billData.value = {
          invoiceNumber: order.code || order.id.slice(0, 8).toUpperCase(),
          orderNumber: order.orderNumber,
          date: order.date,
          // Default due date to 30 days if not set (business logic can be improved)
          dueDate: new Date(
            new Date(order.date).getTime() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          paymentTerms: t("orders.net_30"), // Could be dynamic based on customer settings
          salesPerson: "Staff", // Could be dynamic based on logged in user or order metadata
          customer: {
            name: order.customer || "Guest Customer",
            address: order.deliveryAddress || "", // Map delivery address if available
            phone: order.customerPhone || "",
            email: order.customerEmail || "",
            taxId: "", // Not currently in Order type
          },
          items: order.items.map((item) => ({
            name: item.product.name,
            description: item.notes,
            sku: item.product.sku,
            quantity: item.quantity,
            unit: "unit", // Default, should ideally come from product
            unitPrice: item.price,
            discount: 0, // Item level discount not explicitly in OrderItem yet
            total: item.total,
          })),
          subtotal: order.total - (order.tax || 0) + (order.discount || 0),
          appliedPromotions: order.appliedPromotions?.map(promo => ({
            promotionId: promo.promotionId,
            promotionName: promo.promotionName,
            discountAmount: promo.discountAmount,
            description: promo.description,
          })),
          discount: order.discount || 0,
          tax: order.tax || 0,
          taxRate: 0, // Derived or fixed
          shipping: 0,
          total: order.total,
          amountPaid: order.status === "completed" ? order.total : 0,
          balance: order.status === "completed" ? 0 : order.total,
          paymentMethod: order.paymentMethod,
          paymentReference:
            order.paymentProof?.paymentHash || order.paymentProof?.id,
          notes: order.notes,
          terms: "", // Default terms
        };
      } else {
        console.error("Order not found");
        // navigateTo('/orders') // Optional: redirect if not found
      }
    } catch (e) {
      console.error("Failed to fetch order", e);
    } finally {
      isLoading.value = false;
    }
  }
});

// Meta
definePageMeta({
  title: "Bill Print",
  layout: "blank",
  middleware: ["auth"],
});

useHead({
  title: `${t("orders.invoice")} #${billData.value.invoiceNumber}`,
});
</script>

<style scoped>
@media print {
  .bill-print-container {
    padding: 0;
  }

  .bill-print-content {
    border: none;
    box-shadow: none;
    border-radius: 0;
    background: white !important;
  }

  /* Force light mode colors for print */
  .bill-print-content * {
    color: #1f2937 !important;
    background: transparent !important;
    border-color: #e5e7eb !important;
  }

  .bill-print-content table {
    background: white !important;
  }

  .bill-print-content thead {
    background: #f9fafb !important;
  }

  .bill-print-content h1,
  .bill-print-content h2,
  .bill-print-content h3 {
    color: #111827 !important;
  }

  .text-primary-600 {
    color: #2563eb !important;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.bill-print-content {
  font-size: 14px;
}

@media print {
  .bill-print-content {
    font-size: 12px;
  }
}
</style>
