// ============================================
// 🧾 INVOICES COMPOSABLE
// Invoice Generation & Payment Tracking
// ============================================

import type {
  Invoice,
  InvoiceItem,
  InvoicePayment,
  InvoiceStatus,
  PaymentMethod,
  CurrencyCode,
  Order,
} from '~/types';

// Singleton state
const invoices = ref<Invoice[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Counter for invoice numbers
let invoiceCounter = 1;

export function useInvoices() {
  const shop = useShop();

  // ============================================
  // Computed
  // ============================================

  const activeInvoices = computed(() =>
    invoices.value.filter(i => !['cancelled', 'refunded'].includes(i.status))
  );

  const draftInvoices = computed(() =>
    invoices.value.filter(i => i.status === 'draft')
  );

  const sentInvoices = computed(() =>
    invoices.value.filter(i => i.status === 'sent')
  );

  const paidInvoices = computed(() =>
    invoices.value.filter(i => i.status === 'paid')
  );

  const overdueInvoices = computed(() => {
    const now = new Date();
    return invoices.value.filter(i => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      return new Date(i.dueDate) < now && i.amountDue > 0;
    });
  });

  const partialInvoices = computed(() =>
    invoices.value.filter(i => i.status === 'partial')
  );

  // Stats
  const stats = computed(() => {
    const total = invoices.value.reduce((sum, i) => sum + i.total, 0);
    const paid = invoices.value.reduce((sum, i) => sum + i.amountPaid, 0);
    const outstanding = invoices.value.reduce((sum, i) => sum + i.amountDue, 0);

    return {
      totalInvoices: invoices.value.length,
      draftCount: draftInvoices.value.length,
      sentCount: sentInvoices.value.length,
      paidCount: paidInvoices.value.length,
      overdueCount: overdueInvoices.value.length,
      totalAmount: total,
      paidAmount: paid,
      outstandingAmount: outstanding,
    };
  });

  // ============================================
  // Initialize
  // ============================================

  async function init() {
    isLoading.value = true;
    error.value = null;
    try {
      const stored = localStorage.getItem('bitspace_invoices');
      const storedCounter = localStorage.getItem('bitspace_invoice_counter');

      if (stored) {
        invoices.value = JSON.parse(stored);
      }
      if (storedCounter) {
        invoiceCounter = parseInt(storedCounter, 10);
      }
    } catch (e) {
      console.error('Error loading invoices:', e);
      error.value = String(e);
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================
  // Persistence
  // ============================================

  function saveToStorage() {
    localStorage.setItem('bitspace_invoices', JSON.stringify(invoices.value));
    localStorage.setItem('bitspace_invoice_counter', String(invoiceCounter));
  }

  // ============================================
  // Invoice CRUD
  // ============================================

  function generateInvoiceId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  function generateInvoiceNumber(): string {
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const number = String(invoiceCounter++).padStart(5, '0');
    return `${prefix}-${year}-${number}`;
  }

  function calculateTotals(items: InvoiceItem[], taxRate: number = 0): {
    subtotal: number;
    taxAmount: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }

  async function createInvoice(data: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerTaxId?: string;
    customerId?: string;
    items: Omit<InvoiceItem, 'id'>[];
    taxRate?: number;
    dueDate: string;
    notes?: string;
    terms?: string;
    currency?: CurrencyCode;
  }): Promise<Invoice> {
    const now = new Date().toISOString();

    // Add IDs to items and calculate totals
    const items: InvoiceItem[] = data.items.map((item, index) => ({
      ...item,
      id: `item_${index + 1}`,
      total: item.quantity * item.unitPrice - (item.discount || 0),
    }));

    const taxRate = data.taxRate || 0;
    const { subtotal, taxAmount, total } = calculateTotals(items, taxRate);

    const invoice: Invoice = {
      id: generateInvoiceId(),
      invoiceNumber: generateInvoiceNumber(),
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      customerTaxId: data.customerTaxId,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      amountPaid: 0,
      amountDue: total,
      currency: data.currency || 'LAK',
      issueDate: now,
      dueDate: data.dueDate,
      status: 'draft',
      notes: data.notes,
      terms: data.terms,
      payments: [],
      createdAt: now,
      updatedAt: now,
    };

    invoices.value.unshift(invoice);
    saveToStorage();
    return invoice;
  }

  async function createFromOrder(order: Order): Promise<Invoice> {
    const items: Omit<InvoiceItem, 'id'>[] = order.items.map(item => ({
      description: item.product?.name || 'Product',
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.total,
    }));

    // Default due date: 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    return createInvoice({
      customerName: order.customer || 'Customer',
      customerPhone: order.customerPhone,
      items,
      dueDate: dueDate.toISOString(),
      currency: order.currency,
    });
  }

  async function updateInvoice(
    invoiceId: string,
    updates: Partial<Invoice>
  ): Promise<Invoice | null> {
    const index = invoices.value.findIndex(i => i.id === invoiceId);
    if (index === -1) return null;

    invoices.value[index] = {
      ...invoices.value[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveToStorage();
    return invoices.value[index];
  }

  async function deleteInvoice(invoiceId: string): Promise<boolean> {
    const index = invoices.value.findIndex(i => i.id === invoiceId);
    if (index === -1) return false;

    invoices.value.splice(index, 1);
    saveToStorage();
    return true;
  }

  // ============================================
  // Status Management
  // ============================================

  async function sendInvoice(invoiceId: string): Promise<Invoice | null> {
    return updateInvoice(invoiceId, {
      status: 'sent',
      sentDate: new Date().toISOString(),
    });
  }

  async function markAsViewed(invoiceId: string): Promise<Invoice | null> {
    const invoice = getInvoice(invoiceId);
    if (!invoice || invoice.status !== 'sent') return null;

    return updateInvoice(invoiceId, {
      status: 'viewed',
      viewedDate: new Date().toISOString(),
    });
  }

  async function cancelInvoice(invoiceId: string): Promise<Invoice | null> {
    return updateInvoice(invoiceId, {
      status: 'cancelled',
    });
  }

  function updateInvoiceStatus(invoice: Invoice): InvoiceStatus {
    if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
      return invoice.status;
    }

    if (invoice.amountDue <= 0) {
      return 'paid';
    }

    if (invoice.amountPaid > 0 && invoice.amountDue > 0) {
      return 'partial';
    }

    const now = new Date();
    if (new Date(invoice.dueDate) < now && invoice.amountDue > 0) {
      return 'overdue';
    }

    return invoice.status;
  }

  // ============================================
  // Payment Management
  // ============================================

  async function recordPayment(
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    options?: {
      reference?: string;
      notes?: string;
    }
  ): Promise<Invoice | null> {
    const invoice = getInvoice(invoiceId);
    if (!invoice) return null;

    const payment: InvoicePayment = {
      id: `pay_${Date.now()}`,
      invoiceId,
      amount,
      method,
      reference: options?.reference,
      notes: options?.notes,
      paidAt: new Date().toISOString(),
    };

    const newAmountPaid = invoice.amountPaid + amount;
    const newAmountDue = invoice.total - newAmountPaid;

    const updatedInvoice: Partial<Invoice> = {
      payments: [...invoice.payments, payment],
      amountPaid: newAmountPaid,
      amountDue: Math.max(0, newAmountDue),
    };

    // Update status based on payment
    if (newAmountDue <= 0) {
      updatedInvoice.status = 'paid';
      updatedInvoice.paidDate = new Date().toISOString();
    } else if (newAmountPaid > 0) {
      updatedInvoice.status = 'partial';
    }

    return updateInvoice(invoiceId, updatedInvoice);
  }

  async function markAsPaid(invoiceId: string): Promise<Invoice | null> {
    const invoice = getInvoice(invoiceId);
    if (!invoice) return null;

    // Record remaining amount as payment
    if (invoice.amountDue > 0) {
      return recordPayment(invoiceId, invoice.amountDue, 'cash');
    }

    return invoice;
  }

  // ============================================
  // Getters
  // ============================================

  function getInvoice(id: string): Invoice | undefined {
    return invoices.value.find(i => i.id === id);
  }

  function getInvoiceByNumber(number: string): Invoice | undefined {
    return invoices.value.find(i => i.invoiceNumber === number);
  }

  function getInvoicesByCustomer(customerId: string): Invoice[] {
    return invoices.value.filter(i => i.customerId === customerId);
  }

  function getInvoicesByStatus(status: InvoiceStatus): Invoice[] {
    return invoices.value.filter(i => i.status === status);
  }

  function getInvoicesByDateRange(startDate: Date, endDate: Date): Invoice[] {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    return invoices.value.filter(i => {
      const invoiceTime = new Date(i.issueDate).getTime();
      return invoiceTime >= startTime && invoiceTime <= endTime;
    });
  }

  function searchInvoices(query: string): Invoice[] {
    const q = query.toLowerCase();
    return invoices.value.filter(
      i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        i.customerEmail?.toLowerCase().includes(q) ||
        i.customerPhone?.includes(q)
    );
  }

  // ============================================
  // PDF Generation (placeholder)
  // ============================================

  async function generatePDF(invoiceId: string): Promise<string | null> {
    const invoice = getInvoice(invoiceId);
    if (!invoice) return null;

    // In a real implementation, this would generate a PDF
    // For now, return a data URL placeholder
    console.log('Generating PDF for invoice:', invoice.invoiceNumber);

    // Could use jsPDF or similar library here
    return `data:text/plain,Invoice ${invoice.invoiceNumber}`;
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    invoices,
    isLoading,
    error,
    // Computed
    activeInvoices,
    draftInvoices,
    sentInvoices,
    paidInvoices,
    overdueInvoices,
    partialInvoices,
    stats,
    // Methods
    init,
    // CRUD
    createInvoice,
    createFromOrder,
    updateInvoice,
    deleteInvoice,
    // Status
    sendInvoice,
    markAsViewed,
    cancelInvoice,
    // Payments
    recordPayment,
    markAsPaid,
    // Getters
    getInvoice,
    getInvoiceByNumber,
    getInvoicesByCustomer,
    getInvoicesByStatus,
    getInvoicesByDateRange,
    searchInvoices,
    // PDF
    generatePDF,
  };
}
