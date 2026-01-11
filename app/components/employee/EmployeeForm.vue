<script setup lang="ts">
// 👥 Employee Form Component - Create/Edit Employee
import type {
  Employee,
  EmploymentType,
  SalaryType,
  EmployeePaymentMethod,
  EmployeeStatus,
} from "~/types";

const props = defineProps<{
  employee?: Employee;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", employee: Employee): void;
}>();

const { t } = useI18n();
const employeesStore = useEmployeesStore();

const isLoading = ref(false);
const isEditMode = computed(() => !!props.employee);

// Form data with defaults
const form = ref({
  firstName: props.employee?.firstName || "",
  lastName: props.employee?.lastName || "",
  displayName: props.employee?.displayName || "",
  email: props.employee?.email || "",
  phone: props.employee?.phone || "",
  dateOfBirth: props.employee?.dateOfBirth || "",
  gender: props.employee?.gender || undefined,
  nationalId: props.employee?.nationalId || "",

  // Address
  address: props.employee?.address || "",
  city: props.employee?.city || "",
  province: props.employee?.province || "",

  // Emergency Contact
  emergencyContactName: props.employee?.emergencyContactName || "",
  emergencyContactPhone: props.employee?.emergencyContactPhone || "",
  emergencyContactRelation: props.employee?.emergencyContactRelation || "",

  // Employment
  department: props.employee?.department || "",
  position: props.employee?.position || "",
  employmentType:
    props.employee?.employmentType || ("full-time" as EmploymentType),
  hireDate: props.employee?.hireDate || new Date().toISOString().split("T")[0],
  status: props.employee?.status || ("active" as EmployeeStatus),
  branchId: props.employee?.branchId || "",

  // Compensation
  salaryType: props.employee?.salaryType || ("monthly" as SalaryType),
  baseSalary: props.employee?.baseSalary || 0,
  currency: props.employee?.currency || "LAK",
  overtimeRate: props.employee?.overtimeRate || 1.5,

  // Payment
  bankName: props.employee?.bankName || "",
  bankAccount: props.employee?.bankAccount || "",
  lightningAddress: props.employee?.lightningAddress || "",
  preferredPaymentMethod:
    props.employee?.preferredPaymentMethod || ("cash" as EmployeePaymentMethod),

  // Leave Balances
  annualLeaveBalance: props.employee?.annualLeaveBalance || 12,
  sickLeaveBalance: props.employee?.sickLeaveBalance || 30,
  personalLeaveBalance: props.employee?.personalLeaveBalance || 6,

  // POS Access
  canAccessPOS: props.employee?.canAccessPOS || false,
  pin: props.employee?.pin || "",

  // Commission
  commissionEnabled: props.employee?.commissionEnabled || false,
  commissionRate: props.employee?.commissionRate || 0,

  // Notes
  notes: props.employee?.notes || "",
});

// Options
const employmentTypeOptions = [
  { value: "full-time", label: t("employees.type.fullTime") },
  { value: "part-time", label: t("employees.type.partTime") },
  { value: "contract", label: t("employees.type.contract") },
  { value: "intern", label: t("employees.type.intern") },
  { value: "freelance", label: t("employees.type.freelance") },
];

const salaryTypeOptions = [
  { value: "hourly", label: t("employees.salaryType.hourly") },
  { value: "daily", label: t("employees.salaryType.daily") },
  { value: "weekly", label: t("employees.salaryType.weekly") },
  { value: "monthly", label: t("employees.salaryType.monthly") },
];

const paymentMethodOptions = [
  {
    value: "cash",
    label: t("employees.paymentMethod.cash"),
    icon: "i-heroicons-banknotes",
  },
  {
    value: "bank",
    label: t("employees.paymentMethod.bank"),
    icon: "i-heroicons-building-library",
  },
  {
    value: "lightning",
    label: t("employees.paymentMethod.lightning"),
    icon: "i-heroicons-bolt",
  },
];

// Import centralized currency options
import { CURRENCY_OPTIONS } from "~/composables/use-currency";
const currencyOptions = CURRENCY_OPTIONS;

const genderOptions = [
  { value: "male", label: t("employees.gender.male") },
  { value: "female", label: t("employees.gender.female") },
  { value: "other", label: t("employees.gender.other") },
];

const statusOptions = [
  { value: "active", label: t("employees.status.active") },
  { value: "inactive", label: t("employees.status.inactive") },
  { value: "on-leave", label: t("employees.status.onLeave") },
];

// Tabs
const activeTab = ref("basic");
const tabs = [
  { id: "basic", label: t("employees.tabs.basic"), icon: "i-heroicons-user" },
  {
    id: "employment",
    label: t("employees.tabs.employment"),
    icon: "i-heroicons-briefcase",
  },
  {
    id: "compensation",
    label: t("employees.tabs.compensation"),
    icon: "i-heroicons-banknotes",
  },
  { id: "access", label: t("employees.tabs.access"), icon: "i-heroicons-key" },
];

// Form validation
const isValid = computed(() => {
  return form.value.firstName.trim() && form.value.lastName.trim();
});

// Submit form
async function handleSubmit() {
  if (!isValid.value || isLoading.value) return;

  isLoading.value = true;
  try {
    let savedEmployee: Employee;

    if (isEditMode.value && props.employee) {
      savedEmployee = (await employeesStore.updateEmployee(
        props.employee.id,
        form.value
      )) as Employee;
    } else {
      savedEmployee = await employeesStore.addEmployee(
        form.value as Omit<
          Employee,
          "id" | "employeeCode" | "createdAt" | "updatedAt"
        >
      );
    }

    emit("saved", savedEmployee);
  } catch (error) {
    console.error("Failed to save employee:", error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-xl max-h-[90vh] overflow-hidden flex flex-col"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
    >
      <h2
        class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"
      >
        <UIcon
          :name="
            isEditMode ? 'i-heroicons-pencil-square' : 'i-heroicons-user-plus'
          "
          class="w-5 h-5 text-primary-500"
        />
        {{
          isEditMode ? t("employees.editEmployee") : t("employees.addEmployee")
        }}
      </h2>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-x-mark"
        @click="emit('close')"
      />
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 dark:border-gray-700 px-4">
      <div class="flex gap-4 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
          :class="
            activeTab === tab.id
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          "
          @click="activeTab = tab.id"
        >
          <UIcon :name="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Basic Info Tab -->
      <div v-show="activeTab === 'basic'" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="t('employees.firstName')" required>
            <UInput
              v-model="form.firstName"
              :placeholder="t('employees.firstNamePlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('employees.lastName')" required>
            <UInput
              v-model="form.lastName"
              :placeholder="t('employees.lastNamePlaceholder')"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="t('employees.displayName')">
          <UInput
            v-model="form.displayName"
            :placeholder="t('employees.displayNamePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="t('employees.email')">
            <UInput
              v-model="form.email"
              type="email"
              icon="i-heroicons-envelope"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('employees.phone')">
            <UInput
              v-model="form.phone"
              icon="i-heroicons-phone"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="t('employees.dateOfBirth')">
            <UInput v-model="form.dateOfBirth" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('employees.gender.label')">
            <USelect
              v-model="form.gender"
              :items="genderOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="t('employees.nationalId')">
          <UInput
            v-model="form.nationalId"
            :placeholder="t('employees.nationalIdPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('employees.address')">
          <UTextarea v-model="form.address" :rows="2" class="w-full" />
        </UFormField>

        <!-- Emergency Contact -->
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="font-medium text-gray-900 dark:text-white mb-3">
            {{ t("employees.emergencyContact") }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField :label="t('employees.contactName')">
              <UInput v-model="form.emergencyContactName" class="w-full" />
            </UFormField>
            <UFormField :label="t('employees.contactPhone')">
              <UInput v-model="form.emergencyContactPhone" class="w-full" />
            </UFormField>
            <UFormField :label="t('employees.contactRelation')">
              <UInput v-model="form.emergencyContactRelation" class="w-full" />
            </UFormField>
          </div>
        </div>
      </div>

      <!-- Employment Tab -->
      <div v-show="activeTab === 'employment'" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="t('employees.department')">
            <UInput
              v-model="form.department"
              :placeholder="t('employees.departmentPlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('employees.position')">
            <UInput
              v-model="form.position"
              :placeholder="t('employees.positionPlaceholder')"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="t('employees.employmentType')">
            <USelect
              v-model="form.employmentType"
              :items="employmentTypeOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('employees.status.label')">
            <USelect
              v-model="form.status"
              :items="statusOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="t('employees.hireDate')">
          <UInput v-model="form.hireDate" type="date" class="w-full" />
        </UFormField>

        <UFormField :label="t('employees.notes')">
          <UTextarea
            v-model="form.notes"
            :rows="3"
            :placeholder="t('employees.notesPlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Compensation Tab -->
      <div v-show="activeTab === 'compensation'" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="t('employees.salaryType.label')">
            <USelect
              v-model="form.salaryType"
              :items="salaryTypeOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('employees.currency')">
            <USelect
              v-model="form.currency"
              :items="currencyOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="t('employees.baseSalary')">
          <UInput v-model.number="form.baseSalary" type="number" min="0" />
        </UFormField>

        <UFormField :label="t('employees.overtimeRate')">
          <UInput
            v-model.number="form.overtimeRate"
            type="number"
            min="1"
            step="0.1"
          >
            <template #trailing>
              <span class="text-gray-500">x</span>
            </template>
          </UInput>
        </UFormField>

        <!-- Payment -->
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="font-medium text-gray-900 dark:text-white mb-3">
            {{ t("employees.paymentInfo") }}
          </h3>
          <UFormField :label="t('employees.preferredPayment')">
            <USelect
              v-model="form.preferredPaymentMethod"
              :items="paymentMethodOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="form.preferredPaymentMethod === 'bank'"
            class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4"
          >
            <UFormField :label="t('employees.bankName')">
              <UInput v-model="form.bankName" class="w-full" />
            </UFormField>
            <UFormField :label="t('employees.bankAccount')">
              <UInput v-model="form.bankAccount" class="w-full" />
            </UFormField>
          </div>

          <div v-if="form.preferredPaymentMethod === 'lightning'" class="mt-4">
            <UFormField :label="t('employees.lightningAddress')">
              <UInput
                v-model="form.lightningAddress"
                placeholder="user@wallet.com"
                icon="i-heroicons-bolt"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- Commission -->
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-medium text-gray-900 dark:text-white">
              {{ t("employees.commission") }}
            </h3>
            <USwitch v-model="form.commissionEnabled" />
          </div>
          <div v-if="form.commissionEnabled">
            <UFormField :label="t('employees.commissionRate')">
              <UInput
                v-model.number="form.commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.5"
              >
                <template #trailing>
                  <span class="text-gray-500">%</span>
                </template>
              </UInput>
            </UFormField>
          </div>
        </div>

        <!-- Leave Balances -->
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="font-medium text-gray-900 dark:text-white mb-3">
            {{ t("employees.leaveBalances") }}
          </h3>
          <div class="grid grid-cols-3 gap-4">
            <UFormField :label="t('employees.annualLeave')">
              <UInput
                v-model.number="form.annualLeaveBalance"
                type="number"
                min="0"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('employees.sickLeave')">
              <UInput
                v-model.number="form.sickLeaveBalance"
                type="number"
                min="0"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('employees.personalLeave')">
              <UInput
                v-model.number="form.personalLeaveBalance"
                type="number"
                min="0"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>
      </div>

      <!-- Access Tab -->
      <div v-show="activeTab === 'access'" class="space-y-4">
        <div
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
        >
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ t("employees.posAccess") }}
            </p>
            <p class="text-sm text-gray-500">
              {{ t("employees.posAccessDescription") }}
            </p>
          </div>
          <USwitch v-model="form.canAccessPOS" />
        </div>

        <div v-if="form.canAccessPOS">
          <UFormField :label="t('employees.pin')">
            <UInput
              v-model="form.pin"
              type="password"
              maxlength="6"
              :placeholder="t('employees.pinPlaceholder')"
              icon="i-heroicons-lock-closed"
              class="w-full"
            />
            <template #hint>
              <span class="text-xs text-gray-500">{{
                t("employees.pinHint")
              }}</span>
            </template>
          </UFormField>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div
      class="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
    >
      <UButton color="neutral" variant="ghost" @click="emit('close')">
        {{ t("common.cancel") }}
      </UButton>
      <UButton
        color="primary"
        :loading="isLoading"
        :disabled="!isValid"
        @click="handleSubmit"
      >
        {{ isEditMode ? t("common.save") : t("employees.addEmployee") }}
      </UButton>
    </div>
  </div>
</template>
