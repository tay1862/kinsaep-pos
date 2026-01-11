<script setup lang="ts">
// 👥 Employee Detail Component - View employee information with tabs
import type { Employee } from "~/types";

const props = defineProps<{
  employee: Employee;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "edit"): void;
  (e: "duplicate", id: string): void;
  (e: "terminate", id: string): void;
  (e: "delete", id: string): void;
  (e: "refresh"): void;
}>();

const { t } = useI18n();
const employeesStore = useEmployeesStore();

// Tab state
const activeTab = ref(0);
const tabs = computed(() => [
  {
    label: t("employees.tabs.overview", "Overview"),
    icon: "i-heroicons-user-circle",
  },
  {
    label: t("employees.tabs.productAssignment", "Product Assignment"),
    icon: "i-heroicons-shopping-bag",
    disabled: !props.employee.canAccessPOS,
  },
  {
    label: t("employees.tabs.posAccess", "POS Access"),
    icon: "i-heroicons-device-tablet",
  },
  {
    label: t("employees.tabs.leave", "Leave & Payroll"),
    icon: "i-heroicons-calendar-days",
  },
]);

// Status badge color
function getStatusColor(
  status: string
): "success" | "neutral" | "warning" | "error" {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "neutral";
    case "on-leave":
      return "warning";
    case "terminated":
      return "error";
    default:
      return "neutral";
  }
}

// Format currency
function formatCurrency(amount: number, currency: string = "LAK"): string {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Calculate tenure
const tenure = computed(() => {
  if (!props.employee.hireDate) return "-";
  const hire = new Date(props.employee.hireDate);
  const now = new Date();
  const years = Math.floor(
    (now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  const months = Math.floor(
    ((now.getTime() - hire.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) /
    (30.44 * 24 * 60 * 60 * 1000)
  );

  if (years > 0)
    return `${years} ${t("common.years")}, ${months} ${t("common.months")}`;
  return `${months} ${t("common.months")}`;
});
</script>

<template>
  <div class="bg-white dark:bg-gray-800 h-full overflow-hidden flex flex-col">
    <!-- Header with gradient -->
    <div class="relative bg-linear-to-r from-primary-500 to-primary-600 p-6 text-white">
      <UButton class="absolute top-4 right-4" color="white" variant="ghost" icon="i-heroicons-x-mark"
        @click="emit('close')" />

      <div class="flex items-center gap-4">
        <UAvatar :src="employee.avatar" :alt="`${employee.firstName} ${employee.lastName}`" size="2xl"
          class="ring-4 ring-white/30" />
        <div>
          <h2 class="text-2xl font-bold">
            {{ employee.firstName }} {{ employee.lastName }}
          </h2>
          <p class="text-primary-100">
            {{ employee.position || t("employees.noPosition") }}
          </p>
          <div class="flex items-center gap-2 mt-2">
            <UBadge :color="getStatusColor(employee.status)" size="sm">
              {{ t(`employees.status.${employee.status}`) }}
            </UBadge>
            <span class="text-sm text-primary-200">{{
              employee.employeeCode
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
      <UTabs v-model="activeTab" :items="tabs" />
    </div>
    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Tab 0: Overview -->
      <div v-if="activeTab == 0" class="space-y-6">
        <!-- Quick Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ formatCurrency(employee.baseSalary, employee.currency) }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t(`employees.salaryType.${employee.salaryType}`) }}
            </p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ employee.annualLeaveBalance }}
            </p>
            <p class="text-xs text-gray-500">{{ t("employees.annualLeave") }}</p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ employee.sickLeaveBalance }}
            </p>
            <p class="text-xs text-gray-500">{{ t("employees.sickLeave") }}</p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ tenure }}
            </p>
            <p class="text-xs text-gray-500">{{ t("employees.tenure") }}</p>
          </div>
        </div>

        <!-- Employment Info -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-briefcase" class="w-4 h-4 text-primary-500" />
            {{ t("employees.employmentInfo") }}
          </h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-500">{{ t("employees.department") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.department || "-" }}
              </p>
            </div>
            <div>
              <p class="text-gray-500">{{ t("employees.position") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.position || "-" }}
              </p>
            </div>
            <div>
              <p class="text-gray-500">{{ t("employees.employmentType") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ t(`employees.type.${employee.employmentType}`) }}
              </p>
            </div>
            <div>
              <p class="text-gray-500">{{ t("employees.hireDate") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ formatDate(employee.hireDate) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Contact Info -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-phone" class="w-4 h-4 text-primary-500" />
            {{ t("employees.contactInfo") }}
          </h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-500">{{ t("employees.phone") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.phone || "-" }}
              </p>
            </div>
            <div>
              <p class="text-gray-500">{{ t("employees.email") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.email || "-" }}
              </p>
            </div>
            <div class="col-span-2">
              <p class="text-gray-500">{{ t("employees.address") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.address || "-" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Emergency Contact -->
        <div v-if="employee.emergencyContactName" class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-warning-500" />
            {{ t("employees.emergencyContact") }}
          </h3>
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p class="text-gray-500">{{ t("employees.contactName") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.emergencyContactName }}
              </p>
            </div>
            <div>
              <p class="text-gray-500">{{ t("employees.contactPhone") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.emergencyContactPhone }}
              </p>
            </div>
            <div>
              <p class="text-gray-500">{{ t("employees.contactRelation") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.emergencyContactRelation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Payment Info -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-banknotes" class="w-4 h-4 text-success-500" />
            {{ t("employees.paymentInfo") }}
          </h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-500">{{ t("employees.preferredPayment") }}</p>
              <p class="font-medium text-gray-900 dark:text-white capitalize">
                {{
                  t(`employees.paymentMethod.${employee.preferredPaymentMethod}`)
                }}
              </p>
            </div>
            <div v-if="employee.preferredPaymentMethod === 'bank'">
              <p class="text-gray-500">{{ t("employees.bankAccount") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.bankName }} - {{ employee.bankAccount }}
              </p>
            </div>
            <div v-if="employee.preferredPaymentMethod === 'lightning'">
              <p class="text-gray-500">{{ t("employees.lightningAddress") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.lightningAddress }}
              </p>
            </div>
            <div v-if="employee.commissionEnabled">
              <p class="text-gray-500">{{ t("employees.commissionRate") }}</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ employee.commissionRate }}%
              </p>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="employee.notes" class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">
            {{ t("employees.notes") }}
          </h3>
          <p class="text-sm text-gray-700 dark:text-gray-300">
            {{ employee.notes }}
          </p>
        </div>
      </div>
      <!-- End Tab 0 -->

      <!-- Tab 1: Product Assignment -->
      <div v-else-if="activeTab == 1">
        <EmployeeStaffProductAssignment :employee="props.employee" @updated="emit('refresh')" />
      </div>

      <!-- Tab 2: POS Access & Nostr -->
      <div v-else-if="activeTab == 2">
        <EmployeePOSAccess :employee="props.employee" @updated="emit('refresh')" />
      </div>

      <!-- Tab 3: Leave & Payroll -->
      <div v-else-if="activeTab == 3">
        <EmployeeLeaveManagement :employee="props.employee" @updated="emit('refresh')" />
      </div>
    </div>

    <!-- Footer -->
    <div
      class="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div class="flex items-center gap-2">
        <div class="text-xs text-gray-500">
          {{ t("common.lastUpdated") }}: {{ formatDate(employee.updatedAt) }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton v-if="employee.status !== 'terminated'" color="warning" variant="ghost" icon="i-heroicons-no-symbol"
          size="sm" @click="emit('terminate', employee.id)">
          {{ t("employees.actions.terminate") }}
        </UButton>
        <UButton color="neutral" variant="ghost" icon="i-heroicons-document-duplicate" size="sm"
          @click="emit('duplicate', employee.id)">
          {{ t("employees.actions.duplicate") }}
        </UButton>
        <UButton color="neutral" variant="ghost" @click="emit('close')">
          {{ t("common.close") }}
        </UButton>
        <UButton color="primary" icon="i-heroicons-pencil-square" @click="emit('edit')">
          {{ t("common.edit") }}
        </UButton>
      </div>
    </div>
  </div>
</template>
