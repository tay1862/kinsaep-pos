/**
 * Composable for checking if shop setup is complete
 * Used to show/hide navigation elements based on setup status
 */

// Global state shared across all uses
const hasCompletedSetup = ref(false);
const isChecked = ref(false);

export function useSetupCheck() {
  /**
   * Fast synchronous check using localStorage
   * Called once on app init to avoid flash of content
   */
  const checkSetupSync = () => {
    if (!import.meta.client || isChecked.value) return;

    const companyCode = localStorage.getItem("bitspace_company_code");
    const shopConfigStr = localStorage.getItem("shopConfig");
    const workspacesStr = localStorage.getItem("bitspace_workspaces");

    // Shop is setup if we have a company code OR a shop config with name
    if (companyCode) {
      hasCompletedSetup.value = true;
    } else if (shopConfigStr) {
      try {
        const shopConfig = JSON.parse(shopConfigStr);
        hasCompletedSetup.value = !!shopConfig?.name;
      } catch {
        hasCompletedSetup.value = false;
      }
    } else if (workspacesStr) {
      // Fallback: Check if we have registered workspaces (during shop switch)
      try {
        const workspaces = JSON.parse(workspacesStr);
        hasCompletedSetup.value = Array.isArray(workspaces) && workspaces.length > 0;
      } catch {
        hasCompletedSetup.value = false;
      }
    } else {
      hasCompletedSetup.value = false;
    }

    isChecked.value = true;
  };

  /**
   * Update the setup status (called when setup completes)
   */
  const setSetupComplete = (complete: boolean) => {
    hasCompletedSetup.value = complete;
    isChecked.value = true;
  };

  /**
   * Re-check setup status from localStorage
   */
  const recheckSetup = () => {
    isChecked.value = false;
    checkSetupSync();
  };

  // Auto-check on first use
  if (import.meta.client && !isChecked.value) {
    checkSetupSync();
  }

  return {
    /** Whether shop setup is complete */
    isSetupComplete: computed(() => hasCompletedSetup.value),
    /** Whether the check has been performed */
    isChecked: computed(() => isChecked.value),
    /** Force a sync check from localStorage */
    checkSetupSync,
    /** Manually set setup status */
    setSetupComplete,
    /** Re-check from localStorage */
    recheckSetup,
  };
}
