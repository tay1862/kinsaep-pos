// ============================================
// 👥 EMPLOYEES COMPOSABLE
// Employee Management with Dexie + Nostr
// ============================================

import type { Employee, EmployeeStatus, StoreUser } from "~/types";
import { db, type EmployeeRecord } from "~/db/db";
import { generateUUIDv7, generateReadableId } from "~/utils/id";
import * as XLSX from "xlsx";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Singleton state
const employees = ref<Employee[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);

// Filters
const searchQuery = ref("");
const selectedStatus = ref<EmployeeStatus | "all">("all");
const selectedDepartment = ref<string>("all");

// Sorting
const sortBy = ref<string>("firstName");
const sortOrder = ref<"asc" | "desc">("asc");

/**
 * 👥 EMPLOYEES STORE
 * Employee CRUD with local storage and Nostr sync
 */
export function useEmployeesStore() {
  const toast = useToast();
  const { t } = useI18n();

  // ============================================
  // 📊 COMPUTED
  // ============================================

  // Sorted employees
  const sortedEmployees = computed(() => {
    const sorted = [...employees.value].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy.value) {
        case "firstName":
        case "name":
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "position":
          aVal = (a.position || "").toLowerCase();
          bVal = (b.position || "").toLowerCase();
          break;
        case "department":
          aVal = (a.department || "").toLowerCase();
          bVal = (b.department || "").toLowerCase();
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "baseSalary":
        case "salary":
          aVal = a.baseSalary || 0;
          bVal = b.baseSalary || 0;
          break;
        case "hireDate":
          aVal = a.hireDate ? new Date(a.hireDate).getTime() : 0;
          bVal = b.hireDate ? new Date(b.hireDate).getTime() : 0;
          break;
        default:
          aVal = (a as any)[sortBy.value] || "";
          bVal = (b as any)[sortBy.value] || "";
      }

      if (aVal < bVal) return sortOrder.value === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder.value === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  });

  // Filtered employees (with sorting applied)
  const filteredEmployees = computed(() => {
    let result = sortedEmployees.value;

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (e) =>
          e.firstName.toLowerCase().includes(query) ||
          e.lastName.toLowerCase().includes(query) ||
          e.employeeCode.toLowerCase().includes(query) ||
          e.email?.toLowerCase().includes(query) ||
          e.phone?.includes(query) ||
          e.position?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (selectedStatus.value !== "all") {
      result = result.filter((e) => e.status === selectedStatus.value);
    }

    // Department filter
    if (selectedDepartment.value !== "all") {
      result = result.filter((e) => e.department === selectedDepartment.value);
    }

    return result;
  });

  // Active employees only
  const activeEmployees = computed(() =>
    employees.value.filter((e) => e.status === "active")
  );

  // Employee count by status
  const employeeStats = computed(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: employees.value.length,
      active: employees.value.filter((e) => e.status === "active").length,
      inactive: employees.value.filter((e) => e.status === "inactive").length,
      onLeave: employees.value.filter((e) => e.status === "on-leave").length,
      terminated: employees.value.filter((e) => e.status === "terminated")
        .length,
      newThisMonth: employees.value.filter((e) => {
        if (!e.hireDate) return false;
        const hireDate = new Date(e.hireDate);
        return hireDate >= startOfMonth;
      }).length,
    };
  });

  // Unique departments
  const departments = computed(() => {
    const depts = new Set<string>();
    employees.value.forEach((e) => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  });

  // Unique positions
  const positions = computed(() => {
    const pos = new Set<string>();
    employees.value.forEach((e) => {
      if (e.position) pos.add(e.position);
    });
    return Array.from(pos).sort();
  });

  // ============================================
  // 🔀 SORTING
  // ============================================

  function setSorting(field: string, order?: "asc" | "desc") {
    if (sortBy.value === field && !order) {
      // Toggle order if same field
      sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
    } else {
      sortBy.value = field;
      sortOrder.value = order || "asc";
    }
  }

  // ============================================
  // 🗄️ LOCAL STORAGE (Dexie)
  // ============================================

  async function loadEmployeesFromLocal(): Promise<Employee[]> {
    try {
      // Check if employees table exists, if not return empty
      if (!db.employees) {
        console.warn("Employees table not initialized in Dexie");
        return [];
      }
      const records = await db.employees.toArray();
      return records.map((r: EmployeeRecord) => ({
        ...r,
        // Parse JSON arrays for product assignment
        assignedProductIds: r.assignedProductIds
          ? JSON.parse(r.assignedProductIds)
          : undefined,
        assignedCategoryIds: r.assignedCategoryIds
          ? JSON.parse(r.assignedCategoryIds)
          : undefined,
        synced: undefined,
      })) as unknown as Employee[];
    } catch (e) {
      console.error("Failed to load employees:", e);
      return [];
    }
  }

  async function saveEmployeeToLocal(employee: Employee): Promise<void> {
    if (!employee.id) return;
    if (!db.employees) {
      console.warn("Employees table not initialized");
      return;
    }
    const record: EmployeeRecord = {
      ...employee,
      // Serialize arrays to JSON strings for Dexie storage
      assignedProductIds: employee.assignedProductIds
        ? JSON.stringify(employee.assignedProductIds)
        : undefined,
      assignedCategoryIds: employee.assignedCategoryIds
        ? JSON.stringify(employee.assignedCategoryIds)
        : undefined,
      synced: false,
    };
    await db.employees.put(record);
  }

  // ============================================
  // 🔄 INITIALIZATION
  // ============================================

  async function init(): Promise<void> {
    if (isInitialized.value) return;
    isLoading.value = true;
    error.value = null;

    try {
      employees.value = await loadEmployeesFromLocal();
      isInitialized.value = true;
    } catch (e) {
      error.value = `Failed to initialize employees: ${e}`;
      console.error(error.value);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // 📝 CRUD OPERATIONS
  // ============================================

  function generateEmployeeCode(): string {
    const prefix = "EMP";
    const num = employees.value.length + 1;
    return `${prefix}${num.toString().padStart(4, "0")}`.toUpperCase();
  }

  function generateId(): string {
    return generateUUIDv7();
  }

  async function addEmployee(
    data: Omit<Employee, "id" | "employeeCode" | "createdAt" | "updatedAt">
  ): Promise<Employee> {
    const now = new Date().toISOString();
    const employee: Employee = {
      ...data,
      id: generateId(),
      employeeCode: generateEmployeeCode(),
      createdAt: now,
      updatedAt: now,
    };

    employees.value.push(employee);
    await saveEmployeeToLocal(employee);

    // Auto-sync to Nostr
    syncEmployeeToNostr(employee).catch((e) =>
      console.warn("[Employee] Failed to auto-sync to Nostr:", e)
    );

    // Create StoreUser if POS access is enabled
    if (employee.canAccessPOS) {
      createStoreUserFromEmployee(employee.id).catch((e) =>
        console.warn("[Employee] Failed to create StoreUser:", e)
      );
    }

    toast.add({
      title: t("employees.createSuccess"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return employee;
  }

  async function updateEmployee(
    id: string,
    updates: Partial<Employee>
  ): Promise<Employee | null> {
    const index = employees.value.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const existing = employees.value[index]!;
    const updated: Employee = {
      ...existing,
      ...updates,
      id: existing.id,
      employeeCode: existing.employeeCode,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    employees.value[index] = updated;
    await saveEmployeeToLocal(updated);

    // Auto-sync to Nostr
    syncEmployeeToNostr(updated).catch((e) =>
      console.warn("[Employee] Failed to auto-sync to Nostr:", e)
    );

    // Update StoreUser if POS access changed
    if (updated.canAccessPOS) {
      createStoreUserFromEmployee(updated.id).catch((e) =>
        console.warn("[Employee] Failed to update StoreUser:", e)
      );
    }

    toast.add({
      title: t("employees.updateSuccess"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return updated;
  }

  async function deleteEmployee(id: string): Promise<boolean> {
    const index = employees.value.findIndex((e) => e.id === id);
    if (index === -1) return false;

    // Soft delete - just mark as terminated
    await updateEmployee(id, {
      status: "terminated",
      terminationDate: new Date().toISOString(),
    });

    toast.add({
      title: t("employees.deleteSuccess"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return true;
  }

  async function hardDeleteEmployee(id: string): Promise<boolean> {
    const index = employees.value.findIndex((e) => e.id === id);
    if (index === -1) return false;

    employees.value.splice(index, 1);
    if (db.employees) {
      await db.employees.delete(id);
    }

    toast.add({
      title: t("employees.hardDeleteSuccess"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    return true;
  }

  // ============================================
  // 📋 DUPLICATE EMPLOYEE
  // ============================================

  async function duplicateEmployee(id: string): Promise<Employee | null> {
    const employee = employees.value.find((e) => e.id === id);
    if (!employee) return null;

    // Create a copy without id, code, dates
    const {
      id: _id,
      employeeCode: _code,
      createdAt: _created,
      updatedAt: _updated,
      ...data
    } = employee;

    const duplicated = await addEmployee({
      ...data,
      firstName: `${employee.firstName} (Copy)`,
    });

    toast.add({
      title: t("employees.duplicateSuccess"),
      icon: "i-heroicons-document-duplicate",
      color: "success",
    });

    return duplicated;
  }

  // ============================================
  // 🔍 GETTERS
  // ============================================

  function getEmployee(id: string): Employee | undefined {
    return employees.value.find((e) => e.id === id);
  }

  function getEmployeeByCode(code: string): Employee | undefined {
    return employees.value.find((e) => e.employeeCode === code);
  }

  function getEmployeesByBranch(branchId: string): Employee[] {
    return employees.value.filter((e) => e.branchId === branchId);
  }

  function getEmployeesByDepartment(department: string): Employee[] {
    return employees.value.filter((e) => e.department === department);
  }

  // ============================================
  // 🏷️ PRODUCT ASSIGNMENT
  // ============================================

  /**
   * Assign specific products to an employee
   */
  async function assignProducts(
    employeeId: string,
    productIds: string[]
  ): Promise<boolean> {
    const employee = getEmployee(employeeId);
    if (!employee) return false;

    await updateEmployee(employeeId, {
      assignedProductIds: productIds,
      assignmentMode: productIds.length > 0 ? "assigned" : "all",
    });

    return true;
  }

  /**
   * Assign categories to an employee
   */
  async function assignCategories(
    employeeId: string,
    categoryIds: string[]
  ): Promise<boolean> {
    const employee = getEmployee(employeeId);
    if (!employee) return false;

    await updateEmployee(employeeId, {
      assignedCategoryIds: categoryIds,
      assignmentMode: categoryIds.length > 0 ? "category" : "all",
    });

    return true;
  }

  /**
   * Set the assignment mode for an employee
   */
  async function setAssignmentMode(
    employeeId: string,
    mode: "all" | "assigned" | "category"
  ): Promise<boolean> {
    const employee = getEmployee(employeeId);
    if (!employee) return false;

    await updateEmployee(employeeId, { assignmentMode: mode });
    return true;
  }

  /**
   * Get assigned product IDs for an employee
   */
  function getAssignedProducts(employeeId: string): string[] {
    const employee = getEmployee(employeeId);
    return employee?.assignedProductIds || [];
  }

  /**
   * Get assigned category IDs for an employee
   */
  function getAssignedCategories(employeeId: string): string[] {
    const employee = getEmployee(employeeId);
    return employee?.assignedCategoryIds || [];
  }

  /**
   * Check if employee has access to a specific product
   */
  function canSellProduct(
    employeeId: string,
    productId: string,
    productCategoryId: string
  ): boolean {
    const employee = getEmployee(employeeId);
    if (!employee) return false;

    const mode = employee.assignmentMode || "all";

    switch (mode) {
      case "all":
        return true;
      case "assigned":
        return employee.assignedProductIds?.includes(productId) ?? false;
      case "category":
        return (
          employee.assignedCategoryIds?.includes(productCategoryId) ?? false
        );
      default:
        return true;
    }
  }

  // ============================================
  // 🏖️ LEAVE MANAGEMENT
  // ============================================

  async function adjustLeaveBalance(
    employeeId: string,
    leaveType: "annual" | "sick" | "personal",
    adjustment: number
  ): Promise<boolean> {
    const employee = getEmployee(employeeId);
    if (!employee) return false;

    const key = `${leaveType}LeaveBalance` as keyof Employee;
    const currentBalance = (employee[key] as number) || 0;
    const newBalance = Math.max(0, currentBalance + adjustment);

    await updateEmployee(employeeId, {
      [key]: newBalance,
    });

    return true;
  }

  // ============================================
  // 💰 COMMISSION & PAY
  // ============================================

  function calculateMonthlyPay(
    employee: Employee,
    hoursWorked: number = 0,
    overtimeHours: number = 0
  ): number {
    let basePay = 0;

    switch (employee.salaryType) {
      case "monthly":
        basePay = employee.baseSalary;
        break;
      case "daily":
        basePay = employee.baseSalary * 22; // Assume 22 working days
        break;
      case "hourly":
        basePay = employee.baseSalary * hoursWorked;
        break;
      case "weekly":
        basePay = employee.baseSalary * 4;
        break;
    }

    // Add overtime
    const overtimeRate = employee.overtimeRate || 1.5;
    const overtimePay =
      employee.salaryType === "hourly"
        ? employee.baseSalary * overtimeRate * overtimeHours
        : 0;

    return basePay + overtimePay;
  }

  // ============================================
  // 📥 EXPORT TO EXCEL
  // ============================================

  function exportToExcel() {
    const data = filteredEmployees.value.map((e) => ({
      "Employee Code": e.employeeCode,
      "First Name": e.firstName,
      "Last Name": e.lastName,
      "Display Name": e.displayName || "",
      Email: e.email || "",
      Phone: e.phone || "",
      Department: e.department || "",
      Position: e.position || "",
      "Employment Type": e.employmentType,
      Status: e.status,
      "Hire Date": e.hireDate || "",
      "Base Salary": e.baseSalary,
      Currency: e.currency,
      "Salary Type": e.salaryType,
      "Annual Leave": e.annualLeaveBalance,
      "Sick Leave": e.sickLeaveBalance,
      "Personal Leave": e.personalLeaveBalance,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");

    // Generate filename with date
    const date = new Date().toISOString().split("T")[0];
    const fileName = `employees_${date}.xlsx`;

    XLSX.writeFile(wb, fileName);

    toast.add({
      title: t("employees.export.success"),
      icon: "i-heroicons-document-arrow-down",
      color: "success",
    });
  }

  // ============================================
  // 📡 NOSTR SYNC
  // ============================================

  /**
   * Sync employee to Nostr
   * Saves employee data to Nostr relays using STAFF_MEMBER kind
   */
  async function syncEmployeeToNostr(employee: Employee): Promise<boolean> {
    try {
      const nostrData = useNostrData();
      const company = useCompany();

      // Get company code hash for tagging
      const companyTag = company.companyCodeHash.value
        ? ["c", company.companyCodeHash.value]
        : [];

      // Publish to Nostr with encryption
      const event = await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.STAFF_MEMBER,
        employee,
        employee.id,
        [
          ["name", `${employee.firstName} ${employee.lastName}`],
          ["code", employee.employeeCode],
          ["role", "staff"],
          employee.npub ? ["p", employee.npub] : [],
          companyTag,
        ].filter((t) => t.length > 0) as string[][],
        true // Encrypt employee data for privacy
      );

      if (event) {
        // Mark as synced in local DB
        await db.employees?.update(employee.id, { synced: true });
        return true;
      }

      return false;
    } catch (e) {
      console.error("[Employee] Failed to sync to Nostr:", e);
      return false;
    }
  }

  /**
   * Fetch all employees from Nostr
   * Retrieves employee data from relays
   */
  async function fetchEmployeesFromNostr(): Promise<Employee[]> {
    try {
      const nostrData = useNostrData();
      const results = await nostrData.getAllEventsOfKind<Employee>(
        NOSTR_KINDS.STAFF_MEMBER
      );

      return results
        .map((r) => r.data)
        .filter((e) => e && e.id && e.firstName && e.lastName);
    } catch (e) {
      console.error("[Employee] Failed to fetch from Nostr:", e);
      return [];
    }
  }

  /**
   * Sync all local employees to Nostr
   */
  async function syncAllToNostr(): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const employee of employees.value) {
      const result = await syncEmployeeToNostr(employee);
      if (result) success++;
      else failed++;
    }

    return { success, failed };
  }

  /**
   * Pull employees from Nostr and merge with local data
   * Updates local storage with remote data
   */
  async function pullFromNostr(): Promise<{
    imported: number;
    updated: number;
  }> {
    try {
      const remoteEmployees = await fetchEmployeesFromNostr();
      let imported = 0;
      let updated = 0;

      for (const remoteEmployee of remoteEmployees) {
        const existing = employees.value.find((e) => e.id === remoteEmployee.id);

        if (existing) {
          // Update if remote is newer
          const remoteTime = new Date(remoteEmployee.updatedAt).getTime();
          const localTime = new Date(existing.updatedAt).getTime();

          if (remoteTime > localTime) {
            employees.value = employees.value.map((e) =>
              e.id === remoteEmployee.id ? remoteEmployee : e
            );
            await saveEmployeeToLocal(remoteEmployee);
            updated++;
          }
        } else {
          // Import new employee
          employees.value.push(remoteEmployee);
          await saveEmployeeToLocal(remoteEmployee);
          imported++;
        }
      }

      if (imported > 0 || updated > 0) {
        toast.add({
          title: `Synced from Nostr: ${imported} new, ${updated} updated`,
          icon: "i-heroicons-arrow-down-tray",
          color: "success",
        });
      }

      return { imported, updated };
    } catch (e) {
      console.error("[Employee] Failed to pull from Nostr:", e);
      toast.add({
        title: "Failed to sync from Nostr",
        icon: "i-heroicons-exclamation-circle",
        color: "error",
      });
      return { imported: 0, updated: 0 };
    }
  }

  /**
   * Create or update StoreUser from Employee
   * Links employee to POS access if canAccessPOS is enabled
   */
  async function createStoreUserFromEmployee(
    employeeId: string
  ): Promise<StoreUser | null> {
    const employee = getEmployee(employeeId);
    if (!employee || !employee.canAccessPOS) {
      return null;
    }

    try {
      const users = useUsers();

      // Check if user already exists
      const existingUser = users.users.value.find(
        (u) => u.id === employee.userId || u.npub === employee.npub
      );

      const userData: Partial<StoreUser> = {
        id: employee.userId || generateUUIDv7(),
        name: employee.displayName || `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        pin: employee.pin,
        role: "staff" as const,
        branchId: employee.branchId,
        isActive: employee.status === "active",
        avatar: employee.avatar,
        authMethod: employee.npub ? "nostr" : "pin",
        npub: employee.npub,
      };

      if (existingUser) {
        // Update existing user
        await users.updateUser(existingUser.id, userData);

        // Update employee with userId
        if (!employee.userId) {
          await updateEmployee(employee.id, { userId: existingUser.id });
        }

        return existingUser;
      } else {
        // Create new user
        const newUser = await users.createUser(userData as any);

        // Update employee with userId
        if (newUser) {
          await updateEmployee(employee.id, { userId: newUser.id });
        }

        return newUser;
      }
    } catch (e) {
      console.error("[Employee] Failed to create store user:", e);
      return null;
    }
  }

  // ============================================
  // 📤 EXPORT
  // ============================================

  return {
    // State
    employees: readonly(employees),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isInitialized: readonly(isInitialized),

    // Filters
    searchQuery,
    selectedStatus,
    selectedDepartment,

    // Sorting
    sortBy,
    sortOrder,
    setSorting,

    // Computed
    filteredEmployees,
    activeEmployees,
    employeeStats,
    departments,
    positions,

    // Methods
    init,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    hardDeleteEmployee,
    duplicateEmployee,
    getEmployee,
    getEmployeeByCode,
    getEmployeesByBranch,
    getEmployeesByDepartment,
    adjustLeaveBalance,
    calculateMonthlyPay,
    generateEmployeeCode,
    exportToExcel,
    // Product Assignment
    assignProducts,
    assignCategories,
    setAssignmentMode,
    getAssignedProducts,
    getAssignedCategories,
    canSellProduct,

    // Nostr Sync
    syncEmployeeToNostr,
    fetchEmployeesFromNostr,
    syncAllToNostr,
    pullFromNostr,
    createStoreUserFromEmployee,
  };
}
