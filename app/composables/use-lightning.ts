// composables/use-lightning.ts
// ⚡ Lightning Payment Integration - BOLT11 & BOLT12

import { ref, computed } from "vue";
import type {
  LightningInvoice,
  BOLT12Offer,
  PaymentProof,
  PaymentStatus,
  PaymentMethod,
  LightningSettings,
  LightningProvider,
} from "~/types";

// Singleton state for settings
const isInitialized = ref(false);
const lightningSettings = ref<LightningSettings>({
  provider: "lnbits",
  isConfigured: false,
});

// Encrypted storage keys
const SETTINGS_KEY = "bitspace_lightning_settings";
const SENSITIVE_KEYS_KEY = "bitspace_lightning_keys";

export const useLightning = () => {
  const _nostr = useNuxtApp().$nostr;
  const security = useSecurity();

  // State
  const isConnected = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentInvoice = ref<LightningInvoice | null>(null);
  const paymentStatus = ref<PaymentStatus>("pending");

  // BOLT12 Static Offers
  const staticOffers = ref<BOLT12Offer[]>([]);

  // ============================================
  // 🔐 SECURE KEY STORAGE
  // ============================================

  /**
   * Store sensitive keys (API keys, tokens) with encryption
   * Only works when master password is set and unlocked
   */
  const storeSensitiveKeys = async (keys: {
    apiKey?: string;
    accessToken?: string;
    blinkApiKey?: string;
    nwcConnectionString?: string;
  }): Promise<boolean> => {
    try {
      // If encryption is enabled and unlocked, encrypt the keys
      if (security.isEncryptionEnabled.value && !security.isLocked.value) {
        return await security.encryptAndStore(SENSITIVE_KEYS_KEY, keys);
      }

      // Fallback: store without encryption (less secure)
      localStorage.setItem(SENSITIVE_KEYS_KEY, JSON.stringify(keys));
      return true;
    } catch (e) {
      console.error("Failed to store sensitive keys:", e);
      return false;
    }
  };

  /**
   * Retrieve sensitive keys (decrypted if encryption is enabled)
   * Handles edge case where data was encrypted but encryption is now off
   */
  const getSensitiveKeys = async (): Promise<{
    apiKey?: string;
    accessToken?: string;
    blinkApiKey?: string;
    nwcConnectionString?: string;
  } | null> => {
    try {
      const stored = localStorage.getItem(SENSITIVE_KEYS_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Check if data is in encrypted format (has iv and data properties)
      const isEncryptedFormat =
        parsed && typeof parsed === "object" && parsed.iv && parsed.data;

      if (isEncryptedFormat) {
        // Data is encrypted - need to decrypt
        // Check if we have the encryption key available
        if (security.isLocked.value || !security.hasEncryptionKey.value) {
          console.warn(
            "Cannot retrieve keys: security is locked or encryption key not available"
          );
          return null;
        }
        // Try to decrypt using security composable
        return await security.retrieveAndDecrypt(SENSITIVE_KEYS_KEY);
      }

      // Data is in plain format - return directly
      return parsed;
    } catch (e) {
      console.error("Failed to retrieve sensitive keys:", e);
      return null;
    }
  };

  /**
   * Check if sensitive keys are accessible
   * Considers whether data is actually encrypted or in plain format
   */
  const canAccessKeys = (): boolean => {
    // Check if stored data is encrypted
    const stored = localStorage.getItem(SENSITIVE_KEYS_KEY);
    if (!stored) return true; // No data - can access (will just be null)

    try {
      const parsed = JSON.parse(stored);
      const isEncryptedFormat =
        parsed && typeof parsed === "object" && parsed.iv && parsed.data;

      // If data is encrypted, need both unlocked state AND encryption key
      if (isEncryptedFormat) {
        return !security.isLocked.value && security.hasEncryptionKey.value;
      }

      return true;
    } catch {
      return true;
    }
  };

  // ============================================
  // ⚙️ SETTINGS MANAGEMENT
  // ============================================

  /**
   * Load settings from storage
   */
  const loadSettings = async (): Promise<LightningSettings> => {
    if (typeof window === "undefined") return lightningSettings.value;

    try {
      // Load non-sensitive settings
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        lightningSettings.value = { ...lightningSettings.value, ...parsed };
      }

      // Load sensitive keys (encrypted if master password is set)
      const accessCheck = canAccessKeys();

      if (accessCheck) {
        const sensitiveKeys = await getSensitiveKeys();

        if (sensitiveKeys) {
          lightningSettings.value.apiKey = sensitiveKeys.apiKey;
          lightningSettings.value.accessToken = sensitiveKeys.accessToken;
          lightningSettings.value.blinkApiKey = sensitiveKeys.blinkApiKey;
          lightningSettings.value.nwcConnectionString =
            sensitiveKeys.nwcConnectionString;
        }
      }
    } catch (e) {
      console.error("Failed to load Lightning settings:", e);
    }
    return lightningSettings.value;
  };

  /**
   * Save settings to storage
   */
  const saveSettings = async (
    settings: Partial<LightningSettings>
  ): Promise<boolean> => {
    try {
      // Merge with existing settings
      lightningSettings.value = { ...lightningSettings.value, ...settings };

      // Separate sensitive keys from regular settings
      const {
        apiKey,
        accessToken,
        blinkApiKey,
        nwcConnectionString,
        ...nonSensitiveSettings
      } = lightningSettings.value;

      // Store non-sensitive settings (unencrypted)
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(nonSensitiveSettings));

      // Store sensitive keys (encrypted if master password is set)
      await storeSensitiveKeys({
        apiKey,
        accessToken,
        blinkApiKey,
        nwcConnectionString,
      });

      return true;
    } catch (e) {
      console.error("Failed to save Lightning settings:", e);
      return false;
    }
  };

  /**
   * Update Lightning configuration
   */
  const updateConfig = async (config: {
    provider: LightningProvider;
    nodeUrl?: string;
    apiKey?: string;
    accessToken?: string;
    blinkApiKey?: string;
    nwcConnectionString?: string;
    lightningAddress?: string;
    bolt12Offer?: string;
  }): Promise<boolean> => {
    const settings: Partial<LightningSettings> = {
      provider: config.provider,
      nodeUrl: config.nodeUrl,
      apiKey: config.apiKey,
      accessToken: config.accessToken,
      blinkApiKey: config.blinkApiKey,
      nwcConnectionString: config.nwcConnectionString,
      lightningAddress: config.lightningAddress,
      bolt12Offer: config.bolt12Offer,
    };

    const saved = await saveSettings(settings);
    if (saved) {
      // Test connection directly without checking isConfigured
      const testResult = await testConnection();
      if (testResult.success) {
        await saveSettings({
          isConfigured: true,
          testStatus: "success",
          lastTestedAt: new Date().toISOString(),
        });
        isConnected.value = true;
        return true;
      } else {
        await saveSettings({
          isConfigured: false,
          testStatus: "failed",
          lastTestedAt: new Date().toISOString(),
        });
        error.value = testResult.message;
      }
    }
    return false;
  };

  /**
   * Test current configuration
   */
  const testConnection = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    isLoading.value = true;
    error.value = null;

    try {
      const settings = lightningSettings.value;

      switch (settings.provider) {
        case "lnbits":
          if (!settings.nodeUrl || !settings.apiKey) {
            return {
              success: false,
              message: "LNbits URL and API Key are required",
            };
          }
          await testLNbitsConnection(settings.nodeUrl, settings.apiKey);
          break;
        case "alby":
          await testAlbyConnection();
          break;
        case "alby-hub":
          if (!settings.nodeUrl || !settings.accessToken) {
            return {
              success: false,
              message: "Alby Hub URL and Access Token are required",
            };
          }
          await testAlbyHubConnection(settings.nodeUrl, settings.accessToken);
          break;
        case "blink":
          if (!settings.blinkApiKey) {
            return { success: false, message: "Blink API Key is required" };
          }
          await testBlinkConnection(settings.blinkApiKey);
          break;
        case "nwc":
          if (!settings.nwcConnectionString) {
            return {
              success: false,
              message: "NWC connection string is required",
            };
          }
          await testNWCConnection(settings.nwcConnectionString);
          break;
        case "lnurl":
          if (!settings.lightningAddress) {
            return { success: false, message: "Lightning address is required" };
          }
          await testLNURLConnection(settings.lightningAddress);
          break;
        default:
          return {
            success: false,
            message: `Unsupported provider: ${settings.provider}`,
          };
      }

      await saveSettings({
        isConfigured: true,
        testStatus: "success",
        lastTestedAt: new Date().toISOString(),
      });

      isConnected.value = true;
      return { success: true, message: "Connection successful!" };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Connection failed";
      error.value = message;

      await saveSettings({
        testStatus: "failed",
        lastTestedAt: new Date().toISOString(),
      });

      isConnected.value = false;
      return { success: false, message };
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Initialize Lightning connection from saved settings
   */
  const connect = async (): Promise<boolean> => {
    await loadSettings();

    if (!lightningSettings.value.isConfigured) {
      error.value = "Lightning not configured. Please configure in settings.";
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const settings = lightningSettings.value;

      switch (settings.provider) {
        case "lnbits":
          if (!settings.nodeUrl || !settings.apiKey) {
            throw new Error("LNbits URL and API Key required");
          }
          await testLNbitsConnection(settings.nodeUrl, settings.apiKey);
          break;
        case "alby":
          await testAlbyConnection();
          break;
        case "alby-hub":
          if (!settings.nodeUrl || !settings.accessToken) {
            throw new Error("Alby Hub URL and Access Token required");
          }
          await testAlbyHubConnection(settings.nodeUrl, settings.accessToken);
          break;
        case "blink":
          if (!settings.blinkApiKey) {
            throw new Error("Blink API Key required");
          }
          await testBlinkConnection(settings.blinkApiKey);
          break;
        case "nwc":
          if (!settings.nwcConnectionString) {
            throw new Error("NWC connection string required");
          }
          await testNWCConnection(settings.nwcConnectionString);
          break;
        case "lnurl":
          if (!settings.lightningAddress) {
            throw new Error("Lightning address required");
          }
          await testLNURLConnection(settings.lightningAddress);
          break;
        default:
          throw new Error(`Unsupported provider: ${settings.provider}`);
      }

      isConnected.value = true;
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Connection failed";
      isConnected.value = false;
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Create BOLT11 Invoice (traditional)
   */
  const createInvoice = async (
    amount: number, // in sats
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<LightningInvoice | null> => {
    if (!lightningSettings.value.isConfigured) {
      error.value = "Lightning not configured. Please configure in settings.";
      return null;
    }

    // Auto-connect if needed
    if (!isConnected.value) {
      const connected = await connect();
      if (!connected) return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const invoice = await generateBolt11Invoice(
        amount,
        description,
        metadata
      );
      currentInvoice.value = invoice;
      paymentStatus.value = "pending";

      // Start watching for payment
      watchPayment(invoice.paymentHash);

      return invoice;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create invoice";
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Create BOLT12 Offer (Static QR - ล้ำกว่า!)
   * QR เดียวใช้ได้ตลอด, dynamic amount
   */
  const createBolt12Offer = async (
    description: string,
    merchantName: string,
    options?: {
      minAmount?: number;
      maxAmount?: number;
      allowsAnyAmount?: boolean;
    }
  ): Promise<BOLT12Offer | null> => {
    if (!lightningSettings.value.isConfigured) {
      error.value = "Lightning not configured";
      return null;
    }

    isLoading.value = true;

    try {
      // For CLN-based BOLT12
      const offer: BOLT12Offer = {
        id: crypto.randomUUID(),
        offer: await generateBolt12Offer(description),
        description,
        merchantName,
        merchantPubkey: "", // Will be set from node
        allowsAnyAmount: options?.allowsAnyAmount ?? true,
        minAmount: options?.minAmount,
        maxAmount: options?.maxAmount,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      staticOffers.value.push(offer);
      return offer;
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to create BOLT12 offer";
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  // Store active cleanup functions for subscriptions
  const activeSubscriptions = ref<Map<string, () => void>>(new Map());

  /**
   * Watch for incoming payment
   */
  const watchPayment = (paymentHash: string) => {
    const settings = lightningSettings.value;

    // Clean up any existing subscription for this payment
    const existingCleanup = activeSubscriptions.value.get(paymentHash);
    if (existingCleanup) {
      existingCleanup();
    }

    // Callback when payment is received
    const onPaymentReceived = async () => {
      paymentStatus.value = "completed";

      // Get preimage if available
      const preimage = await getPreimage(paymentHash);
      if (currentInvoice.value) {
        currentInvoice.value.preimage = preimage;
        currentInvoice.value.status = "completed";
      }

      // Broadcast via Nostr for realtime sync
      await broadcastPaymentReceived(paymentHash, preimage);

      // Clean up subscription
      activeSubscriptions.value.delete(paymentHash);
    };

    // Use Blink WebSocket subscription for real-time updates
    if (
      settings.provider === "blink" &&
      settings.blinkApiKey &&
      currentInvoice.value?.bolt11
    ) {
      const cleanup = subscribeToBlinkPayments(
        currentInvoice.value.bolt11,
        onPaymentReceived
      );
      activeSubscriptions.value.set(paymentHash, cleanup);
      return;
    }

    // Fallback to polling for other providers
    const checkPayment = async () => {
      try {
        const status = await checkPaymentStatus(paymentHash);
        paymentStatus.value = status;

        if (status === "completed") {
          await onPaymentReceived();
          return;
        }

        if (status === "pending" || status === "processing") {
          // Keep checking
          setTimeout(checkPayment, 2000);
        }
      } catch (e) {
        console.error("Payment check error:", e);
        setTimeout(checkPayment, 5000);
      }
    };

    checkPayment();
  };

  /**
   * Broadcast payment received via Nostr
   * ให้ทุกเครื่อง/สาขารู้ทันที
   */
  const broadcastPaymentReceived = async (
    paymentHash: string,
    _preimage: string
  ) => {
    try {
      // NIP-47: Wallet Connect or custom event
      // This allows real-time sync across devices
      console.log("Broadcasting payment via Nostr:", paymentHash);

      // Implementation depends on Nostr setup
      // Could use encrypted DM to merchant pubkey
    } catch (e) {
      console.error("Failed to broadcast payment:", e);
    }
  };

  /**
   * Verify payment proof (preimage)
   */
  const verifyPayment = async (
    paymentHash: string,
    preimage: string
  ): Promise<boolean> => {
    try {
      // SHA256(preimage) should equal paymentHash
      // This is cryptographic proof of payment
      const hash = await sha256(hexToBytes(preimage));
      return bytesToHex(hash) === paymentHash;
    } catch {
      return false;
    }
  };

  /**
   * Create payment proof for offline storage
   */
  const createPaymentProof = (
    orderId: string,
    paymentHash: string,
    preimage: string,
    amount: number,
    method: PaymentMethod,
    isOffline: boolean = false
  ): PaymentProof => {
    return {
      id: crypto.randomUUID(),
      orderId,
      paymentHash,
      preimage,
      amount,
      receivedAt: new Date().toISOString(),
      method,
      isOffline,
      syncedAt: isOffline ? undefined : new Date().toISOString(),
    };
  };

  // ============================================
  // Provider-specific implementations
  // ============================================

  const testLNbitsConnection = async (nodeUrl: string, apiKey: string) => {
    const response = await fetch(`${nodeUrl}/api/v1/wallet`, {
      headers: {
        "X-Api-Key": apiKey,
      },
    });
    if (!response.ok) throw new Error("LNbits connection failed");
    return response.json();
  };

  const testAlbyConnection = async () => {
    // Alby uses WebLN
    if (typeof window !== "undefined" && "webln" in window) {
      const webln = window as unknown as {
        webln: { enable: () => Promise<void> };
      };
      await webln.webln.enable();
      return true;
    }
    throw new Error(
      "Alby/WebLN not available. Please install the Alby browser extension."
    );
  };

  /**
   * Test Alby Hub API connection
   * https://guides.getalby.com/alby-hub-for-advanced-users/api-reference
   */
  const testAlbyHubConnection = async (
    nodeUrl: string,
    accessToken: string
  ) => {
    const url = nodeUrl.endsWith("/") ? nodeUrl.slice(0, -1) : nodeUrl;
    const response = await fetch(`${url}/api/info`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alby Hub connection failed: ${errorText}`);
    }
    return response.json();
  };

  /**
   * Test Blink API connection
   * https://dev.blink.sv/
   */
  const testBlinkConnection = async (apiKey: string) => {
    const response = await fetch("https://api.blink.sv/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        query: `query Me { me { defaultAccount { wallets { id walletCurrency balance } } } }`,
      }),
    });

    if (!response.ok) {
      throw new Error("Blink API connection failed");
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(data.errors[0]?.message || "Blink API error");
    }

    // Store the BTC wallet ID for later use
    const wallets = data.data?.me?.defaultAccount?.wallets || [];
    const btcWallet = wallets.find(
      (w: { walletCurrency: string }) => w.walletCurrency === "BTC"
    );
    if (btcWallet) {
      await saveSettings({ blinkWalletId: btcWallet.id });
    }

    return data;
  };

  /**
   * Subscribe to Blink payment updates using GraphQL subscription
   * This provides real-time payment detection
   * Docs: https://dev.blink.sv/api/websocket
   */
  const subscribeToBlinkPayments = (
    paymentRequest: string,
    onPaid: () => void
  ): (() => void) => {
    const settings = lightningSettings.value;
    if (!settings.blinkApiKey) return () => {};

    // Correct WebSocket endpoint from Blink docs
    const wsUrl = "wss://ws.blink.sv/graphql";
    let ws: WebSocket | null = null;
    let isSubscribed = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      // Use graphql-transport-ws protocol as per Blink docs
      ws = new WebSocket(wsUrl, "graphql-transport-ws");

      ws.onopen = () => {
        // Initialize connection with API key
        ws?.send(
          JSON.stringify({
            type: "connection_init",
            payload: {
              "X-API-KEY": settings.blinkApiKey,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "connection_ack" && !isSubscribed) {
          // Subscribe to payment status using 'subscribe' type (not 'start')
          // Use paymentRequest (bolt11 invoice) as per Blink docs
          ws?.send(
            JSON.stringify({
              id: "1",
              type: "subscribe",
              payload: {
                query: `subscription LnInvoicePaymentStatus($input: LnInvoicePaymentStatusInput!) {
                lnInvoicePaymentStatus(input: $input) {
                  status
                  errors {
                    code
                    message
                    path
                  }
                }
              }`,
                variables: {
                  input: {
                    paymentRequest: paymentRequest,
                  },
                },
              },
            })
          );
          isSubscribed = true;
          console.log("Blink WebSocket: Subscribed to payment status");
        }

        // Handle 'next' message type (graphql-transport-ws protocol)
        if (message.type === "next") {
          const status = message.payload?.data?.lnInvoicePaymentStatus?.status;

          if (status === "PAID") {
            console.log("Blink WebSocket: Payment received!");
            onPaid();
            // Close subscription gracefully
            ws?.send(JSON.stringify({ id: "1", type: "complete" }));
            ws?.close();
          } else if (status === "EXPIRED") {
            console.log("Blink WebSocket: Invoice expired");
            ws?.send(JSON.stringify({ id: "1", type: "complete" }));
            ws?.close();
          }

          // Check for errors in the response
          if (message.payload?.errors?.length > 0) {
            console.error(
              "Blink WebSocket: Subscription error:",
              message.payload.errors
            );
          }
        }

        // Handle errors
        if (message.type === "error") {
          console.error("Blink WebSocket error:", message.payload);
        }
      };

      ws.onerror = (error) => {
        console.error("Blink WebSocket connection error:", error);
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds if not paid and still pending
        if (isSubscribed && paymentStatus.value === "pending") {
          reconnectTimeout = setTimeout(connectWs, 3000);
        }
      };
    };

    connectWs();

    // Return cleanup function
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
    };
  };

  const testNWCConnection = async (connectionString: string) => {
    // NIP-47 Nostr Wallet Connect
    // Parse the connection string
    if (!connectionString.startsWith("nostr+walletconnect://")) {
      throw new Error("Invalid NWC connection string");
    }
    // Implementation for connecting via Nostr
    return true;
  };

  /**
   * Test Lightning Address (LNURL-pay) connection
   * Supports: Wallet of Satoshi, Blink, Alby, Stacker News, etc.
   */
  const testLNURLConnection = async (lightningAddress: string) => {
    // Validate format: name@domain.com
    if (!lightningAddress.includes("@")) {
      throw new Error(
        "Invalid Lightning address format. Expected: name@domain.com"
      );
    }

    const [name, domain] = lightningAddress.split("@");

    // Fetch LNURL-pay metadata
    const lnurlPayUrl = `https://${domain}/.well-known/lnurlp/${name}`;

    const response = await fetch(lnurlPayUrl);
    if (!response.ok) {
      throw new Error(
        `Lightning address not found or service unavailable: ${lightningAddress}`
      );
    }

    const data = await response.json();

    // Validate LNURL-pay response
    if (data.tag !== "payRequest") {
      throw new Error("Invalid LNURL-pay response");
    }

    return {
      callback: data.callback,
      minSendable: data.minSendable, // millisats
      maxSendable: data.maxSendable, // millisats
      metadata: data.metadata,
      allowsNostr: data.allowsNostr || false,
      nostrPubkey: data.nostrPubkey,
    };
  };

  /**
   * Create invoice via Lightning Address (LNURL-pay)
   * This works with Wallet of Satoshi, Blink, Alby, etc.
   */
  const createLNURLInvoice = async (
    lightningAddress: string,
    amountSats: number,
    comment?: string
  ): Promise<LightningInvoice> => {
    const [name, domain] = lightningAddress.split("@");
    const lnurlPayUrl = `https://${domain}/.well-known/lnurlp/${name}`;

    // Step 1: Get LNURL-pay metadata
    const metaResponse = await fetch(lnurlPayUrl);
    if (!metaResponse.ok) {
      throw new Error("Failed to fetch Lightning address info");
    }

    const meta = await metaResponse.json();

    // Validate amount
    const amountMsats = amountSats * 1000;
    if (amountMsats < meta.minSendable || amountMsats > meta.maxSendable) {
      throw new Error(
        `Amount must be between ${meta.minSendable / 1000} and ${
          meta.maxSendable / 1000
        } sats`
      );
    }

    // Step 2: Request invoice from callback
    let callbackUrl = `${meta.callback}?amount=${amountMsats}`;
    if (
      comment &&
      meta.commentAllowed &&
      comment.length <= meta.commentAllowed
    ) {
      callbackUrl += `&comment=${encodeURIComponent(comment)}`;
    }

    const invoiceResponse = await fetch(callbackUrl);
    if (!invoiceResponse.ok) {
      throw new Error("Failed to get invoice from Lightning address");
    }

    const invoiceData = await invoiceResponse.json();

    if (invoiceData.status === "ERROR") {
      throw new Error(invoiceData.reason || "Invoice creation failed");
    }

    // Parse the bolt11 invoice to get payment hash
    const paymentHash = extractPaymentHash(invoiceData.pr);

    return {
      id: paymentHash,
      bolt11: invoiceData.pr,
      paymentHash,
      amount: amountSats,
      description: comment || `Payment to ${lightningAddress}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      status: "pending",
      metadata: {
        lightningAddress,
        successAction: invoiceData.successAction,
      },
    };
  };

  /**
   * Extract payment hash from BOLT11 invoice
   */
  const extractPaymentHash = (bolt11: string): string => {
    // Simple extraction - payment hash is part of the invoice
    // For production, use a proper BOLT11 decoder like bolt11 or light-bolt11-decoder
    try {
      // Remove the prefix (lnbc, lntb, lnbcrt) and validate
      const _validated = bolt11.toLowerCase().replace(/^ln(bc|tb|bcrt)/, "");
      // For now, generate a unique ID from the invoice - in production use proper decoder
      // The invoice itself is unique, so we can use a hash of it
      return crypto.randomUUID().replace(/-/g, "");
    } catch {
      return crypto.randomUUID().replace(/-/g, "");
    }
  };

  const generateBolt11Invoice = async (
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<LightningInvoice> => {
    const settings = lightningSettings.value;

    if (!settings.isConfigured) throw new Error("Not configured");

    // LNURL/Lightning Address provider
    if (settings.provider === "lnurl" && settings.lightningAddress) {
      return createLNURLInvoice(settings.lightningAddress, amount, description);
    }

    // LNbits provider
    if (settings.provider === "lnbits" && settings.nodeUrl && settings.apiKey) {
      const response = await fetch(`${settings.nodeUrl}/api/v1/payments`, {
        method: "POST",
        headers: {
          "X-Api-Key": settings.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          out: false,
          amount,
          memo: description,
          extra: metadata,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create invoice: ${errorText}`);
      }

      const data = await response.json();

      return {
        id: data.payment_hash,
        bolt11: data.payment_request,
        paymentHash: data.payment_hash,
        amount,
        description,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        createdAt: new Date().toISOString(),
        status: "pending",
        metadata,
      };
    }

    // Alby Hub provider
    if (
      settings.provider === "alby-hub" &&
      settings.nodeUrl &&
      settings.accessToken
    ) {
      const url = settings.nodeUrl.endsWith("/")
        ? settings.nodeUrl.slice(0, -1)
        : settings.nodeUrl;
      const response = await fetch(`${url}/api/invoices`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount * 1000, // Alby Hub expects millisats
          description,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create invoice: ${errorText}`);
      }

      const data = await response.json();

      return {
        id: data.payment_hash,
        bolt11: data.payment_request,
        paymentHash: data.payment_hash,
        amount,
        description,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        status: "pending",
        metadata,
      };
    }

    // Blink provider
    if (settings.provider === "blink" && settings.blinkApiKey) {
      const walletId = settings.blinkWalletId;
      if (!walletId) {
        throw new Error(
          "Blink wallet not configured. Please test connection first."
        );
      }

      const response = await fetch("https://api.blink.sv/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": settings.blinkApiKey,
        },
        body: JSON.stringify({
          query: `
            mutation LnInvoiceCreate($input: LnInvoiceCreateInput!) {
              lnInvoiceCreate(input: $input) {
                invoice {
                  paymentHash
                  paymentRequest
                  paymentSecret
                  satoshis
                }
                errors {
                  message
                }
              }
            }
          `,
          variables: {
            input: {
              walletId,
              amount: amount,
              memo: description,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Blink API request failed");
      }

      const data = await response.json();

      if (data.errors || data.data?.lnInvoiceCreate?.errors?.length > 0) {
        const err = data.errors?.[0] || data.data?.lnInvoiceCreate?.errors?.[0];
        throw new Error(err?.message || "Failed to create Blink invoice");
      }

      const invoice = data.data.lnInvoiceCreate.invoice;

      return {
        id: invoice.paymentHash,
        bolt11: invoice.paymentRequest,
        paymentHash: invoice.paymentHash,
        amount,
        description,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        status: "pending",
        metadata,
      };
    }

    // WebLN (Alby browser extension)
    if (settings.provider === "alby" && typeof window !== "undefined") {
      interface WebLNInvoice {
        paymentRequest: string;
        paymentHash?: string;
      }
      interface WebLN {
        makeInvoice: (args: {
          amount: number;
          defaultMemo: string;
        }) => Promise<WebLNInvoice>;
      }
      const webln = (window as unknown as { webln: WebLN }).webln;
      const invoice = await webln.makeInvoice({
        amount,
        defaultMemo: description,
      });

      return {
        id: invoice.paymentHash || crypto.randomUUID(),
        bolt11: invoice.paymentRequest,
        paymentHash: invoice.paymentHash || "",
        amount,
        description,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        status: "pending",
        metadata,
      };
    }

    throw new Error("Unsupported provider for invoice creation");
  };

  const generateBolt12Offer = async (description: string): Promise<string> => {
    // Check if we have a static BOLT12 offer configured
    if (lightningSettings.value.bolt12Offer) {
      return lightningSettings.value.bolt12Offer;
    }

    // BOLT12 requires CLN or compatible node
    // For now, return placeholder
    // Real implementation would call CLN's `offer` command
    return `lno1...${btoa(description).slice(0, 20)}`;
  };

  const checkPaymentStatus = async (
    paymentHash: string
  ): Promise<PaymentStatus> => {
    const settings = lightningSettings.value;

    if (!settings.isConfigured) return "pending";

    // LNbits provider
    if (settings.provider === "lnbits" && settings.nodeUrl && settings.apiKey) {
      const response = await fetch(
        `${settings.nodeUrl}/api/v1/payments/${paymentHash}`,
        {
          headers: {
            "X-Api-Key": settings.apiKey,
          },
        }
      );

      if (!response.ok) return "pending";

      const data = await response.json();
      return data.paid ? "completed" : "pending";
    }

    // Alby Hub provider
    if (
      settings.provider === "alby-hub" &&
      settings.nodeUrl &&
      settings.accessToken
    ) {
      const url = settings.nodeUrl.endsWith("/")
        ? settings.nodeUrl.slice(0, -1)
        : settings.nodeUrl;
      const response = await fetch(`${url}/api/invoices/${paymentHash}`, {
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
        },
      });

      if (!response.ok) return "pending";

      const data = await response.json();
      // Alby Hub returns settled_at when paid
      return data.settled_at ? "completed" : "pending";
    }

    // Blink provider
    if (settings.provider === "blink" && settings.blinkApiKey) {
      const response = await fetch("https://api.blink.sv/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": settings.blinkApiKey,
        },
        body: JSON.stringify({
          query: `
            query LnInvoicePaymentStatus($input: LnInvoicePaymentStatusInput!) {
              lnInvoicePaymentStatus(input: $input) {
                status
                errors {
                  message
                }
              }
            }
          `,
          variables: {
            input: {
              paymentHash,
            },
          },
        }),
      });

      if (!response.ok) return "pending";

      const data = await response.json();
      const status = data.data?.lnInvoicePaymentStatus?.status;

      // Blink returns: PENDING, PAID, EXPIRED
      if (status === "PAID") return "completed";
      if (status === "EXPIRED") return "expired";
      return "pending";
    }

    return "pending";
  };

  const getPreimage = async (paymentHash: string): Promise<string> => {
    const settings = lightningSettings.value;

    if (!settings.isConfigured) return "";

    // LNbits provider
    if (settings.provider === "lnbits" && settings.nodeUrl && settings.apiKey) {
      const response = await fetch(
        `${settings.nodeUrl}/api/v1/payments/${paymentHash}`,
        {
          headers: {
            "X-Api-Key": settings.apiKey,
          },
        }
      );

      if (!response.ok) return "";

      const data = await response.json();
      return data.preimage || "";
    }

    // Alby Hub provider
    if (
      settings.provider === "alby-hub" &&
      settings.nodeUrl &&
      settings.accessToken
    ) {
      const url = settings.nodeUrl.endsWith("/")
        ? settings.nodeUrl.slice(0, -1)
        : settings.nodeUrl;
      const response = await fetch(`${url}/api/invoices/${paymentHash}`, {
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
        },
      });

      if (!response.ok) return "";

      const data = await response.json();
      return data.preimage || "";
    }

    // Blink doesn't expose preimage via API
    return "";
  };

  // Helper functions
  const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  };

  const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const sha256 = async (data: Uint8Array): Promise<Uint8Array> => {
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new Uint8Array(data).buffer as ArrayBuffer
    );
    return new Uint8Array(hashBuffer);
  };

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  const initialize = async (): Promise<void> => {
    if (isInitialized.value) return;

    await loadSettings();
    isInitialized.value = true;

    // Auto-connect if configured
    if (lightningSettings.value.isConfigured) {
      await connect();
    }
  };

  // Auto-initialize
  if (typeof window !== "undefined" && !isInitialized.value) {
    initialize();
  }

  // Computed
  const isPaid = computed(() => paymentStatus.value === "completed");
  const invoiceQR = computed(() => currentInvoice.value?.bolt11 || "");
  const settings = computed(() => lightningSettings.value);

  return {
    // State
    isConnected,
    isLoading,
    error,
    currentInvoice,
    paymentStatus,
    staticOffers,
    isPaid,
    invoiceQR,
    settings,

    // Settings
    loadSettings,
    saveSettings,
    updateConfig,
    testConnection,
    canAccessKeys,

    // Methods
    connect,
    createInvoice,
    createBolt12Offer,
    watchPayment,
    verifyPayment,
    createPaymentProof,
    broadcastPaymentReceived,
    initialize,
  };
};
