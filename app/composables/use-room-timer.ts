// composables/use-room-timer.ts
// ⏱️ Room Timer - Real-time cost calculation for time-based billing

import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Table } from './use-tables';

export interface RoomTimerData {
  tableId: string;
  startTime: Date;
  currentDuration: number; // in seconds
  currentCost: number;
  formattedDuration: string;
  formattedCost: string;
  isOverMinimum: boolean;
  hoursUsed: number;
}

export function useRoomTimer() {
  const { format: formatCurrency } = useCurrency();
  
  // Timer state
  const timers = ref<Map<string, RoomTimerData>>(new Map());
  let intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Start tracking a room timer
   */
  function startTimer(table: Table) {
    if (!table.occupiedAt) return;
    
    const startTime = new Date(table.occupiedAt);
    
    timers.value.set(table.id, {
      tableId: table.id,
      startTime,
      currentDuration: 0,
      currentCost: 0,
      formattedDuration: '00:00:00',
      formattedCost: formatCurrency(0),
      isOverMinimum: false,
      hoursUsed: 0,
    });
    
    updateTimer(table);
  }

  /**
   * Stop tracking a room timer
   */
  function stopTimer(tableId: string) {
    timers.value.delete(tableId);
  }

  /**
   * Update a specific timer's values
   */
  function updateTimer(table: Table) {
    const timer = timers.value.get(table.id);
    if (!timer || !table.occupiedAt) return;

    const now = new Date();
    const startTime = new Date(table.occupiedAt);
    const durationMs = now.getTime() - startTime.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);
    const hoursUsed = durationMs / (1000 * 60 * 60);
    
    // Calculate billable hours (minimum hours or actual)
    const minimumHours = table.minimumHours || 1;
    const billableHours = Math.max(hoursUsed, minimumHours);
    
    // Calculate cost
    const hourlyRate = table.hourlyRate || 0;
    const currentCost = Math.ceil(billableHours) * hourlyRate;
    
    // Format duration
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;
    const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    timer.currentDuration = durationSeconds;
    timer.currentCost = currentCost;
    timer.formattedDuration = formattedDuration;
    timer.formattedCost = formatCurrency(currentCost);
    timer.isOverMinimum = hoursUsed >= minimumHours;
    timer.hoursUsed = hoursUsed;
  }

  /**
   * Update all active timers
   */
  function updateAllTimers(tables: Table[]) {
    for (const table of tables) {
      if (table.status === 'occupied' && table.billingType === 'per_hour') {
        if (!timers.value.has(table.id)) {
          startTimer(table);
        } else {
          updateTimer(table);
        }
      } else {
        stopTimer(table.id);
      }
    }
  }

  /**
   * Get timer data for a specific table
   */
  function getTimer(tableId: string): RoomTimerData | undefined {
    return timers.value.get(tableId);
  }

  /**
   * Calculate checkout total for a table
   */
  function calculateCheckout(table: Table): {
    duration: number;
    durationFormatted: string;
    roomCharge: number;
    hourlyRate: number;
    billedHours: number;
    minimumHours: number;
  } {
    if (!table.occupiedAt) {
      return {
        duration: 0,
        durationFormatted: '00:00:00',
        roomCharge: 0,
        hourlyRate: table.hourlyRate || 0,
        billedHours: 0,
        minimumHours: table.minimumHours || 1,
      };
    }

    const now = new Date();
    const startTime = new Date(table.occupiedAt);
    const durationMs = now.getTime() - startTime.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);
    const hoursUsed = durationMs / (1000 * 60 * 60);
    
    const minimumHours = table.minimumHours || 1;
    const billedHours = Math.max(Math.ceil(hoursUsed), minimumHours);
    const hourlyRate = table.hourlyRate || 0;
    const roomCharge = billedHours * hourlyRate;
    
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;
    const durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return {
      duration: durationSeconds,
      durationFormatted,
      roomCharge,
      hourlyRate,
      billedHours,
      minimumHours,
    };
  }

  /**
   * Format time for display
   */
  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Start the global timer interval
   */
  function startGlobalTimer(tables: Ref<Table[]>) {
    if (intervalId) return;
    
    // Initial update
    updateAllTimers(tables.value);
    
    // Update every second
    intervalId = setInterval(() => {
      updateAllTimers(tables.value);
    }, 1000);
  }

  /**
   * Stop the global timer
   */
  function stopGlobalTimer() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    timers.value.clear();
  }

  return {
    timers: readonly(timers),
    startTimer,
    stopTimer,
    getTimer,
    calculateCheckout,
    formatTime,
    startGlobalTimer,
    stopGlobalTimer,
    updateAllTimers,
  };
}
