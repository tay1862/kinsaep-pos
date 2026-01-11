// composables/use-order-number.ts
// 🔢 Daily Order Number Management
// Manages strictly sequential daily numbers (1, 2, 3...)
// Resets automatically at midnight (if enabled) or manually via settings

export function useOrderNumber() {
  const SEQUENCE_KEY = "bitspace_order_sequence";
  const LAST_RESET_KEY = "bitspace_order_sequence_date";
  const AUTO_RESET_KEY = "bitspace_order_auto_reset_daily";

  // State
  const currentSequence = useState<number>("bitspace_order_sequence", () => 0);
  const autoResetDaily = useState<boolean>(
    "bitspace_order_auto_reset",
    () => true
  );
  const nextSequence = computed(() => currentSequence.value + 1);

  // Initialize
  function init() {
    if (!import.meta.client) return;

    // Load auto-reset setting
    const storedAutoReset = localStorage.getItem(AUTO_RESET_KEY);
    autoResetDaily.value = storedAutoReset !== "false"; // Default to true

    const storedSeq = localStorage.getItem(SEQUENCE_KEY);
    const storedDate = localStorage.getItem(LAST_RESET_KEY);
    const today = new Date().toDateString();

    // Check for daily reset (only if auto-reset is enabled)
    if (autoResetDaily.value && storedDate !== today) {
      resetSequence(0); // Auto-reset at start of new day
    } else {
      currentSequence.value = storedSeq ? parseInt(storedSeq, 10) : 0;
    }
  }

  // Get next number and increment
  function getNextNumber(): number {
    if (!import.meta.client) return 1;

    // Double check date before incrementing (only if auto-reset is enabled)
    if (autoResetDaily.value) {
      const storedDate = localStorage.getItem(LAST_RESET_KEY);
      const today = new Date().toDateString();

      if (storedDate !== today) {
        currentSequence.value = 0;
        localStorage.setItem(LAST_RESET_KEY, today);
      }
    }

    const next = currentSequence.value + 1;
    currentSequence.value = next;
    localStorage.setItem(SEQUENCE_KEY, next.toString());

    // Ensure date is set (for first run cases)
    const storedDate = localStorage.getItem(LAST_RESET_KEY);
    if (!storedDate) {
      localStorage.setItem(LAST_RESET_KEY, new Date().toDateString());
    }

    return next;
  }

  // Manual reset (for settings)
  // If value is provided, sets specific LAST used number (so next will be value + 1)
  function resetSequence(value: number = 0) {
    if (!import.meta.client) return;

    currentSequence.value = value;
    localStorage.setItem(SEQUENCE_KEY, value.toString());
    localStorage.setItem(LAST_RESET_KEY, new Date().toDateString());
  }

  // Set auto-reset daily preference
  function setAutoResetDaily(enabled: boolean) {
    if (!import.meta.client) return;

    autoResetDaily.value = enabled;
    localStorage.setItem(AUTO_RESET_KEY, enabled.toString());
  }

  // Initialize on mount
  init();

  return {
    currentSequence: readonly(currentSequence),
    autoResetDaily: readonly(autoResetDaily),
    nextSequence,
    getNextNumber,
    resetSequence,
    setAutoResetDaily,
  };
}
