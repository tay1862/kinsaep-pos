<script setup lang="ts">
/**
 * Employee Leave Management Component
 * Manage leave balances and payroll information
 */
import type { Employee } from "~/types";

const props = defineProps<{
  employee: Employee;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const { t } = useI18n();
const toast = useToast();
const employeesStore = useEmployeesStore();

// State
const isLoading = ref(false);
const adjustmentType = ref<"annual" | "sick" | "personal">("annual");
const adjustmentAmount = ref(0);

// Leave types
const leaveTypes = [
  {
    type: "annual",
    label: t('employees.annualLeave', 'Annual Leave'),
    icon: "i-heroicons-calendar",
    color: "blue",
  },
  {
    type: "sick",
    label: t('employees.sickLeave', 'Sick Leave'),
    icon: "i-heroicons-heart",
    color: "red",
  },
  {
    type: "personal",
    label: t('employees.personalLeave', 'Personal Leave'),
    icon: "i-heroicons-user",
    color: "purple",
  },
];

// Adjust leave balance
async function adjustLeave() {
  if (adjustmentAmount.value === 0) {
    toast.add({
      title: t('errors.invalidAmount', 'Invalid Amount'),
      description: t('errors.nonZeroAmount', 'Please enter a non-zero amount'),
      icon: 'i-heroicons-exclamation-triangle',
      color: 'orange',
    });
    return;
  }

  isLoading.value = true;
  try {
    await employeesStore.adjustLeaveBalance(
      props.employee.id,
      adjustmentType.value,
      adjustmentAmount.value
    );

    toast.add({
      title: t('employees.leaveUpdated', 'Leave Balance Updated'),
      description: t('employees.leaveAdjustedBy', `${adjustmentType.value} leave adjusted by ${adjustmentAmount.value} days`),
      icon: 'i-heroicons-check-circle',
      color: 'green',
    });

    adjustmentAmount.value = 0;
    emit("updated");
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isLoading.value = false;
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

// Calculate monthly pay
const monthlyPay = computed(() => {
  return employeesStore.calculateMonthlyPay(props.employee.id);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Leave Balances -->
    <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-primary-500" />
        {{ t("employees.leaveBalances", "Leave Balances") }}
      </h3>

      <div class="grid grid-cols-3 gap-4">
        <!-- Annual Leave -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
          <UIcon name="i-heroicons-calendar" class="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ employee.annualLeaveBalance }}
          </p>
          <p class="text-sm text-gray-500">Annual Leave</p>
        </div>

        <!-- Sick Leave -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
          <UIcon name="i-heroicons-heart" class="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ employee.sickLeaveBalance }}
          </p>
          <p class="text-sm text-gray-500">Sick Leave</p>
        </div>

        <!-- Personal Leave -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
          <UIcon name="i-heroicons-user" class="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ employee.personalLeaveBalance }}
          </p>
          <p class="text-sm text-gray-500">Personal Leave</p>
        </div>
      </div>
    </div>

    <!-- Adjust Leave Balance -->
    <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {{ t("employees.adjustLeave", "Adjust Leave Balance") }}
      </h3>

      <div class="space-y-4">
        <UFormField :label="t('employees.leaveType', 'Leave Type')">
          <USelectMenu
            v-model="adjustmentType"
            :items="leaveTypes.map(lt => ({ value: lt.type, label: lt.label }))"
            value-key="value"
            label-key="label"
          />
        </UFormField>

        <UFormField
          :label="t('employees.adjustmentAmount', 'Adjustment Amount')"
          :help="t('employees.adjustmentHelp', 'Positive to add, negative to deduct')"
        >
          <UInput
            v-model.number="adjustmentAmount"
            type="number"
            placeholder="0"
            icon="i-heroicons-plus-minus"
          />
        </UFormField>

        <div class="flex justify-end">
          <UButton
            color="primary"
            icon="i-heroicons-check"
            :loading="isLoading"
            :disabled="adjustmentAmount === 0"
            @click="adjustLeave"
          >
            {{ t("common.apply", "Apply") }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Payroll Information -->
    <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-success-500" />
        {{ t("employees.payrollInfo", "Payroll Information") }}
      </h3>

      <div class="grid grid-cols-2 gap-4">
        <!-- Base Salary -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p class="text-sm text-gray-500 mb-1">{{ t('employees.baseSalary', 'Base Salary') }}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {{ formatCurrency(employee.baseSalary, employee.currency) }}
          </p>
          <p class="text-xs text-gray-500 capitalize mt-1">
            {{ employee.salaryType }}
          </p>
        </div>

        <!-- Monthly Estimate -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p class="text-sm text-gray-500 mb-1">{{ t('employees.monthlyEstimate', 'Monthly Estimate') }}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {{ formatCurrency(monthlyPay, employee.currency) }}
          </p>
          <p class="text-xs text-gray-500 mt-1">{{ t('employees.calculatedMonthly', 'Calculated monthly') }}</p>
        </div>

        <!-- Commission -->
        <div v-if="employee.commissionEnabled" class="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p class="text-sm text-gray-500 mb-1">{{ t('employees.commissionRate', 'Commission Rate') }}</p>
          <p class="text-xl font-bold text-success-600 dark:text-success-400">
            {{ employee.commissionRate }}%
          </p>
          <p class="text-xs text-gray-500 mt-1">{{ t('employees.perSale', 'Per sale') }}</p>
        </div>

        <!-- Payment Method -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p class="text-sm text-gray-500 mb-1">{{ t('employees.paymentMethod', 'Payment Method') }}</p>
          <p class="text-lg font-medium text-gray-900 dark:text-white capitalize">
            {{ employee.preferredPaymentMethod }}
          </p>
          <p v-if="employee.preferredPaymentMethod === 'bank'" class="text-xs text-gray-500 mt-1">
            {{ employee.bankName }} - {{ employee.bankAccount }}
          </p>
          <p v-if="employee.preferredPaymentMethod === 'lightning'" class="text-xs text-gray-500 mt-1">
            {{ employee.lightningAddress }}
          </p>
        </div>
      </div>
    </div>

    <!-- Employment Details -->
    <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {{ t("employees.employmentDetails", "Employment Details") }}
      </h3>

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p class="text-gray-500">{{ t('employees.employmentType', 'Employment Type') }}</p>
          <p class="font-medium text-gray-900 dark:text-white capitalize">
            {{ employee.employmentType.replace("-", " ") }}
          </p>
        </div>

        <div>
          <p class="text-gray-500">{{ t('employees.hireDate', 'Hire Date') }}</p>
          <p class="font-medium text-gray-900 dark:text-white">
            {{ employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : "-" }}
          </p>
        </div>

        <div v-if="employee.overtimeRate">
          <p class="text-gray-500">{{ t('employees.overtimeRate', 'Overtime Rate') }}</p>
          <p class="font-medium text-gray-900 dark:text-white">
            {{ employee.overtimeRate }}x
          </p>
        </div>

        <div>
          <p class="text-gray-500">{{ t('employees.status.label', 'Status') }}</p>
          <UBadge
            :color="employee.status === 'active' ? 'green' : 'gray'"
            variant="subtle"
            :label="employee.status"
          />
        </div>
      </div>
    </div>
  </div>
</template>
