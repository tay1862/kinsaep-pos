// ============================================
// 🚚 DELIVERY COMPOSABLE
// Order Delivery Tracking & Driver Management
// ============================================

import type { Delivery, DeliveryStatus, Driver, Order } from '~/types';

// Singleton state
const deliveries = ref<Delivery[]>([]);
const drivers = ref<Driver[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

export function useDelivery() {
  // ============================================
  // Computed
  // ============================================

  const activeDeliveries = computed(() =>
    deliveries.value.filter(
      d => !['delivered', 'cancelled', 'failed'].includes(d.status)
    )
  );

  const pendingDeliveries = computed(() =>
    deliveries.value.filter(d => d.status === 'pending')
  );

  const inTransitDeliveries = computed(() =>
    deliveries.value.filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status))
  );

  const completedDeliveries = computed(() =>
    deliveries.value.filter(d => d.status === 'delivered')
  );

  const availableDrivers = computed(() =>
    drivers.value.filter(d => d.isAvailable && d.isActive)
  );

  const activeDrivers = computed(() =>
    drivers.value.filter(d => d.isActive)
  );

  // Stats
  const stats = computed(() => ({
    pending: pendingDeliveries.value.length,
    inTransit: inTransitDeliveries.value.length,
    completed: completedDeliveries.value.length,
    cancelled: deliveries.value.filter(d => d.status === 'cancelled').length,
    totalDrivers: activeDrivers.value.length,
    availableDrivers: availableDrivers.value.length,
  }));

  // ============================================
  // Initialize
  // ============================================

  async function init() {
    isLoading.value = true;
    error.value = null;
    try {
      // Load from localStorage for now (can be upgraded to Dexie/Nostr)
      const storedDeliveries = localStorage.getItem('bitspace_deliveries');
      const storedDrivers = localStorage.getItem('bitspace_drivers');

      if (storedDeliveries) {
        deliveries.value = JSON.parse(storedDeliveries);
      }
      if (storedDrivers) {
        drivers.value = JSON.parse(storedDrivers);
      }
    } catch (e) {
      console.error('Error loading deliveries:', e);
      error.value = String(e);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // Persistence
  // ============================================

  function saveToStorage() {
    localStorage.setItem('bitspace_deliveries', JSON.stringify(deliveries.value));
    localStorage.setItem('bitspace_drivers', JSON.stringify(drivers.value));
  }

  // ============================================
  // Delivery CRUD
  // ============================================

  function generateDeliveryId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async function createDelivery(
    order: Order,
    address: string,
    customerPhone: string,
    options?: {
      customerName?: string;
      scheduledAt?: string;
      notes?: string;
      deliveryFee?: number;
    }
  ): Promise<Delivery> {
    const now = new Date().toISOString();
    const delivery: Delivery = {
      id: generateDeliveryId(),
      orderId: order.id,
      order,
      status: 'pending',
      customerName: options?.customerName || order.customer || 'Customer',
      customerPhone,
      address,
      scheduledAt: options?.scheduledAt,
      notes: options?.notes,
      deliveryFee: options?.deliveryFee || 0,
      createdAt: now,
      updatedAt: now,
    };

    deliveries.value.unshift(delivery);
    saveToStorage();
    return delivery;
  }

  async function updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    additionalData?: Partial<Delivery>
  ): Promise<Delivery | null> {
    const index = deliveries.value.findIndex(d => d.id === deliveryId);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const delivery = deliveries.value[index];

    // Set timestamp based on status
    const timestamps: Partial<Delivery> = {};
    switch (status) {
      case 'assigned':
        timestamps.assignedAt = now;
        break;
      case 'picked_up':
        timestamps.pickedUpAt = now;
        break;
      case 'delivered':
        timestamps.deliveredAt = now;
        if (delivery.pickedUpAt) {
          const pickupTime = new Date(delivery.pickedUpAt).getTime();
          timestamps.actualMinutes = Math.round((Date.now() - pickupTime) / 60000);
        }
        break;
      case 'cancelled':
        timestamps.cancelledAt = now;
        break;
    }

    deliveries.value[index] = {
      ...delivery,
      ...additionalData,
      ...timestamps,
      status,
      updatedAt: now,
    };

    // Update driver availability
    if (status === 'assigned' && additionalData?.driverId) {
      updateDriverAvailability(additionalData.driverId, false, deliveryId);
    } else if (['delivered', 'cancelled', 'failed'].includes(status) && delivery.driverId) {
      updateDriverAvailability(delivery.driverId, true, undefined);
      // Increment driver's total deliveries
      if (status === 'delivered') {
        incrementDriverDeliveries(delivery.driverId);
      }
    }

    saveToStorage();
    return deliveries.value[index];
  }

  async function assignDriver(deliveryId: string, driverId: string): Promise<Delivery | null> {
    const driver = drivers.value.find(d => d.id === driverId);
    if (!driver) return null;

    return updateDeliveryStatus(deliveryId, 'assigned', {
      driverId,
      driver,
    });
  }

  async function cancelDelivery(deliveryId: string, reason?: string): Promise<Delivery | null> {
    return updateDeliveryStatus(deliveryId, 'cancelled', {
      cancellationReason: reason,
    });
  }

  function getDelivery(id: string): Delivery | undefined {
    return deliveries.value.find(d => d.id === id);
  }

  function getDeliveryByOrder(orderId: string): Delivery | undefined {
    return deliveries.value.find(d => d.orderId === orderId);
  }

  // ============================================
  // Driver CRUD
  // ============================================

  function generateDriverId(): string {
    return `drv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async function addDriver(data: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'isAvailable'>): Promise<Driver> {
    const now = new Date().toISOString();
    const driver: Driver = {
      ...data,
      id: generateDriverId(),
      isAvailable: true,
      isActive: true,
      totalDeliveries: 0,
      createdAt: now,
      updatedAt: now,
    };

    drivers.value.push(driver);
    saveToStorage();
    return driver;
  }

  async function updateDriver(driverId: string, updates: Partial<Driver>): Promise<Driver | null> {
    const index = drivers.value.findIndex(d => d.id === driverId);
    if (index === -1) return null;

    drivers.value[index] = {
      ...drivers.value[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveToStorage();
    return drivers.value[index];
  }

  async function deleteDriver(driverId: string): Promise<boolean> {
    const index = drivers.value.findIndex(d => d.id === driverId);
    if (index === -1) return false;

    // Soft delete - mark as inactive
    drivers.value[index].isActive = false;
    drivers.value[index].updatedAt = new Date().toISOString();

    saveToStorage();
    return true;
  }

  function updateDriverAvailability(driverId: string, isAvailable: boolean, currentDeliveryId?: string) {
    const index = drivers.value.findIndex(d => d.id === driverId);
    if (index === -1) return;

    drivers.value[index].isAvailable = isAvailable;
    drivers.value[index].currentDeliveryId = currentDeliveryId;
    drivers.value[index].updatedAt = new Date().toISOString();
  }

  function incrementDriverDeliveries(driverId: string) {
    const index = drivers.value.findIndex(d => d.id === driverId);
    if (index === -1) return;

    drivers.value[index].totalDeliveries = (drivers.value[index].totalDeliveries || 0) + 1;
    drivers.value[index].updatedAt = new Date().toISOString();
  }

  function getDriver(id: string): Driver | undefined {
    return drivers.value.find(d => d.id === id);
  }

  // ============================================
  // Filtering & Search
  // ============================================

  function getDeliveriesByStatus(status: DeliveryStatus): Delivery[] {
    return deliveries.value.filter(d => d.status === status);
  }

  function getDeliveriesByDriver(driverId: string): Delivery[] {
    return deliveries.value.filter(d => d.driverId === driverId);
  }

  function getDeliveriesByDateRange(startDate: Date, endDate: Date): Delivery[] {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    return deliveries.value.filter(d => {
      const deliveryTime = new Date(d.createdAt).getTime();
      return deliveryTime >= startTime && deliveryTime <= endTime;
    });
  }

  function searchDeliveries(query: string): Delivery[] {
    const q = query.toLowerCase();
    return deliveries.value.filter(
      d =>
        d.customerName?.toLowerCase().includes(q) ||
        d.customerPhone?.includes(q) ||
        d.address?.toLowerCase().includes(q) ||
        d.id.includes(q) ||
        d.orderId.includes(q)
    );
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    deliveries,
    drivers,
    isLoading,
    error,
    // Computed
    activeDeliveries,
    pendingDeliveries,
    inTransitDeliveries,
    completedDeliveries,
    availableDrivers,
    activeDrivers,
    stats,
    // Methods
    init,
    // Delivery
    createDelivery,
    updateDeliveryStatus,
    assignDriver,
    cancelDelivery,
    getDelivery,
    getDeliveryByOrder,
    getDeliveriesByStatus,
    getDeliveriesByDriver,
    getDeliveriesByDateRange,
    searchDeliveries,
    // Driver
    addDriver,
    updateDriver,
    deleteDriver,
    getDriver,
  };
}
