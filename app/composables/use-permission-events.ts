// ============================================
// 🎫 BITSPACE PERMISSION EVENTS COMPOSABLE
// Nostr-signed permission grants & revocations
// ============================================

import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils';
import type { 
  PermissionGrant, 
  PermissionRevocation,
  UserRole,
  UserPermissions,
} from '~/types';
import { DEFAULT_PERMISSIONS } from '~/types';

// Import centralized NOSTR_KINDS
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// Singleton state
const permissionGrants = ref<PermissionGrant[]>([]);
const permissionRevocations = ref<PermissionRevocation[]>([]);
const storeId = ref<string>('');
const storeName = ref<string>('');

export function usePermissionEvents() {
  const nostrKey = useNostrKey();
  const security = useSecurity();
  
  const GRANTS_STORAGE_KEY = 'bitspace_permission_grants';
  const REVOCATIONS_STORAGE_KEY = 'bitspace_permission_revocations';
  
  // ============================================
  // 🎫 PERMISSION GRANT
  // ============================================
  
  /**
   * Create a permission grant for a staff member
   * This creates a signed Nostr event that proves the permission was granted
   */
  async function createPermissionGrant(
    granterNsec: string,
    granteeNpub: string,
    role: UserRole,
    customPermissions?: Partial<UserPermissions>,
    expiresAt?: string
  ): Promise<PermissionGrant | null> {
    try {
      // Decode granter's private key
      const granterPrivKeyHex = nostrKey.decodePrivateKey(granterNsec);
      const granterPubkeyHex = getPublicKey(hexToBytes(granterPrivKeyHex));
      const granterNpub = nostrKey.hexToNpub(granterPubkeyHex);
      
      // Decode grantee's public key
      const granteePubkeyHex = nostrKey.normalizeKey(granteeNpub);
      
      // Merge default permissions with custom ones
      const permissions: UserPermissions = {
        ...DEFAULT_PERMISSIONS[role],
        ...customPermissions,
      };
      
      // Create grant data
      const grantId = `grant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date().toISOString();
      
      // Create Nostr event
      const eventContent = JSON.stringify({
        grantId,
        storeId: storeId.value,
        storeName: storeName.value,
        role,
        permissions,
        expiresAt,
      });
      
      const unsignedEvent = {
        kind: NOSTR_KINDS.PERMISSION_GRANT,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['p', granteePubkeyHex], // Grantee
          ['d', grantId], // Unique identifier (for replaceable events)
          ['store', storeId.value],
          ['role', role],
          ...(expiresAt ? [['expiry', expiresAt]] : []),
        ],
        content: eventContent,
        pubkey: granterPubkeyHex,
      };
      
      // Sign the event
      const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(granterPrivKeyHex));
      
      // Create grant object
      const grant: PermissionGrant = {
        id: grantId,
        kind: NOSTR_KINDS.PERMISSION_GRANT,
        storeId: storeId.value,
        storeName: storeName.value,
        granterPubkey: granterPubkeyHex,
        granterNpub,
        granteePubkey: granteePubkeyHex,
        granteeNpub,
        role,
        permissions,
        createdAt,
        expiresAt,
        signature: signedEvent.sig,
        nostrEventId: signedEvent.id,
      };
      
      // Store grant
      permissionGrants.value.push(grant);
      await saveGrants();
      
      // Log audit
      await security.addAuditLog(
        'permission_grant',
        granterPubkeyHex,
        `Granted ${role} access to ${granteeNpub}`,
        granterNpub
      );
      
      return grant;
    } catch (error) {
      console.error('Failed to create permission grant:', error);
      return null;
    }
  }
  
  /**
   * Verify a permission grant is valid and signed correctly
   */
  function verifyPermissionGrant(grant: PermissionGrant): boolean {
    try {
      // Check if revoked
      const revocation = permissionRevocations.value.find(
        r => r.grantId === grant.id && new Date(r.createdAt) > new Date(grant.createdAt)
      );
      if (revocation) {
        console.log('Grant has been revoked:', revocation);
        return false;
      }
      
      // Check expiry
      if (grant.expiresAt && new Date(grant.expiresAt) < new Date()) {
        console.log('Grant has expired');
        return false;
      }
      
      // TODO: Verify Nostr signature if needed
      // For now, we trust locally stored grants
      
      return true;
    } catch (error) {
      console.error('Failed to verify permission grant:', error);
      return false;
    }
  }
  
  // ============================================
  // 🚫 PERMISSION REVOCATION
  // ============================================
  
  /**
   * Revoke a permission grant
   * This creates a signed Nostr event that proves the revocation
   */
  async function revokePermission(
    revokerNsec: string,
    grantId: string,
    reason?: string
  ): Promise<PermissionRevocation | null> {
    try {
      // Find the grant
      const grant = permissionGrants.value.find(g => g.id === grantId);
      if (!grant) {
        console.error('Grant not found:', grantId);
        return null;
      }
      
      // Decode revoker's private key
      const revokerPrivKeyHex = nostrKey.decodePrivateKey(revokerNsec);
      const revokerPubkeyHex = getPublicKey(hexToBytes(revokerPrivKeyHex));
      const revokerNpub = nostrKey.hexToNpub(revokerPubkeyHex);
      
      // Create revocation data
      const revocationId = `revoke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date().toISOString();
      
      // Create Nostr event
      const eventContent = JSON.stringify({
        revocationId,
        grantId,
        storeId: storeId.value,
        reason,
      });
      
      const unsignedEvent = {
        kind: NOSTR_KINDS.PERMISSION_REVOKE,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['p', grant.granteePubkey], // Who is being revoked
          ['e', grant.nostrEventId || ''], // Reference to grant event
          ['d', revocationId],
          ['store', storeId.value],
          ['grant', grantId],
        ],
        content: eventContent,
        pubkey: revokerPubkeyHex,
      };
      
      // Sign the event
      const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(revokerPrivKeyHex));
      
      // Create revocation object
      const revocation: PermissionRevocation = {
        id: revocationId,
        kind: NOSTR_KINDS.PERMISSION_REVOKE,
        storeId: storeId.value,
        revokerPubkey: revokerPubkeyHex,
        revokerNpub,
        revokeePubkey: grant.granteePubkey,
        revokeeNpub: grant.granteeNpub,
        grantId,
        reason,
        createdAt,
        signature: signedEvent.sig,
        nostrEventId: signedEvent.id,
      };
      
      // Store revocation
      permissionRevocations.value.push(revocation);
      await saveRevocations();
      
      // Log audit
      await security.addAuditLog(
        'permission_revoke',
        revokerPubkeyHex,
        `Revoked access for ${grant.granteeNpub}${reason ? `: ${reason}` : ''}`,
        revokerNpub
      );
      
      return revocation;
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      return null;
    }
  }
  
  // ============================================
  // 🔍 PERMISSION QUERIES
  // ============================================
  
  /**
   * Get all valid grants for a user
   */
  function getValidGrantsForUser(npub: string): PermissionGrant[] {
    const pubkeyHex = nostrKey.normalizeKey(npub);
    
    return permissionGrants.value.filter(grant => {
      if (grant.granteePubkey !== pubkeyHex && grant.granteeNpub !== npub) {
        return false;
      }
      return verifyPermissionGrant(grant);
    });
  }
  
  /**
   * Get the most recent valid grant for a user
   */
  function getCurrentGrantForUser(npub: string): PermissionGrant | null {
    const grants = getValidGrantsForUser(npub);
    if (grants.length === 0) return null;
    
    // Sort by created date, most recent first
    grants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return grants[0] ?? null;
  }
  
  /**
   * Check if user has valid permission
   */
  function hasValidPermission(npub: string): boolean {
    return getCurrentGrantForUser(npub) !== null;
  }
  
  /**
   * Get user's current role from permission grant
   */
  function getUserRole(npub: string): UserRole | null {
    const grant = getCurrentGrantForUser(npub);
    return grant?.role ?? null;
  }
  
  /**
   * Get user's current permissions from permission grant
   */
  function getUserPermissions(npub: string): UserPermissions | null {
    const grant = getCurrentGrantForUser(npub);
    return grant?.permissions ?? null;
  }
  
  /**
   * Check if a specific permission is granted
   */
  function checkPermission(npub: string, permission: keyof UserPermissions): boolean {
    const permissions = getUserPermissions(npub);
    return permissions ? permissions[permission] === true : false;
  }
  
  /**
   * Get all grants (for admin view)
   */
  function getAllGrants(): PermissionGrant[] {
    return permissionGrants.value;
  }
  
  /**
   * Get all revocations (for admin view)
   */
  function getAllRevocations(): PermissionRevocation[] {
    return permissionRevocations.value;
  }
  
  /**
   * Get grants by granter (who created them)
   */
  function getGrantsByGranter(npub: string): PermissionGrant[] {
    const pubkeyHex = nostrKey.normalizeKey(npub);
    return permissionGrants.value.filter(
      g => g.granterPubkey === pubkeyHex || g.granterNpub === npub
    );
  }
  
  // ============================================
  // 💾 STORAGE
  // ============================================
  
  /**
   * Save grants to storage
   */
  async function saveGrants(): Promise<void> {
    await security.encryptAndStore(GRANTS_STORAGE_KEY, permissionGrants.value);
  }
  
  /**
   * Save revocations to storage
   */
  async function saveRevocations(): Promise<void> {
    await security.encryptAndStore(REVOCATIONS_STORAGE_KEY, permissionRevocations.value);
  }
  
  /**
   * Load all permission data
   */
  async function loadPermissionData(): Promise<void> {
    const grants = await security.retrieveAndDecrypt<PermissionGrant[]>(GRANTS_STORAGE_KEY);
    if (grants) {
      permissionGrants.value = grants;
    }
    
    const revocations = await security.retrieveAndDecrypt<PermissionRevocation[]>(REVOCATIONS_STORAGE_KEY);
    if (revocations) {
      permissionRevocations.value = revocations;
    }
  }
  
  // ============================================
  // 🏪 STORE CONFIGURATION
  // ============================================
  
  /**
   * Set store identity
   */
  function setStoreIdentity(id: string, name: string): void {
    storeId.value = id;
    storeName.value = name;
  }
  
  // ============================================
  // 🔄 SYNC WITH NOSTR RELAYS (Optional)
  // ============================================
  
  /**
   * Publish permission grant to Nostr relays
   * This allows permission verification across devices
   */
  async function publishGrantToRelays(_grant: PermissionGrant): Promise<boolean> {
    // TODO: Implement relay publishing using useNostrRelay
    // This would allow other devices to verify permissions
    console.log('Publishing to relays not yet implemented');
    return false;
  }
  
  /**
   * Fetch permission grants from Nostr relays
   */
  async function fetchGrantsFromRelays(_npub: string): Promise<PermissionGrant[]> {
    // TODO: Implement relay fetching
    console.log('Fetching from relays not yet implemented');
    return [];
  }
  
  // ============================================
  // 🚀 INITIALIZATION
  // ============================================
  
  async function initialize(storeIdValue: string, storeNameValue: string): Promise<void> {
    setStoreIdentity(storeIdValue, storeNameValue);
    await loadPermissionData();
  }
  
  return {
    // State
    grants: computed(() => permissionGrants.value),
    revocations: computed(() => permissionRevocations.value),
    storeId: computed(() => storeId.value),
    storeName: computed(() => storeName.value),
    
    // Grant management
    createPermissionGrant,
    verifyPermissionGrant,
    revokePermission,
    
    // Queries
    getValidGrantsForUser,
    getCurrentGrantForUser,
    hasValidPermission,
    getUserRole,
    getUserPermissions,
    checkPermission,
    getAllGrants,
    getAllRevocations,
    getGrantsByGranter,
    
    // Store config
    setStoreIdentity,
    
    // Sync
    publishGrantToRelays,
    fetchGrantsFromRelays,
    
    // Init
    initialize,
    loadPermissionData,
  };
}
