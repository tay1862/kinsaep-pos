// composables/use-receipt.ts
// 🧾 Receipt & E-Bill System
// Supports: Thermal/POS printers (ESC/POS), Browser print, E-Bill via QR

import {  computed } from "vue";
import type { Order, PaymentProof, CurrencyCode, PaymentMethod } from "~/types"; // Re-add CartItem if needed but ReceiptItem is local
import QRCode from "qrcode";

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variant?: string;
  modifiers?: string[];
  notes?: string;
  freeQuantity?: number; // For promotions: how many of this item are free
  productId?: string; // Product ID for matching with promotions
}

export interface EReceipt {
  id: string;
  code?: string; // REC-XXXX-XXXX (for verification)
  orderId: string;
  orderNumber?: number; // Daily sequential number
  orderCode?: string;
  merchantPubkey?: string;
  customerPubkey?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  appliedPromotions?: Array<{
    promotionId: string;
    promotionName: string;
    discountAmount: number;
    description?: string;
  }>;
  tax: number;
  tip?: number;
  total: number;
  totalSats?: number;
  currency: CurrencyCode;
  paymentMethod?: PaymentMethod | string;
  paymentProof?: PaymentProof;
  createdAt: string;
  expiresAt?: string; // Receipt expiration (e.g., 90 days)
  validUntil?: string;
  timestamp?: number;
  // Metadata for verification
  signature?: string;
  merchantName?: string;
  merchantAddress?: string;
  nostrEventId?: string;
}

// ============================================
// Receipt Settings (Legacy interface for backward compatibility)
// ============================================
export interface ReceiptSettings {
  merchantName: string;
  merchantAddress?: string;
  merchantPhone?: string;
  merchantTaxId?: string;
  merchantEmail?: string;
  logoEmoji: string;
  logoUrl?: string;
  footerMessage: string;
  showPaymentProof: boolean;
  showQrCode: boolean;
  paperWidth: "58mm" | "80mm" | "112mm";
}

const defaultSettings: ReceiptSettings = {
  merchantName: "bnos.space",
  merchantAddress: "",
  merchantPhone: "",
  logoEmoji: "⚡",
  footerMessage: "Khop Mok Kop Hor!",
  showPaymentProof: true,
  showQrCode: false,
  paperWidth: "80mm",
};

// E-Bill storage (in-memory for demo, use IndexedDB in production)
const eBillStorage = new Map<string, EReceipt>();

export const useReceipt = () => {
  const currency = useCurrency();
  const receiptSettings = useReceiptSettings();

  // State
  const lastReceipt = useState<EReceipt | null>("last-receipt", () => null);
  const isSending = useState<boolean>("is-sending", () => false);
  const isPrinting = useState<boolean>("is-printing", () => false);
  const error = useState<string | null>("error", () => null);

  // Computed settings that merge saved settings with legacy format
  const settings = computed<ReceiptSettings>(() => {
    const saved = receiptSettings.settings.value;
    return {
      merchantName: saved.header.businessName || defaultSettings.merchantName,
      merchantAddress: saved.header.address || defaultSettings.merchantAddress,
      merchantPhone: saved.header.phone || defaultSettings.merchantPhone,
      merchantTaxId: saved.header.taxId,
      merchantEmail: saved.header.email,
      logoEmoji: "⚡", // Default emoji fallback
      logoUrl: saved.logo || undefined,
      footerMessage:
        saved.footer.thankYouMessage || defaultSettings.footerMessage,
      showPaymentProof: saved.content.showPaymentMethod,
      showQrCode: saved.footer.showQrCode,
      paperWidth: saved.paper.width as "58mm" | "80mm" | "112mm",
    };
  });

  // ============================================
  // Generate Receipt from Order
  // ============================================
  const generateReceipt = (
    order: Order,
    paymentProof?: PaymentProof,
    merchantPubkey?: string
  ): EReceipt => {
    const items: ReceiptItem[] = order.items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.total,
      variant: item.selectedVariant?.name,
      modifiers: item.selectedModifiers?.map((m) => m.name),
      notes: item.notes,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = 0;
    const tip = order.tip || 0;

    // Generate unique receipt ID
    const receiptId = `RCP-${Date.now()
      .toString(36)
      .toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Calculate free quantities for each item based on promotions
    const receiptItems: ReceiptItem[] = order.items.map((item) => {
      let freeQuantity = 0;

      // Check all applied promotions to see if this item is a reward (free)
      if (order.appliedPromotions) {
        for (const promo of order.appliedPromotions) {
          // For BOGO promotions, rewardItemIds contains product IDs that are free
          if (promo.rewardItemIds && promo.rewardItemIds.includes(item.product.id)) {
            // Each application of the promotion gives rewardQuantity free items
            // For "Buy 1 Get 1", timesApplied=1 means 1 free item
            freeQuantity += promo.timesApplied;
          }
        }
      }

      return {
        name: item.product.name,
        unitPrice: item.price,
        quantity: item.quantity,
        total: item.total,
        variant: item.selectedVariant?.name,
        modifiers: item.selectedModifiers?.map((m) => m.name),
        notes: item.notes,
        sku: item.product.sku,
        productId: item.product.id,
        image: item.product.image,
        freeQuantity: freeQuantity > 0 ? freeQuantity : undefined,
      };
    });

    const receipt: EReceipt = {
      id: receiptId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderCode: order.code,
      merchantPubkey: undefined, // Filled in by Nostr layer
      customerPubkey: order.customerPubkey,
      items: receiptItems,
      subtotal: order.total - (order.tax || 0) + (order.discount || 0),
      discount: order.discount || 0,
      appliedPromotions: order.appliedPromotions?.map((p) => ({
        promotionId: p.promotionId,
        promotionName: p.promotionName,
        discountAmount: p.discountAmount,
        description: p.description,
      })),
      tax: order.tax || 0,
      tip: order.tip,
      total: order.total,
      totalSats: order.totalSats,
      currency: (order.currency as CurrencyCode) || "LAK",
      paymentMethod: order.paymentMethod,
      paymentProof:
        paymentProof || (order.paymentProof ? order.paymentProof : undefined),
      createdAt: new Date().toISOString(),
      merchantName: settings.value.merchantName,
      merchantAddress: settings.value.merchantAddress,
    };

    lastReceipt.value = receipt;

    // Store for e-bill access
    eBillStorage.set(receiptId, receipt);

    return receipt;
  };

  // ============================================
  // Format Currency
  // ============================================
  const formatAmount = (
    amount: number,
    currencyCode: CurrencyCode = "LAK"
  ): string => {
    return currency.format(amount, currencyCode);
  };

  // ============================================
  // Generate E-Bill URL
  // ============================================
  const generateEBillUrl = (receiptId: string): string => {
    // Use configured base URL if available, otherwise auto-detect
    const savedSettings = receiptSettings.settings.value;
    let baseUrl = savedSettings.eBillBaseUrl?.trim() || "";

    if (!baseUrl && typeof window !== "undefined") {
      // Auto-detect: use current origin (works for localhost and network access)
      baseUrl = window.location.origin;
    }

    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, "");

    return `${baseUrl}/receipt/${receiptId}`;
  };

  const generateEBillQrData = (receiptId: string): string => {
    return generateEBillUrl(receiptId);
  };

  // ============================================
  // Get E-Bill by ID (for public page)
  // ============================================
  const getEBill = (receiptId: string): EReceipt | null => {
    return eBillStorage.get(receiptId) || null;
  };

  // Store E-Bill (for sharing between pages)
  const storeEBill = (receipt: EReceipt): void => {
    eBillStorage.set(receipt.id, receipt);
    // Also store in sessionStorage for page refresh
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`ebill_${receipt.id}`, JSON.stringify(receipt));
      } catch {
        // Storage full or unavailable
      }
    }
  };

  // Retrieve E-Bill from storage
  const retrieveEBill = (receiptId: string): EReceipt | null => {
    // Try memory first
    const memReceipt = eBillStorage.get(receiptId);
    if (memReceipt) return memReceipt;

    // Try sessionStorage
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(`ebill_${receiptId}`);
        if (stored) {
          const receipt = JSON.parse(stored) as EReceipt;
          eBillStorage.set(receiptId, receipt);
          return receipt;
        }
      } catch {
        // Parse error
      }
    }

    return null;
  };

  // ============================================
  // Payment Method Label Helper
  // ============================================
  const getPaymentMethodLabel = (method?: PaymentMethod | string): string => {
    const labels: Record<string, string> = {
      lightning: "⚡ Lightning",
      bolt12: "⚡ BOLT12",
      lnurl: "⚡ LNURL",
      cash: "💵 Cash",
      bank_transfer: "🏦 Bank Transfer",
      external: "📱 External",
      qr_static: "📱 QR Code",
      split: "✂️ Split Bill",
    };
    return labels[method || ""] || method || "Other";
  };

  // ============================================
  // Generate QR Code as Data URL (Native, no external API)
  // ============================================
  const generateQRCodeDataUrl = async (
    data: string,
    size: number = 150
  ): Promise<string> => {
    try {
      return await QRCode.toDataURL(data, {
        width: size,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      return "";
    }
  };

  // ============================================
  // Generate HTML Receipt for Browser Print
  // ============================================
  const generateHtmlReceipt = async (receipt: EReceipt): Promise<string> => {
    const paperWidth = settings.value.paperWidth === "58mm" ? "58mm" : "80mm";

    // Generate QR code data URL if needed
    let qrCodeDataUrl = "";
    if (settings.value.showQrCode) {
      const eBillUrl = generateEBillUrl(receipt.id);
      console.log("[Receipt] Generating QR for:", eBillUrl);
      const startTime = performance.now();
      qrCodeDataUrl = await generateQRCodeDataUrl(eBillUrl, 120);
      const duration = performance.now() - startTime;
      console.log(
        `[Receipt] QR generated in ${duration.toFixed(2)}ms:`,
        qrCodeDataUrl ? "✓" : "✗ (empty)"
      );
    } else {
      console.log("[Receipt] QR code disabled in settings");
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${receipt.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page {
      size: ${paperWidth} auto;
      margin: 0;
    }
    
    body {
      font-family: 'Courier New', 'Monaco', monospace;
      width: ${paperWidth};
      max-width: ${paperWidth};
      margin: 0 auto;
      padding: 8px;
      font-size: 11px;
      line-height: 1.4;
      background: white;
      color: #000;
    }
    
    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 1px dashed #000;
      margin-bottom: 8px;
    }
    
    .logo { font-size: 28px; margin-bottom: 4px; }
    .merchant-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    .merchant-info { font-size: 10px; color: #333; }
    
    .order-info {
      padding: 10px 0;
      border-bottom: 1px dashed #000;
      text-align: center;
    }
    
    .order-number {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 6px;
      padding: 4px 12px;
      background: #f5f5f5;
      border-radius: 4px;
      display: inline-block;
    }
    
    .order-details {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #333;
      margin-top: 6px;
      text-align: left;
    }
    
    .order-details-left { text-align: left; }
    .order-details-right { text-align: right; }
    
    .items { padding: 8px 0; }
    .item { margin-bottom: 8px; }
    .item-line { display: flex; justify-content: space-between; align-items: flex-start; }
    .item-name { flex: 1; font-weight: 500; }
    .item-price { text-align: right; white-space: nowrap; }
    .item-details { font-size: 9px; color: #666; padding-left: 12px; }
    .item-notes { font-size: 9px; color: #0066cc; font-style: italic; padding-left: 12px; }
    
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    
    .totals { padding: 8px 0; }
    .total-line { display: flex; justify-content: space-between; margin-bottom: 4px; }
    
    .grand-total {
      font-size: 14px;
      font-weight: bold;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 6px 0;
      margin: 8px 0;
    }
    
    .sats-total { color: #f59e0b; font-size: 12px; }
    .payment-method { text-align: center; padding: 8px 0; font-size: 11px; }
    
    .payment-verified {
      text-align: center;
      padding: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      margin: 8px 0;
    }
    
    .qr-section { text-align: center; padding: 12px 0; }
    .qr-section img { width: 100px; height: 100px; }
    .qr-label { font-size: 10px; color: #666; margin-top: 4px; }
    
    .footer {
      text-align: center;
      padding-top: 12px;
      border-top: 1px dashed #000;
      font-size: 10px;
      color: #666;
    }
    
    .footer-message { font-size: 12px; color: #000; margin-bottom: 4px; }
    
    @media print {
      body { width: ${paperWidth}; padding: 4px; }
      .no-print { display: none !important; }
    }
    
    @media screen {
      body {
        padding: 20px;
        max-width: 320px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        margin: 20px auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    ${
      settings.value.logoUrl
        ? `<div class="logo"><img src="${settings.value.logoUrl}" alt="Logo" style="max-height: 48px; max-width: 100%; object-fit: contain;"></div>`
        : `<div class="logo">${settings.value.logoEmoji}</div>`
    }
    <div class="merchant-name">${settings.value.merchantName}</div>
    ${
      settings.value.merchantAddress
        ? `<div class="merchant-info">${settings.value.merchantAddress}</div>`
        : ""
    }
    ${
      settings.value.merchantPhone
        ? `<div class="merchant-info">${settings.value.merchantPhone}</div>`
        : ""
    }
    ${
      settings.value.merchantEmail
        ? `<div class="merchant-info">${settings.value.merchantEmail}</div>`
        : ""
    }
    ${
      settings.value.merchantTaxId
        ? `<div class="merchant-info">Tax ID: ${settings.value.merchantTaxId}</div>`
        : ""
    }
  </div>
  
  <div class="order-info">
    ${
      receiptSettings.settings.value.content.showOrderSequence &&
      receipt.orderNumber
        ? `<div class="order-number">#${receipt.orderNumber}</div>`
        : ""
    }
    <div class="order-details">
      <div class="order-details-left">
        <div><strong>${receipt.orderCode || receipt.orderId}</strong></div>
        <div style="font-size: 9px; color: #666;">Receipt: ${receipt.id}</div>
      </div>
      <div class="order-details-right">
        <div>${new Date(receipt.createdAt).toLocaleDateString()}</div>
        <div style="font-size: 9px;">${new Date(
          receipt.createdAt
        ).toLocaleTimeString()}</div>
      </div>
    </div>
  </div>
  
  <div class="items">
    ${receipt.items
      .map(
        (item) => `
      <div class="item">
        <div class="item-line">
          <span class="item-name">${item.quantity}× ${item.name}</span>
          <span class="item-price">${formatAmount(
            item.total,
            receipt.currency
          )}</span>
        </div>
        ${
          item.variant
            ? `<div class="item-details">└ ${item.variant}</div>`
            : ""
        }
        ${
          item.modifiers?.length
            ? `<div class="item-details">+ ${item.modifiers.join(", ")}</div>`
            : ""
        }
        ${item.notes ? `<div class="item-notes">📝 "${item.notes}"</div>` : ""}
        ${
          item.freeQuantity && item.freeQuantity > 0
            ? `<div class="item-details" style="color: #16a34a; font-weight: 600;">└ 🎁 ${item.freeQuantity} FREE</div>`
            : ""
        }
      </div>
    `
      )
      .join("")}
  </div>

  <div class="divider"></div>

  ${
    receipt.appliedPromotions &&
    receipt.appliedPromotions.length > 0 &&
    receiptSettings.settings.value.content.showPromotionDetails
      ? `
  <div style="padding: 12px 0; background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; margin: 8px 0;">
    <div style="text-align: center; font-weight: bold; color: #16a34a; margin-bottom: 8px;">
      🎁 PROMOTIONS APPLIED 🎁
    </div>
    ${receipt.appliedPromotions
      .map(
        (promo) => `
    <div style="margin: 8px; padding: 8px; background: white; border-radius: 4px; border: 1px solid #bbf7d0;">
      <div style="font-weight: bold; color: #15803d; margin-bottom: 4px;">
        ★ ${promo.promotionName} ★
      </div>
      ${
        promo.description
          ? `<div style="font-size: 10px; color: #16a34a; font-style: italic; margin-bottom: 4px;">${promo.description}</div>`
          : ""
      }
      <div style="display: flex; justify-content: space-between; background: #dcfce7; padding: 4px 8px; border-radius: 4px; margin-top: 4px;">
        <span style="color: #15803d; font-weight: 600;">💰 You Saved:</span>
        <span style="color: #15803d; font-weight: bold;">${formatAmount(
          promo.discountAmount,
          receipt.currency
        )}</span>
      </div>
    </div>
    `
      )
      .join("")}
  </div>
  <div class="divider"></div>
  `
      : ""
  }

  <div class="totals">
    ${
      receiptSettings.settings.value.content.showSubtotal
        ? `
    <div class="total-line">
      <span>Subtotal</span>
      <span>${formatAmount(receipt.subtotal, receipt.currency)}</span>
    </div>
    `
        : ""
    }
    ${
      receipt.appliedPromotions && receipt.appliedPromotions.length > 0
        ? `
      <div class="total-line" style="color: #16a34a; font-weight: 600;">
        <span>Promotion Savings</span>
        <span>-${formatAmount(
          receipt.appliedPromotions.reduce(
            (sum, p) => sum + p.discountAmount,
            0
          ),
          receipt.currency
        )}</span>
      </div>
    `
        : ""
    }
    ${
      receiptSettings.settings.value.content.showDiscount &&
      receipt.discount > 0
        ? `
      <div class="total-line" style="color: #16a34a;">
        <span>Discount</span>
        <span>-${formatAmount(receipt.discount, receipt.currency)}</span>
      </div>
    `
        : ""
    }
    ${
      receiptSettings.settings.value.content.showTax && receipt.tax > 0
        ? `
      <div class="total-line">
        <span>Tax</span>
        <span>${formatAmount(receipt.tax, receipt.currency)}</span>
      </div>
    `
        : ""
    }
    ${
      receipt.tip && receipt.tip > 0
        ? `
      <div class="total-line">
        <span>Tip</span>
        <span>${formatAmount(receipt.tip, receipt.currency)}</span>
      </div>
    `
        : ""
    }
  </div>
  
  <div class="grand-total">
    <div class="total-line">
      <span>TOTAL</span>
      <span>${formatAmount(receipt.total, receipt.currency)}</span>
    </div>
    ${
      receipt.totalSats
        ? `
      <div class="total-line sats-total">
        <span>≈ Sats</span>
        <span>⚡ ${receipt.totalSats.toLocaleString()}</span>
      </div>
    `
        : ""
    }
  </div>
  
  ${
    receiptSettings.settings.value.content.showPaymentMethod
      ? `
  <div class="payment-method">
    Paid via: ${getPaymentMethodLabel(receipt.paymentMethod)}
  </div>
  `
      : ""
  }
  
  ${
    receipt.paymentProof?.preimage && settings.value.showPaymentProof
      ? `
    <div class="payment-verified">
      ⚡ Payment Verified<br>
      <small>Hash: ${
        receipt.paymentProof.paymentHash?.slice(0, 20) || "N/A"
      }...</small>
    </div>
  `
      : ""
  }
  
  <div class="footer">
    ${
      settings.value.showQrCode && qrCodeDataUrl
        ? `
      <div class="qr-section">
        <div class="qr-label">📱 E-Bill</div>
        <img src="${qrCodeDataUrl}" alt="E-Bill QR" style="width: 100px; height: 100px;" decoding="sync" loading="eager">
        <div class="qr-label">Scan for digital receipt</div>
      </div>
      <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
    `
        : ""
    }
    <div class="footer-message">${settings.value.footerMessage}</div>
    ${
      receiptSettings.settings.value.footer.returnPolicy
        ? `<div class="return-policy" style="font-size: 9px; margin: 6px 0; padding: 4px; background: #f5f5f5; border-radius: 2px;">${receiptSettings.settings.value.footer.returnPolicy}</div>`
        : ""
    }
    ${
      receiptSettings.settings.value.footer.customText
        ? `<div class="custom-footer-text" style="margin: 4px 0;">${receiptSettings.settings.value.footer.customText}</div>`
        : ""
    }
    ${
      receiptSettings.settings.value.footer.showWebsite &&
      receiptSettings.settings.value.footer.websiteUrl
        ? `<div class="website-url" style="margin: 4px 0;">🌐 ${receiptSettings.settings.value.footer.websiteUrl}</div>`
        : ""
    }

    <div>BNOS.SPACE</div>
    <div>Powered by Nostr & Bitcoin Lightning ⚡</div>
  </div>
</body>
</html>`;
  };

  // ============================================
  // Print Receipt (Browser)
  // ============================================
  const printReceipt = async (receipt: EReceipt): Promise<void> => {
    isPrinting.value = true;
    error.value = null;

    try {
      console.log("[Receipt] Starting print...");

      // Pre-generate QR code before opening dialog
      let qrCodeDataUrl = "";
      if (settings.value.showQrCode) {
        console.log("[Receipt] Pre-generating QR code...");
        const eBillUrl = generateEBillUrl(receipt.id);
        qrCodeDataUrl = await generateQRCodeDataUrl(eBillUrl, 120);
        console.log("[Receipt] QR pre-generated:", qrCodeDataUrl ? "✓" : "✗");
      }

      // Generate HTML with QR already included
      const html = await generateHtmlReceipt(receipt);

      // Small delay to ensure QR is ready
      await new Promise((r) => setTimeout(r, 100));

      console.log("[Receipt] Opening print window...");
      const printWindow = window.open("", "_blank", "width=400,height=600");

      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for all images to fully load before printing
        const waitForImages = () => {
          return new Promise<void>((resolve) => {
            const images = printWindow.document.querySelectorAll("img");

            if (images.length === 0) {
              console.log("[Receipt] No images to load");
              resolve();
              return;
            }

            console.log(
              `[Receipt] Waiting for ${images.length} image(s) to load...`
            );
            let loaded = 0;
            const checkAllLoaded = () => {
              loaded++;
              console.log(`[Receipt] Image loaded: ${loaded}/${images.length}`);
              if (loaded >= images.length) {
                resolve();
              }
            };

            images.forEach((img) => {
              if (img.complete) {
                checkAllLoaded();
              } else {
                img.onload = checkAllLoaded;
                img.onerror = () => {
                  console.warn(
                    "[Receipt] Image failed to load:",
                    img.src?.slice(0, 50)
                  );
                  checkAllLoaded(); // Don't block on error
                };
              }
            });

            // Safety timeout - don't wait forever
            setTimeout(() => {
              console.log("[Receipt] Image timeout reached");
              resolve();
            }, 2000);
          });
        };

        // Wait for document ready + images + rendering
        printWindow.onload = async () => {
          console.log("[Receipt] Print window loaded");
          await waitForImages();

          // Ensure browser has rendered everything
          await new Promise((r) => setTimeout(r, 200));

          console.log("[Receipt] Printing...");
          printWindow.print();

          // Keep window open for a moment, then close
          setTimeout(() => {
            printWindow.close();
            isPrinting.value = false;
          }, 500);
        };

        // Fallback timeout if onload doesn't fire
        setTimeout(() => {
          if (isPrinting.value) {
            console.warn("[Receipt] Fallback: forcing print");
            printWindow.print();
            isPrinting.value = false;
          }
        }, 5000);
      } else {
        error.value = "Could not open print window. Please allow popups.";
        isPrinting.value = false;
      }
    } catch (e) {
      console.error("Print error:", e);
      error.value = "Failed to generate receipt for printing.";
      isPrinting.value = false;
    }
  };

  // ============================================
  // Generate Thermal Printer Receipt (ESC/POS text)
  // ============================================
  const generateThermalReceipt = (receipt: EReceipt): string => {
    const width = settings.value.paperWidth === "58mm" ? 32 : 48;
    const divider = "─".repeat(width);
    const doubleDivider = "═".repeat(width);

    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return " ".repeat(padding) + text;
    };

    const rightAlign = (left: string, right: string) => {
      const space = Math.max(1, width - left.length - right.length);
      return left + " ".repeat(space) + right;
    };

    const lines: string[] = [];

    // Header
    lines.push("");
    lines.push(
      center(settings.value.logoEmoji + " " + settings.value.merchantName)
    );
    if (settings.value.merchantAddress) {
      lines.push(center(settings.value.merchantAddress));
    }
    if (settings.value.merchantPhone) {
      lines.push(center(settings.value.merchantPhone));
    }
    lines.push("");
    lines.push(doubleDivider);

    // Order Info
    lines.push(
      `Order: ${
        receipt.orderNumber ? "#" + receipt.orderNumber : receipt.orderId
      }`
    );
    lines.push(`Date: ${new Date(receipt.createdAt).toLocaleString()}`);
    lines.push(`Receipt: ${receipt.id}`);
    lines.push(divider);

    // Items
    receipt.items.forEach((item) => {
      const itemTotal = formatAmount(item.total, receipt.currency);
      lines.push(`${item.quantity}x ${item.name}`);
      if (item.variant) lines.push(`   └ ${item.variant}`);
      if (item.modifiers?.length)
        lines.push(`   + ${item.modifiers.join(", ")}`);
      if (item.notes) lines.push(`   📝 ${item.notes}`);
      // Show free quantity if promotion applied
      if (item.freeQuantity && item.freeQuantity > 0) {
        lines.push(`   🎁 ${item.freeQuantity} FREE`);
      }
      lines.push(rightAlign("", itemTotal));
    });

    lines.push(divider);

    // Promotions Applied (only if showPromotionDetails is enabled)
    const contentSettings = receiptSettings.settings.value.content;

    if (
      receipt.appliedPromotions &&
      receipt.appliedPromotions.length > 0 &&
      contentSettings.showPromotionDetails
    ) {
      lines.push("");
      lines.push(center("🎁 PROMOTIONS APPLIED 🎁"));
      lines.push(divider);

      receipt.appliedPromotions.forEach((promo) => {
        // Promotion name
        lines.push(center(`★ ${promo.promotionName} ★`));

        // Description
        if (promo.description) {
          lines.push(center(`(${promo.description})`));
        }

        // Savings
        lines.push("");
        lines.push(rightAlign(
          "💰 You Saved:",
          formatAmount(promo.discountAmount, receipt.currency)
        ));
        lines.push("");
      });

      // Total savings if multiple promotions
      if (receipt.appliedPromotions.length > 1) {
        const totalSavings = receipt.appliedPromotions.reduce(
          (sum, p) => sum + p.discountAmount,
          0
        );
        lines.push(rightAlign(
          "🎉 Total Savings:",
          formatAmount(totalSavings, receipt.currency)
        ));
        lines.push("");
      }

      lines.push(divider);
    }

    // Totals - respect content settings

    if (contentSettings.showSubtotal) {
      lines.push(
        rightAlign(
          "Subtotal:",
          formatAmount(receipt.subtotal, receipt.currency)
        )
      );
    }

    // Promotion savings in totals
    if (receipt.appliedPromotions && receipt.appliedPromotions.length > 0) {
      const totalPromotionDiscount = receipt.appliedPromotions.reduce(
        (sum, p) => sum + p.discountAmount,
        0
      );
      lines.push(
        rightAlign(
          "Promotion Savings:",
          `-${formatAmount(totalPromotionDiscount, receipt.currency)}`
        )
      );
    }

    if (contentSettings.showDiscount && receipt.discount > 0) {
      lines.push(
        rightAlign(
          "Discount:",
          `-${formatAmount(receipt.discount, receipt.currency)}`
        )
      );
    }
    if (contentSettings.showTax && receipt.tax > 0) {
      lines.push(
        rightAlign("Tax:", formatAmount(receipt.tax, receipt.currency))
      );
    }
    if (receipt.tip && receipt.tip > 0) {
      lines.push(
        rightAlign("Tip:", formatAmount(receipt.tip, receipt.currency))
      );
    }

    lines.push(doubleDivider);
    lines.push(
      rightAlign("TOTAL:", formatAmount(receipt.total, receipt.currency))
    );

    if (receipt.totalSats && receipt.totalSats > 0) {
      lines.push(
        rightAlign("≈ Sats:", `⚡ ${receipt.totalSats.toLocaleString()}`)
      );
    }
    lines.push(doubleDivider);

    // Payment Method - respect content settings
    if (contentSettings.showPaymentMethod) {
      lines.push(
        center(`Paid via: ${getPaymentMethodLabel(receipt.paymentMethod)}`)
      );
      lines.push("");
    }

    // Footer
    lines.push(divider);
    lines.push(center(settings.value.footerMessage));

    // Return policy
    const footerSettings = receiptSettings.settings.value.footer;
    if (footerSettings.returnPolicy) {
      lines.push("");
      lines.push(center(footerSettings.returnPolicy));
    }

    // Custom footer text
    if (footerSettings.customText) {
      lines.push("");
      lines.push(center(footerSettings.customText));
    }

    // Website URL
    if (footerSettings.showWebsite && footerSettings.websiteUrl) {
      lines.push("");
      lines.push(center(`🌐 ${footerSettings.websiteUrl}`));
    }

    lines.push("");
    lines.push(center("Powered by Nostr & Lightning ⚡"));
    lines.push("");
    lines.push("");

    return lines.join("\n");
  };

  // ============================================
  // Print to Thermal Printer (via WebUSB/Serial)
  // ============================================
  const printToThermalPrinter = async (receipt: EReceipt): Promise<boolean> => {
    isPrinting.value = true;
    error.value = null;

    try {
      // Check for Web Serial API support
      if (!("serial" in navigator)) {
        console.log("Web Serial not supported, using browser print");
        printReceipt(receipt);
        return true;
      }

      // @ts-expect-error - Web Serial API
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });

      const writer = port.writable?.getWriter();
      if (!writer) throw new Error("Could not get writer");

      const encoder = new TextEncoder();
      const text = generateThermalReceipt(receipt);

      // ESC/POS Commands
      const ESC = 0x1b;
      const GS = 0x1d;

      // Initialize printer
      await writer.write(new Uint8Array([ESC, 0x40]));
      await writer.write(new Uint8Array([ESC, 0x74, 0x10])); // UTF-8
      await writer.write(encoder.encode(text));
      await writer.write(new Uint8Array([GS, 0x56, 0x00])); // Cut paper

      writer.releaseLock();
      await port.close();

      return true;
    } catch (e) {
      console.error("Thermal print error:", e);
      printReceipt(receipt);
      return true;
    } finally {
      isPrinting.value = false;
    }
  };

  // ============================================
  // Update Settings
  // ============================================
  const updateSettings = (newSettings: Partial<ReceiptSettings>) => {
    // Map legacy format to new settings format
    if (newSettings.merchantName) {
      receiptSettings.updateHeader({ businessName: newSettings.merchantName });
    }
    if (newSettings.merchantAddress) {
      receiptSettings.updateHeader({ address: newSettings.merchantAddress });
    }
    if (newSettings.merchantPhone) {
      receiptSettings.updateHeader({ phone: newSettings.merchantPhone });
    }
    if (newSettings.merchantTaxId) {
      receiptSettings.updateHeader({ taxId: newSettings.merchantTaxId });
    }
    if (newSettings.footerMessage) {
      receiptSettings.updateFooter({
        thankYouMessage: newSettings.footerMessage,
      });
    }
    if (newSettings.showQrCode !== undefined) {
      receiptSettings.updateFooter({ showQrCode: newSettings.showQrCode });
    }
    if (newSettings.paperWidth) {
      receiptSettings.updatePaper({ width: newSettings.paperWidth });
    }
    if (newSettings.logoUrl) {
      receiptSettings.setLogo(newSettings.logoUrl);
    }
  };

  return {
    // State
    lastReceipt,
    isSending,
    isPrinting,
    error,
    settings,

    // Methods
    generateReceipt,
    generateEBillUrl,
    generateEBillQrData,
    generateQRCodeDataUrl,
    getEBill,
    storeEBill,
    retrieveEBill,
    generateThermalReceipt,
    generateHtmlReceipt,
    printReceipt,
    printToThermalPrinter,
    updateSettings,
    formatAmount,
    getPaymentMethodLabel,
  };
};
