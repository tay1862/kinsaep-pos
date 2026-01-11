# E-Bill / Receipt System - Workflow & Security

## Overview
The e-bill system allows customers to scan a QR code after payment to view their digital receipt on any device. Receipts are published to Nostr relays for decentralized, censorship-resistant storage.

---

## Workflow

### 1. Receipt Creation (POS Payment)
```
Customer pays → Generate receipt → Publish to Nostr → Show QR code
```

**What happens:**
- Merchant completes sale in POS
- System generates:
  - Receipt ID (e.g., `019b8261-f60d-759e-8746-712c2e98d236eb22730`)
  - Verification Code (e.g., `REC-3RZG-REB2`)
- Receipt is saved to **localStorage** (for same-device access)
- Receipt is published to **Nostr relays** (for cross-device access)
- QR code is generated with URL: `/receipt/{id}?code={code}`

**Files:**
- [app/pages/pos/index.vue](../app/pages/pos/index.vue) (lines 784-815)
- [app/composables/use-receipt-generator.ts](../app/composables/use-receipt-generator.ts)

---

### 2. Receipt Publishing (Nostr)
```
Create event → Sign with nsec → Publish to relays → Store event ID
```

**Nostr Event Details:**
- **Kind:** `31111` (Replaceable receipt event)
- **Tags:**
  - `["d", receiptCode]` - Unique identifier for querying
  - `["t", "receipt"]` - Type tag
  - `["t", "public"]` - Public visibility
  - `["order", orderId]` - Order reference
  - `["amount", total]` - Amount
  - `["currency", "LAK"]` - Currency
  - `["expiration", timestamp]` - 90 day TTL
- **Content:** Plain JSON (NOT encrypted - see security section)
- **Pubkey Source:** Checks 3 locations:
  1. `auth.user.value?.nostrPubkey` (Hasura users with linked Nostr)
  2. `nostrStorage.loadCurrentUser()` (nsec in localStorage) ✅
  3. `nostr-pubkey` cookie (NIP-07 extension users)

**Files:**
- [app/composables/use-receipt-generator.ts](../app/composables/use-receipt-generator.ts) (lines 121-166)

---

### 3. Receipt Scanning (Customer)
```
Scan QR → Open URL → Fetch from Nostr → Verify & Display
```

**What happens:**
1. Customer scans QR code on their phone
2. Browser opens: `/receipt/{id}?code={code}`
3. Receipt page checks:
   - **localStorage first** (if same device)
   - **Nostr relays** (if different device)
4. Verifies:
   - Receipt ID matches URL
   - Verification code matches
   - Receipt not expired (< 90 days)
5. Displays receipt or shows error

**Files:**
- [app/pages/receipt/[id].vue](../app/pages/receipt/[id].vue)

---

### 4. Receipt Fetching (Nostr Query)
```
Query by code → Parse event → Save to localStorage → Return receipt
```

**Query:**
```javascript
{
  kinds: [31111],
  "#d": [receiptCode], // "REC-3RZG-REB2"
  limit: 1
}
```

**Files:**
- [app/composables/use-receipt-generator.ts](../app/composables/use-receipt-generator.ts) (lines 192-221)

---

## Security & Encryption

### Why Receipts Are NOT Encrypted

**Receipts are intentionally public** because:
1. ✅ Customers need to view them without authentication
2. ✅ Anyone with the QR code should be able to access the receipt
3. ✅ Receipts are proof of purchase (like paper receipts)
4. ✅ Simpler UX - no login required

### Security Measures

#### 1. Verification Code (Security through Obscurity)
- **Format:** `REC-XXXX-XXXX` (human-readable, unique)
- **Purpose:** Prevents guessing receipt URLs
- **Requirement:** Must be included in URL to view receipt

#### 2. Data Minimization
**Sensitive data is truncated or excluded:**
- ✅ Payment hash: Only first 16 characters included
- ✅ Customer personal data: Not included in receipt
- ✅ Full transaction details: Kept in encrypted order events (kind 30078)

#### 3. Expiration
- **90-day retention** policy
- Receipts auto-expire after 90 days
- Reduces long-term exposure

#### 4. Private Order Events (Encrypted)
**Separate from public receipts:**
- Merchant's full order data is stored in **encrypted** events
- Uses NIP-44 encryption
- Only accessible with merchant's private key
- Includes: customer info, notes, internal IDs, etc.

---

## Security Recommendations

### 🔒 1. Protect Your Private Key (nsec)

**Current:** Your nsec is stored in **localStorage**

**Risk:**
- ❌ Can be accessed by malicious JavaScript
- ❌ Can be stolen by XSS attacks
- ❌ Stored in plaintext

**Recommendation:**
Use a **NIP-07 Nostr extension** instead:

#### Option A: Alby Extension (Recommended)
1. Install [Alby](https://getalby.com/)
2. Set up your Nostr key in Alby
3. Sign out of POS
4. Sign in with "Connect with Alby"
5. **Delete nsec from localStorage**

**Benefits:**
- ✅ Private key never exposed to website
- ✅ Signing happens in secure extension
- ✅ Protected by browser sandbox
- ✅ Can approve/reject each signing request

#### Option B: nos2x Extension
1. Install [nos2x](https://github.com/fiatjaf/nos2x)
2. Configure your nsec in nos2x
3. Sign in with "Connect with nos2x"

---

### 🔒 2. Receipt Data Security

**What's in a public receipt:**
```json
{
  "id": "REC-...",
  "merchantName": "Your Shop",
  "items": [...],
  "total": 50000,
  "paymentMethod": "lightning",
  "paymentProof": {
    "paymentHash": "abc123..." // TRUNCATED (first 16 chars only)
  }
}
```

**What's NOT included:**
- ❌ Customer name, email, phone
- ❌ Full payment hash
- ❌ Internal order IDs
- ❌ Staff notes
- ❌ Customer address

**Full order data** is stored separately in **encrypted** events that only you can decrypt.

---

### 🔒 3. Relay Security

**Current Setup:**
- Receipts are published to **public Nostr relays**
- Anyone can query receipts (but needs verification code)

**Considerations:**
- ✅ Decentralized (no single point of failure)
- ✅ Censorship-resistant
- ⚠️ Relay operators can see receipt data
- ⚠️ Receipt data is not encrypted

**If you need more privacy:**
1. Use **private relays** (requires auth)
2. Add **encryption** to receipt content (but breaks customer UX)
3. Use **shorter expiration** (e.g., 7 days instead of 90)

---

### 🔒 4. QR Code Security

**Current:**
- QR code contains: `/receipt/{id}?code={code}`
- Verification code acts as password

**Recommendations:**
- ✅ Only display QR to customer (don't print publicly)
- ✅ Don't share receipt URLs publicly
- ✅ Consider SMS/email delivery instead of QR for sensitive transactions

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    POS PAYMENT COMPLETE                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        v
┌─────────────────────────────────────────────────────────────┐
│              Generate Receipt (EReceipt)                     │
│  - Receipt ID: 019b8261-f60d...                             │
│  - Code: REC-3RZG-REB2                                      │
│  - Items, total, merchant info                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        v
                   ┌────┴────┐
                   │         │
         ┌─────────┘         └─────────┐
         v                               v
┌────────────────┐              ┌────────────────┐
│  localStorage  │              │  Nostr Relays  │
│   (Same Device)│              │ (Cross-Device) │
└────────────────┘              └───────┬────────┘
         │                               │
         │                               │
         │    ┌─────────────────────┐   │
         └────►   Generate QR Code  ◄───┘
              │  /receipt/{id}?code │
              └──────────┬──────────┘
                         │
                         v
              ┌──────────────────────┐
              │  Customer Scans QR   │
              └──────────┬───────────┘
                         │
                         v
              ┌──────────────────────┐
              │   Receipt Page       │
              │  1. Check localStorage│
              │  2. Fetch from Nostr │
              │  3. Verify code      │
              │  4. Display receipt  │
              └──────────────────────┘
```

---

## File Reference

### Core Files
- **Receipt Generator:** [app/composables/use-receipt-generator.ts](../app/composables/use-receipt-generator.ts)
- **Receipt Page:** [app/pages/receipt/[id].vue](../app/pages/receipt/[id].vue)
- **Receipt Composable:** [app/composables/use-receipt.ts](../app/composables/use-receipt.ts)
- **POS Payment:** [app/pages/pos/index.vue](../app/pages/pos/index.vue)

### Supporting Files
- **Nostr Data Layer:** [app/composables/use-nostr-data.ts](../app/composables/use-nostr-data.ts)
- **Nostr Relay:** [app/composables/use-nostr-relay.ts](../app/composables/use-nostr-relay.ts)
- **Nostr Storage:** [app/composables/use-nostr-storage.ts](../app/composables/use-nostr-storage.ts)
- **Nostr Kinds:** [app/types/nostr-kinds.ts](../app/types/nostr-kinds.ts)

---

## Troubleshooting

### Issue: "Receipt not found or expired"
**Cause:** Receipt was not published to Nostr

**Solution:**
1. Check console for errors during payment
2. Verify user has Nostr pubkey (nsec in localStorage OR extension)
3. Check relay connectivity
4. Ensure receipt was created within 90 days

### Issue: "No user pubkey - skipping Nostr publish"
**Cause:** Not logged in with Nostr credentials

**Solution:**
1. Sign out
2. Sign in with Nostr (extension or nsec)
3. OR link Nostr to existing account

### Issue: "Receipt ID mismatch"
**Cause:** Receipt fetched doesn't match URL

**Solution:**
- This indicates a data corruption issue
- Check relay data integrity
- Verify QR code generation

---

## Next Steps

### Recommended Improvements

1. **Security:**
   - [ ] Migrate from localStorage nsec to NIP-07 extension
   - [ ] Add option for encrypted receipts (for high-value transactions)
   - [ ] Implement receipt signing (verify authenticity)

2. **Features:**
   - [ ] Email/SMS receipt delivery
   - [ ] PDF receipt generation
   - [ ] Receipt search by date/amount
   - [ ] Multi-relay publishing (redundancy)

3. **UX:**
   - [ ] Offline receipt viewing
   - [ ] Receipt history for customers
   - [ ] Receipt templates (different styles)

---

**Last Updated:** 2026-01-03
**Author:** Claude Code
**Status:** Production Ready ✅
