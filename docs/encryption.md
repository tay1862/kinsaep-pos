# 🔐 bnos.space - Encryption System Documentation

## Overview

bnos.space uses enterprise-grade encryption to protect sensitive business data. The system supports multiple encryption algorithms for different use cases.

---

## 📊 Supported Encryption Algorithms

### 1. AES-256-GCM (Primary - Local Data)

| Property      | Value                                                  |
| ------------- | ------------------------------------------------------ |
| **Algorithm** | AES-256-GCM                                            |
| **Key Size**  | 256-bit                                                |
| **IV Size**   | 96-bit (12 bytes)                                      |
| **Mode**      | Galois/Counter Mode                                    |
| **Security**  | Authenticated encryption (confidentiality + integrity) |

**Use Cases:**

- Local database encryption (IndexedDB/Dexie)
- Secure localStorage
- Sensitive field encryption (email, phone, address, etc.)

**Example:**

```typescript
const encryption = useEncryption();

// Encrypt data
const result = await encryption.encrypt(sensitiveData, {
  algorithm: "aes-256-gcm",
});

// Decrypt data
const decrypted = await encryption.decrypt(encryptedEnvelope);
```

---

### 2. NIP-44 (Nostr - Modern Standard)

| Property         | Value                               |
| ---------------- | ----------------------------------- |
| **Algorithm**    | NIP-44 v2                           |
| **Key Exchange** | secp256k1 ECDH                      |
| **Encryption**   | ChaCha20-Poly1305                   |
| **Padding**      | Variable (prevents length analysis) |

**Use Cases:**

- Syncing encrypted data to Nostr relays
- Multi-device synchronization
- Sharing data between users/devices

**Example:**

```typescript
// Encrypt for Nostr relay
const result = await encryption.encrypt(data, {
  algorithm: "nip-44",
  nostrPrivkey: myPrivateKey,
  nostrPubkey: recipientPublicKey,
});

// Decrypt from Nostr relay
const decrypted = await encryption.decrypt(envelope, {
  nostrPrivkey: myPrivateKey,
  nostrPubkey: senderPublicKey,
});
```

---

### 2.5 Company Code Encryption (Cross-Device Sync)

| Property           | Value                       |
| ------------------ | --------------------------- |
| **Algorithm**      | AES-256-GCM                 |
| **Version**        | v4                          |
| **Key Derivation** | PBKDF2 (100,000 iterations) |
| **IV**             | Random 12 bytes             |

**Use Cases:**

- 🔄 Cross-device data sync (products, categories)
- 👥 Staff access without owner login
- 📱 Multi-terminal support

**How It Works:**

```
Company Code (6 digits) → PBKDF2 → AES-256 Key → Encrypt/Decrypt
```

**Example:**

```typescript
const company = useCompany();

// Encrypt
const encrypted = await company.encryptWithCode(data, companyCode);

// Decrypt
const decrypted = await company.decryptWithCode(encrypted, companyCode);
```

**Payload Format:**

```json
{ "v": 4, "cc": "<base64_encrypted>" }
```

> ⚠️ **Security**: Anyone with the company code can decrypt. Protect it like a password.

---

### 3. NIP-04 (Nostr - Legacy Standard)

| Property         | Value                             |
| ---------------- | --------------------------------- |
| **Algorithm**    | NIP-04                            |
| **Key Exchange** | secp256k1 ECDH                    |
| **Encryption**   | AES-256-CBC                       |
| **Status**       | Legacy (use NIP-44 when possible) |

**Use Cases:**

- Backward compatibility with older Nostr clients
- Legacy relay support

---

### 4. PBKDF2 (Password Derivation)

| Property       | Value       |
| -------------- | ----------- |
| **Algorithm**  | PBKDF2      |
| **Hash**       | SHA-256     |
| **Iterations** | 100,000     |
| **Output**     | 256-bit key |

**Use Cases:**

- Derive encryption keys from passwords
- User authentication
- Master key derivation

---

## 🔑 Key Management

### Key Types

| Type      | Purpose                      | Storage                   |
| --------- | ---------------------------- | ------------------------- |
| `master`  | Root key for deriving others | Encrypted in localStorage |
| `data`    | Encrypting business data     | Memory + secure backup    |
| `session` | Temporary session encryption | Memory only               |
| `backup`  | Key export/import            | User-controlled           |

### Key Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                    KEY LIFECYCLE                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Generate Key (Web Crypto API)                       │
│         ↓                                               │
│  2. Store Key ID + Encrypted Key                        │
│         ↓                                               │
│  3. Use for Encryption/Decryption                       │
│         ↓                                               │
│  4. Rotate Key (recommended: every 90 days)             │
│         ↓                                               │
│  5. Re-encrypt data with new key                        │
│         ↓                                               │
│  6. Archive old key (30-day grace period)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Viewing Current Encryption Key

You can view the current encryption key ID in the **Settings > Security** page:

```typescript
const encryption = useEncryption();

// Get current key ID
const keyId = encryption.currentKeyId.value;

// Export key for backup (owner only)
const keyHex = await encryption.exportKey(keyId);
```

> ⚠️ **Security Warning**: Only `owner` role can export encryption keys. Store exported keys securely offline.

---

## 🏢 Storing Company Key on Nostr

Yes! You can store your company's encryption key on Nostr relays for backup and multi-device sync.

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│           COMPANY KEY STORAGE ON NOSTR                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Export company data key                             │
│         ↓                                               │
│  2. Encrypt key with owner's Nostr key (NIP-44)         │
│         ↓                                               │
│  3. Publish as encrypted Nostr event (kind: 30078)      │
│         ↓                                               │
│  4. Store on multiple relays for redundancy             │
│                                                         │
│  Recovery:                                              │
│  1. Fetch encrypted event from relay                    │
│  2. Decrypt with owner's Nostr key                      │
│  3. Import key into new device                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// Store company key on Nostr
async function backupCompanyKeyToNostr() {
  const encryption = useEncryption();
  const nostrKey = useNostrKey();
  const nostrStorage = useNostrStorage();

  // 1. Export the data key
  const keyId = encryption.currentKeyId.value;
  const keyHex = await encryption.exportKey(keyId);

  // 2. Encrypt with owner's Nostr key (to self)
  const ownerPubkey = nostrKey.publicKey.value;
  const ownerPrivkey = nostrKey.privateKey.value;

  const encryptedKey = await encryption.encrypt(
    { keyId, keyHex, createdAt: new Date().toISOString() },
    {
      algorithm: "nip-44",
      nostrPrivkey: ownerPrivkey,
      nostrPubkey: ownerPubkey, // Encrypt to self
    }
  );

  // 3. Store on Nostr (kind 30078 = application-specific data)
  await nostrStorage.saveEncryptedData(
    "company:encryption:key",
    encryptedKey.data
  );
}

// Recover company key from Nostr
async function recoverCompanyKeyFromNostr() {
  const encryption = useEncryption();
  const nostrKey = useNostrKey();
  const nostrStorage = useNostrStorage();

  // 1. Fetch from Nostr
  const encryptedKey = await nostrStorage.loadEncryptedData(
    "company:encryption:key"
  );

  // 2. Decrypt with owner's Nostr key
  const decrypted = await encryption.decrypt(encryptedKey, {
    nostrPrivkey: nostrKey.privateKey.value,
    nostrPubkey: nostrKey.publicKey.value,
  });

  // 3. Import key
  const { keyId, keyHex } = decrypted.data;
  await encryption.importKey(keyHex, keyId);
}
```

### Nostr Event Structure for Key Backup

```json
{
  "kind": 30078,
  "pubkey": "<owner_pubkey>",
  "created_at": 1733500800,
  "tags": [
    ["d", "bitspace:company:key"],
    ["client", "bitspace-pos"]
  ],
  "content": "<NIP-44 encrypted key data>",
  "sig": "<signature>"
}
```

---

## 🛡️ Security Best Practices

### Do's ✅

1. **Regular Key Rotation** - Rotate keys every 90 days
2. **Backup Keys** - Store encrypted backup on Nostr + offline
3. **Use Strong Passwords** - For password-derived keys
4. **Role-Based Access** - Only owner can export keys
5. **Multi-Relay Backup** - Store on 3+ Nostr relays

### Don'ts ❌

1. **Never share raw keys** - Always encrypt before sharing
2. **Never store keys in plain text** - Always encrypted
3. **Never skip key rotation** - Old keys are security risks
4. **Never use weak PINs** - Min 6 digits, no patterns

---

## 📊 Encrypted Data Envelope

All encrypted data is wrapped in a standard envelope:

```typescript
interface EncryptedEnvelope {
  ciphertext: string; // Base64 encoded encrypted data
  iv?: string; // Initialization vector (AES-GCM)
  tag?: string; // Authentication tag (AES-GCM)
  algorithm: "aes-256-gcm" | "nip-04" | "nip-44";
  keyId?: string; // Which key was used
  version: number; // Protocol version (1 or 2)
  encryptedAt: string; // ISO timestamp
}
```

---

## 🔒 Sensitive Fields (Auto-Encrypted)

These fields are automatically encrypted when storing:

| Field         | Description             |
| ------------- | ----------------------- |
| `email`       | Customer/user email     |
| `phone`       | Phone numbers           |
| `address`     | Physical addresses      |
| `notes`       | Any notes/comments      |
| `lud16`       | Lightning address       |
| `nostrPubkey` | Nostr public keys       |
| `bankAccount` | Bank account numbers    |
| `taxId`       | Tax identification      |
| `ssn`         | Social security numbers |
| `creditCard`  | Card numbers            |
| `pin`         | User PINs               |
| `password`    | Password hashes         |

---

## 👥 Role-Based Encryption Access

| Role    | Can Encrypt | Can Decrypt   | Can Export Key | Can Rotate Key |
| ------- | ----------- | ------------- | -------------- | -------------- |
| Owner   | ✅          | ✅            | ✅             | ✅             |
| Admin   | ✅          | ✅            | ❌             | ❌             |
| Cashier | ✅          | ✅ (own data) | ❌             | ❌             |
| Staff   | ✅          | ✅ (own data) | ❌             | ❌             |

---

## 🔄 Key Rotation Process

```typescript
const encryption = useEncryption();

// 1. Rotate key (creates new key, marks old as inactive)
const { newKeyId } = await encryption.rotateKey(oldKeyId);

// 2. Re-encrypt existing data (background process)
for (const record of allRecords) {
  if (record.encryptedData) {
    const reEncrypted = await encryption.reEncrypt(
      record.encryptedData,
      newKeyId
    );
    await saveRecord({ ...record, encryptedData: reEncrypted.data });
  }
}

// 3. Old key remains valid for 30 days (for any missed data)
```

---

## 📱 Multi-Device Sync Flow

```
┌─────────────────────────────────────────────────────────┐
│              MULTI-DEVICE ENCRYPTION FLOW               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Device A (Owner)                                       │
│  ├─ Has master encryption key                           │
│  ├─ Encrypts data with AES-256-GCM                      │
│  ├─ Re-encrypts with NIP-44 for sync                    │
│  └─ Publishes to Nostr relays                           │
│                                                         │
│  Nostr Relay                                            │
│  └─ Stores encrypted events (kind 30078)                │
│                                                         │
│  Device B (Admin/Staff)                                 │
│  ├─ Fetches encrypted events from relay                 │
│  ├─ Decrypts with shared company key                    │
│  └─ Re-encrypts locally with AES-256-GCM                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🆘 Recovery Scenarios

### Lost Device

1. Login on new device with Nostr key (nsec)
2. System fetches encrypted company key from relay
3. Decrypt and restore all data

### Forgot Password (Password Auth Users)

1. Owner resets password via admin panel
2. New PBKDF2 derived key generated
3. User data re-encrypted with new key

### Key Compromise

1. Immediately rotate all keys
2. Re-encrypt all data with new keys
3. Revoke compromised user access
4. Audit access logs

---

## 📚 API Reference

### `useEncryption()`

```typescript
const encryption = useEncryption();

// State
encryption.isInitialized; // Readonly<Ref<boolean>>
encryption.currentKeyId; // Readonly<Ref<string | null>>
encryption.error; // Readonly<Ref<string | null>>

// Key Management
await encryption.generateKey(type); // Generate new key
await encryption.deriveKeyFromPassword(pwd); // Derive from password
await encryption.importKey(hexKey, keyId); // Import key
await encryption.exportKey(keyId); // Export key (owner only)
await encryption.rotateKey(oldKeyId); // Rotate key

// Encryption
await encryption.encrypt(data, options); // Encrypt any data
await encryption.decrypt(envelope, options); // Decrypt envelope

// Sensitive Fields
await encryption.encryptSensitiveFields(obj); // Auto-encrypt fields
await encryption.decryptSensitiveFields(obj); // Auto-decrypt fields

// Secure Storage
await encryption.secureStore(key, data); // Store encrypted
await encryption.secureRetrieve(key); // Retrieve & decrypt
encryption.secureRemove(key); // Remove encrypted data
```

---

## 🔗 Related Documentation

- [User Roles & Permissions](./roles.md)
- [Nostr Integration](./nostr.md)
- [Security Best Practices](./security.md)
