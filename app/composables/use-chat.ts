// ============================================
// 💬 EMPLOYEE CHAT COMPOSABLE
// Real-time messaging with Nostr + Dexie
// End-to-end encrypted communication
// ============================================

import { nip04 } from "nostr-tools";
import type { Event as NostrEvent, VerifiedEvent } from "nostr-tools";
import { hexToBytes } from "@noble/hashes/utils";
import {
  db,
  type ChatMessageRecord,
  type ChatConversationRecord,
} from "~/db/db";
import type { StoreUser } from "~/types";
import CryptoJS from "crypto-js";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// ============================================
// Types
// ============================================

export interface MessageReaction {
  emoji: string;
  pubkey: string;
  name: string;
  timestamp: number;
  eventId: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderPubkey: string;
  senderName: string;
  senderAvatar?: string;
  recipientPubkey: string;
  content: string;
  timestamp: number;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  replyToId?: string;
  replyToContent?: string;
  replyToSender?: string;
  nostrEventId?: string;
  reactions?: Map<string, MessageReaction[]>;
}

export interface ChatConversation {
  id: string;
  type: "direct" | "channel" | "group";
  participants: { pubkey: string; name: string; avatar?: string }[];
  groupName?: string;
  groupAvatar?: string;
  lastMessage: {
    content: string;
    timestamp: number;
    senderName: string;
  };
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isPrivate?: boolean;
  key?: string;
  // NEW: Shop/Team Context
  shopId?: string; // Filter by specific shop
  scope?: "shop" | "company" | "department"; // Channel visibility level
  tags?: string[]; // Categorization tags (e.g., ['sales', 'kitchen'])
  isReadOnly?: boolean; // For announcement channels
  memberPubkeys?: string[]; // Private channel members list
}

export interface ChatContact {
  id: string;
  name: string;
  pubkey: string;
  avatar?: string;
  isOnline?: boolean;
}

// ============================================
// Singleton State
// ============================================

const conversations = ref<ChatConversation[]>([]);
const messages = ref<Map<string, ChatMessage[]>>(new Map());
const activeConversationId = ref<string | null>(null);
const isLoading = ref(false);
const _isSending = ref(false);
const _isOpen = ref(false);
const _searchQuery = ref("");
// Nested Map: conversationId -> pubkey -> { name, timestamp }
const typingUsers = ref<
  Map<string, Map<string, { name: string; timestamp: number }>>
>(new Map());

// Pagination state: track oldest message timestamp per conversation
const oldestMessageTimestamp = ref<Map<string, number>>(new Map());
const hasMoreMessages = ref<Map<string, boolean>>(new Map());
const isLoadingMore = ref(false);

// Real-time subscription reference
let chatSubscription: { close: () => void } | null = null;

// Typing indicator state
let typingTimeout: NodeJS.Timeout | null = null;
let lastTypingTime = 0;

// ============================================
// Composable
// ============================================

export function useChat() {
  const { $nostr } = useNuxtApp();
  const usersStore = useUsers();
  const nostrKey = useNostrKey();
  const sound = useSound();
  const { DEFAULT_RELAYS } = useNostrRelay();
  const nostrData = useNostrData();
  const company = useCompany();

  // ============================================
  // State
  // ============================================

  const isOpen = useState("chat-is-open", () => false);
  const isSending = ref(false);
  const searchQuery = ref("");

  const openChat = () => (isOpen.value = true);
  const closeChat = () => (isOpen.value = false);
  const toggleChat = () => (isOpen.value = !isOpen.value);

  // ============================================
  // Computed
  // ============================================

  const unreadCount = computed(() => {
    return conversations.value.reduce((sum, c) => sum + c.unreadCount, 0);
  });

  const activeConversation = computed(() => {
    return conversations.value.find((c) => c.id === activeConversationId.value);
  });

  const activeMessages = computed(() => {
    if (!activeConversationId.value) return [];
    return messages.value.get(activeConversationId.value) || [];
  });

  const filteredConversations = computed(() => {
    if (!searchQuery.value) return conversations.value;
    const query = searchQuery.value.toLowerCase();
    return conversations.value.filter((c) => {
      const namMatch = c.participants.some((p) =>
        p.name.toLowerCase().includes(query)
      );
      const msgMatch = c.lastMessage.content.toLowerCase().includes(query);
      const grpMatch = c.groupName?.toLowerCase().includes(query);
      return namMatch || msgMatch || grpMatch;
    });
  });

  const sortedConversations = computed(() => {
    return [...filteredConversations.value].sort((a, b) => {
      // Pinned first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by last message time
      return b.lastMessage.timestamp - a.lastMessage.timestamp;
    });
  });

  // Available contacts (staff members)
  const availableContacts = computed<ChatContact[]>(() => {
    const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
    return usersStore.users.value
      .filter(
        (u) =>
          u.pubkeyHex && u.pubkeyHex !== currentPubkey && u.isActive !== false
      )
      .map((u) => ({
        id: u.id,
        name: u.name,
        pubkey: u.pubkeyHex!,
        avatar: u.avatar,
        isOnline: true, // TODO: Implement presence
      }));
  });

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * Get current user's Nostr keys from localStorage
   * Similar to getUserKeys() in use-nostr-data.ts
   */
  const getUserKeys = (): { pubkey: string; privkey: string | null } | null => {
    if (!import.meta.client) return null;

    // 1. Try nostrUser localStorage (users who logged in with nsec)
    const stored = localStorage.getItem("nostrUser");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const pubkey = user.pubkey || user.publicKey;
        const privkey = user.privateKey || user.privkey || user.nsec;
        if (pubkey) {
          return { pubkey, privkey: privkey || null };
        }
      } catch {
        // Continue to fallback
      }
    }

    // 2. Try current user from composable
    const currentUser = usersStore.currentUser.value;
    if (currentUser?.pubkeyHex) {
      return { pubkey: currentUser.pubkeyHex, privkey: null };
    }

    // 3. Try nostr-pubkey cookie (for NIP-07 extension users)
    const nostrCookie = useCookie("nostr-pubkey");
    if (nostrCookie.value) {
      return { pubkey: nostrCookie.value, privkey: null };
    }

    return null;
  };

  const generateConversationId = (pubkey1: string, pubkey2: string): string => {
    // Sort pubkeys to ensure consistent ID regardless of who starts chat
    const sorted = [pubkey1, pubkey2].sort();
    return `dm_${sorted[0]?.slice(0, 8) || "unknown"}_${
      sorted[1]?.slice(0, 8) || "unknown"
    }`;
  };

  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  };

  // ============================================
  // Database Operations
  // ============================================

  async function loadConversationsFromLocal(): Promise<void> {
    try {
      // Load deleted conversation IDs
      const deletedIds = new Set(
        (await db.deletedConversations.toArray()).map((d) => d.id)
      );

      const records = await db.chatConversations.toArray();
      conversations.value = records
        .filter((r) => !deletedIds.has(r.id)) // Filter out deleted conversations
        .map((r) => ({
          id: r.id,
          type: r.type,
          participants: JSON.parse(r.participantPubkeys).map(
            (pubkey: string, i: number) => ({
              pubkey,
              name: JSON.parse(r.participantNames)[i] || "Unknown",
            })
          ),
          groupName: r.groupName,
          groupAvatar: r.groupAvatar,
          lastMessage: {
            content: r.lastMessageContent,
            timestamp: r.lastMessageTime,
            senderName: r.lastMessageSenderName,
          },
          unreadCount: r.unreadCount,
          isPinned: r.isPinned,
          isMuted: r.isMuted,
          isPrivate: r.isPrivate,
          key: r.key,
          // NEW: Shop/Team Context
          shopId: r.shopId,
          scope: r.scope as "shop" | "company" | "department" | undefined,
          tags: r.tags ? JSON.parse(r.tags) : [],
          isReadOnly: r.isReadOnly,
          memberPubkeys: r.memberPubkeys ? JSON.parse(r.memberPubkeys) : [],
        }));
    } catch (e) {
      console.error("[Chat] Failed to load conversations:", e);
    }
  }

  async function saveConversationToLocal(
    conversation: ChatConversation
  ): Promise<void> {
    // Validate required fields before saving
    if (!conversation.id || typeof conversation.id !== "string") {
      console.error(
        "[Chat] Cannot save conversation without valid ID:",
        conversation
      );
      throw new Error("Invalid conversation ID");
    }

    const record: ChatConversationRecord = {
      id: conversation.id,
      type: conversation.type,
      participantPubkeys: JSON.stringify(
        conversation.participants.map((p) => p.pubkey)
      ),
      participantNames: JSON.stringify(
        conversation.participants.map((p) => p.name)
      ),
      groupName: conversation.groupName,
      groupAvatar: conversation.groupAvatar,
      lastMessageContent: conversation.lastMessage.content,
      lastMessageTime: conversation.lastMessage.timestamp,
      lastMessageSenderName: conversation.lastMessage.senderName,
      unreadCount: conversation.unreadCount,
      isPinned: conversation.isPinned,
      isMuted: conversation.isMuted,
      isPrivate: conversation.isPrivate,
      key: conversation.key,
      // NEW: Shop/Team Context
      shopId: conversation.shopId,
      scope: conversation.scope,
      tags: conversation.tags ? JSON.stringify(conversation.tags) : undefined,
      isReadOnly: conversation.isReadOnly,
      memberPubkeys: conversation.memberPubkeys
        ? JSON.stringify(conversation.memberPubkeys)
        : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.chatConversations.put(record);
  }

  async function loadMessagesForConversation(
    conversationId: string
  ): Promise<ChatMessage[]> {
    try {
      const records = await db.chatMessages
        .where("conversationId")
        .equals(conversationId)
        .sortBy("timestamp");
      return records.map((r) => {
        // Deserialize reactions from JSON
        let reactions: Map<string, MessageReaction[]> | undefined;
        if (r.reactions) {
          try {
            const parsed = JSON.parse(r.reactions);
            reactions = new Map(Object.entries(parsed));
          } catch {
            reactions = undefined;
          }
        }

        return {
          id: r.id,
          conversationId: r.conversationId,
          senderPubkey: r.senderPubkey,
          senderName: r.senderName,
          senderAvatar: r.senderAvatar,
          recipientPubkey: r.recipientPubkey,
          content: r.content,
          timestamp: r.timestamp,
          status: r.status,
          replyToId: r.replyToId,
          nostrEventId: r.nostrEventId,
          reactions,
        };
      });
    } catch (e) {
      console.error("[Chat] Failed to load messages:", e);
      return [];
    }
  }

  /**
   * Fetch reactions for a list of message event IDs
   * Returns a Map of eventId -> Map of emoji -> MessageReaction[]
   */
  async function fetchReactionsForMessages(
    messageEventIds: string[]
  ): Promise<Map<string, Map<string, MessageReaction[]>>> {
    const reactionsMap = new Map<string, Map<string, MessageReaction[]>>();
    
    if (!$nostr?.pool || messageEventIds.length === 0) {
      return reactionsMap;
    }

    const relayUrls = DEFAULT_RELAYS.map((r) => r.url);

    try {
      // Query for reactions (kind 7) that reference these messages
      const reactionFilter = {
        kinds: [NOSTR_KINDS.REACTION],
        "#e": messageEventIds,
        limit: 500, // Allow multiple reactions per message
      };

      const reactionEvents = await $nostr.pool.querySync(relayUrls, reactionFilter);

      // Process each reaction
      for (const reactionEvent of reactionEvents) {
        const messageId = reactionEvent.tags.find((t: string[]) => t[0] === "e")?.[1];
        const emoji = reactionEvent.content;

        if (!messageId || !emoji) continue;

        // Find reactor info
        const reactor = usersStore.users.value.find(
          (u) => u.pubkeyHex === reactionEvent.pubkey
        );
        const reactorName = reactor?.name || `User ${reactionEvent.pubkey.slice(0, 8)}`;

        const reaction: MessageReaction = {
          emoji,
          pubkey: reactionEvent.pubkey,
          name: reactorName,
          timestamp: reactionEvent.created_at * 1000,
          eventId: reactionEvent.id,
        };

        // Initialize nested maps if needed
        if (!reactionsMap.has(messageId)) {
          reactionsMap.set(messageId, new Map());
        }
        const messageReactions = reactionsMap.get(messageId)!;
        if (!messageReactions.has(emoji)) {
          messageReactions.set(emoji, []);
        }
        messageReactions.get(emoji)!.push(reaction);
      }
    } catch (e) {
      console.error("[Chat] Failed to fetch reactions:", e);
    }

    return reactionsMap;
  }

  /**
   * Fetch historical messages from Nostr relays for a channel
   * This supplements local messages with remote ones
   */
  async function fetchChannelMessagesFromRelay(
    channelId: string,
    limit: number = 50
  ): Promise<void> {
    if (!$nostr?.pool) {
      return;
    }

    const relayUrls = DEFAULT_RELAYS.map((r) => r.url);

    try {
      // Collect all events from different filter queries
      // Use NostrEvent type from import
      let allEvents: NostrEvent[] = [];

      // Query 1: Filter by channel ID using #h tag (NIP-29 style)
      const filterH = {
        kinds: [NOSTR_KINDS.GROUP_CHAT_MESSAGE],
        "#h": [channelId],
        limit,
      };
      const eventsH = await $nostr.pool.querySync(relayUrls, filterH);
      allEvents = [...allEvents, ...eventsH];

      // Query 2: Filter by channel ID using #e tag (backward compatibility)
      const filterE = {
        kinds: [NOSTR_KINDS.GROUP_CHAT_MESSAGE],
        "#e": [channelId],
        limit,
      };
      const eventsE = await $nostr.pool.querySync(relayUrls, filterE);
      allEvents = [...allEvents, ...eventsE];

      // Query 3: If team mode, also query by team tag
      if (company.companyCodeHash.value) {
        const teamTag = `team:${company.companyCodeHash.value}`;
        const filterT = {
          kinds: [NOSTR_KINDS.GROUP_CHAT_MESSAGE],
          "#t": [teamTag],
          limit,
        };
        const eventsT = await $nostr.pool.querySync(relayUrls, filterT);
        allEvents = [...allEvents, ...eventsT];
      }

      // Deduplicate by event ID
      const uniqueEvents = new Map<string, NostrEvent>();
      allEvents.forEach((e: NostrEvent) => {
        if (!uniqueEvents.has(e.id)) {
          uniqueEvents.set(e.id, e);
        }
      });
      const events = Array.from(uniqueEvents.values());

      // Fetch reactions for all these messages
      const messageEventIds = events.map((e) => e.id);
      const reactionsMap = await fetchReactionsForMessages(messageEventIds);

      // Process and save each event
      for (const event of events) {
        // Check if message belongs to this channel
        const eventChannelId =
          event.tags.find((t: string[]) => t[0] === "h")?.[1] ||
          event.tags.find((t: string[]) => t[0] === "e")?.[1];

        if (eventChannelId !== channelId) continue;

        // Check if we already have this message
        const existing = await db.chatMessages
          .where("nostrEventId")
          .equals(event.id)
          .first();
        if (existing) continue;

        // Verify company code if in team mode
        if (
          company.isCompanyCodeEnabled.value &&
          company.companyCodeHash.value
        ) {
          const expectedTeamTag = `team:${company.companyCodeHash.value}`;
          const messageTeamTag = event.tags.find(
            (t: string[]) => t[0] === "t"
          )?.[1];
          const messageCompanyCode = event.tags.find(
            (t: string[]) => t[0] === "c"
          )?.[1];

          if (
            messageTeamTag !== expectedTeamTag &&
            messageCompanyCode !== company.companyCodeHash.value
          ) {
            continue; // Skip messages from other teams
          }
        }

        // Find sender info
        const sender = usersStore.users.value.find(
          (u) => u.pubkeyHex === event.pubkey
        );
        const senderName = sender?.name || `User ${event.pubkey.slice(0, 8)}`;

        // Find the conversation to check if it's private and needs decryption
        const conv = conversations.value.find((c) => c.id === channelId);
        let messageContent = event.content;

        // Decrypt if private channel with key
        if (conv?.isPrivate && conv.key) {
          try {
            messageContent = decryptChannelMessage(event.content, conv.key);
          } catch (decryptError) {
            messageContent = "[Encrypted - unable to decrypt]";
          }
        } else if (conv?.isPrivate && !conv.key) {
          messageContent = "[Encrypted - no key]";
        }

        const message: ChatMessage = {
          id: `msg_${event.id.slice(0, 12)}`,
          conversationId: channelId,
          senderPubkey: event.pubkey,
          senderName,
          senderAvatar: sender?.avatar,
          recipientPubkey: "",
          content: messageContent,
          timestamp: event.created_at * 1000,
          status: "delivered",
          nostrEventId: event.id,
          reactions: reactionsMap.get(event.id), // Add reactions from Nostr
        };

        await saveMessageToLocal(message);
      }

      // Reload messages from local DB to get the updated list
      const msgs = await loadMessagesForConversation(channelId);
      messages.value.set(channelId, msgs);
    } catch (e) {
      console.error("[Chat] Failed to fetch channel messages from relay:", e);
    }
  }

  /**
   * Fetch DM history from Nostr relays for a specific conversation
   */
  async function fetchDMsFromRelay(
    otherPubkey: string,
    limit: number = 50
  ): Promise<void> {
    const keys = getUserKeys();
    if (!keys?.pubkey || !keys?.privkey || !$nostr?.pool) {
      return;
    }

    const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
    const conversationId = generateConversationId(keys.pubkey, otherPubkey);

    try {
      // Query 1: DMs TO me FROM the other person
      const filterToMe = {
        kinds: [NOSTR_KINDS.ENCRYPTED_DM],
        authors: [otherPubkey],
        "#p": [keys.pubkey],
        limit,
      };
      const eventsToMe = await $nostr.pool.querySync(relayUrls, filterToMe);

      // Query 2: DMs FROM me TO the other person
      const filterFromMe = {
        kinds: [NOSTR_KINDS.ENCRYPTED_DM],
        authors: [keys.pubkey],
        "#p": [otherPubkey],
        limit,
      };
      const eventsFromMe = await $nostr.pool.querySync(relayUrls, filterFromMe);

      // Combine and deduplicate
      const allEvents = [...eventsToMe, ...eventsFromMe];
      const uniqueEvents = new Map<string, (typeof allEvents)[0]>();
      allEvents.forEach((e) => {
        if (!uniqueEvents.has(e.id)) uniqueEvents.set(e.id, e);
      });
      const events = Array.from(uniqueEvents.values());

      // Fetch reactions for all these messages
      const messageEventIds = events.map((e) => e.id);
      const reactionsMap = await fetchReactionsForMessages(messageEventIds);

      // Process each DM
      for (const event of events) {
        // Check if we already have this message
        const existing = await db.chatMessages
          .where("nostrEventId")
          .equals(event.id)
          .first();
        if (existing) continue;

        try {
          // Determine if this is incoming or outgoing
          const isIncoming = event.pubkey !== keys.pubkey;
          const senderPubkey = event.pubkey;

          // Decrypt the message
          const decryptPubkey = isIncoming ? senderPubkey : otherPubkey;
          const content = await decryptMessage(event.content, decryptPubkey);

          // Find sender info
          const sender = usersStore.users.value.find(
            (u) => u.pubkeyHex === senderPubkey
          );
          const currentUser = usersStore.currentUser.value;
          const senderName = isIncoming
            ? sender?.name || `User ${senderPubkey.slice(0, 8)}`
            : currentUser?.name || "Me";

          const message: ChatMessage = {
            id: `msg_${event.id.slice(0, 12)}`,
            conversationId,
            senderPubkey,
            senderName,
            senderAvatar: isIncoming ? sender?.avatar : currentUser?.avatar,
            recipientPubkey: isIncoming ? keys.pubkey : otherPubkey,
            content,
            timestamp: event.created_at * 1000,
            status: "delivered",
            nostrEventId: event.id,
            reactions: reactionsMap.get(event.id), // Add reactions from Nostr
          };

          await saveMessageToLocal(message);
        } catch (e) {
          console.error(
            "[Chat] Failed to decrypt DM:",
            event.id.slice(0, 8),
            e
          );
        }
      }

      // Reload messages from local DB
      const msgs = await loadMessagesForConversation(conversationId);
      messages.value.set(conversationId, msgs);
      console.log("[Chat] 🌐 Conversation now has", msgs.length, "messages");
    } catch (e) {
      console.error("[Chat] Failed to fetch DMs from relay:", e);
    }
  }

  async function saveMessageToLocal(message: ChatMessage): Promise<void> {
    // Serialize reactions Map to JSON for storage
    let reactionsJson: string | undefined;
    if (message.reactions && message.reactions.size > 0) {
      const reactionsObj: Record<string, MessageReaction[]> = {};
      message.reactions.forEach((value, key) => {
        reactionsObj[key] = value;
      });
      reactionsJson = JSON.stringify(reactionsObj);
    }

    const record: ChatMessageRecord = {
      id: message.id,
      conversationId: message.conversationId,
      senderPubkey: message.senderPubkey,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      recipientPubkey: message.recipientPubkey,
      content: message.content,
      timestamp: message.timestamp,
      status: message.status,
      replyToId: message.replyToId,
      nostrEventId: message.nostrEventId,
      isEncrypted: true,
      synced: !!message.nostrEventId,
      reactions: reactionsJson,
    };
    await db.chatMessages.put(record);
  }

  // ============================================
  // Crypto Operations
  // ============================================

  const generateChannelKey = (): string => {
    return CryptoJS.lib.WordArray.random(32).toString(); // 256-bit key
  };

  const encryptChannelMessage = (content: string, key: string): string => {
    return CryptoJS.AES.encrypt(content, key).toString();
  };

  const decryptChannelMessage = (encrypted: string, key: string): string => {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error("[Chat] Failed to decrypt channel message", e);
      return "[Encrypted Message]";
    }
  };

  // ============================================
  // Nostr Operations
  // ============================================

  async function encryptMessage(
    content: string,
    recipientPubkey: string
  ): Promise<string> {
    const keys = getUserKeys();
    if (!keys?.privkey) {
      throw new Error(
        "No private key available for encryption. Please login with your nsec key."
      );
    }

    const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
    const privateKey = hexToBytes(privateKeyHex);
    return await nip04.encrypt(privateKey, recipientPubkey, content);
  }

  async function decryptMessage(
    encryptedContent: string,
    senderPubkey: string
  ): Promise<string> {
    const keys = getUserKeys();
    if (!keys?.privkey) {
      throw new Error(
        "No private key available for decryption. Please login with your nsec key."
      );
    }

    const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
    const privateKey = hexToBytes(privateKeyHex);
    return await nip04.decrypt(privateKey, senderPubkey, encryptedContent);
  }

  async function sendMessage(
    recipientPubkey: string,
    content: string,
    recipientName: string,
    replyToId?: string
  ): Promise<boolean> {
    const keys = getUserKeys();
    const currentUser = usersStore.currentUser.value;

    if (!keys?.pubkey || !keys?.privkey) {
      console.error(
        "[Chat] Current user has no Nostr private key. Please login with nsec."
      );
      return false;
    }

    isSending.value = true;
    const conversationId = generateConversationId(keys.pubkey, recipientPubkey);
    const messageId = generateMessageId();

    // Create message object
    const message: ChatMessage = {
      id: messageId,
      conversationId,
      senderPubkey: keys.pubkey,
      senderName: currentUser?.name || "Me",
      senderAvatar: currentUser?.avatar,
      recipientPubkey,
      content,
      timestamp: Date.now(),
      status: "sending",
      replyToId,
    };

    // Add to local state immediately (optimistic update)
    const currentMessages = messages.value.get(conversationId) || [];
    messages.value.set(conversationId, [...currentMessages, message]);

    // Save to local DB
    await saveMessageToLocal(message);

    try {
      // Encrypt and send via Nostr
      const encryptedContent = await encryptMessage(content, recipientPubkey);

      // Publish encrypted DM via Nostr relay
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);

      const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
      const privateKey = hexToBytes(privateKeyHex);

      const eventTemplate = {
        kind: NOSTR_KINDS.ENCRYPTED_DM,
        content: encryptedContent,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["p", recipientPubkey]],
      };

      const signedEvent = $nostr.finalizeEvent(eventTemplate, privateKey);
      const pubs = $nostr.pool.publish(relayUrls, signedEvent);

      // Wait for at least one relay to confirm
      await Promise.race(pubs).catch(() => null);

      // Use the signed event ID since we know it was successfully signed
      if (signedEvent) {
        // Update message status
        message.status = "sent";
        message.nostrEventId = signedEvent.id;
        await saveMessageToLocal(message);

        // Update in state
        const msgs = messages.value.get(conversationId) || [];
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx >= 0) {
          msgs[idx] = message;
          messages.value.set(conversationId, [...msgs]);
        }

        // Update or create conversation
        await updateConversationWithMessage(
          conversationId,
          recipientPubkey,
          recipientName,
          message
        );

        isSending.value = false;
        return true;
      }
    } catch (e) {
      console.error("[Chat] Failed to send message:", e);
      message.status = "failed";
      await saveMessageToLocal(message);
    }

    isSending.value = false;
    return false;
  }

  async function updateConversationWithMessage(
    conversationId: string,
    otherPubkey: string,
    otherName: string,
    message: ChatMessage,
    type: "direct" | "channel" = "direct",
    channelName?: string
  ): Promise<void> {
    const currentUser = usersStore.currentUser.value;
    const existingConv = conversations.value.find(
      (c) => c.id === conversationId
    );

    if (existingConv) {
      existingConv.lastMessage = {
        content: message.content,
        timestamp: message.timestamp,
        senderName: message.senderName,
      };
      await saveConversationToLocal(existingConv);
    } else {
      // Create new conversation
      const newConversation: ChatConversation = {
        id: conversationId,
        type,
        participants:
          type === "direct"
            ? [
                {
                  pubkey: currentUser!.pubkeyHex!,
                  name: currentUser!.name,
                  avatar: currentUser!.avatar,
                },
                { pubkey: otherPubkey, name: otherName },
              ]
            : [], // Channels don't track all participants in this list usually, or we add creator
        groupName: channelName,
        lastMessage: {
          content: message.content,
          timestamp: message.timestamp,
          senderName: message.senderName,
        },
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
      };
      conversations.value.unshift(newConversation);
      await saveConversationToLocal(newConversation);
    }
  }

  // ============================================
  // Shop Context & Filtering
  // ============================================

  /**
   * Get channels for a specific shop
   */
  const getShopChannels = (shopId: string): ChatConversation[] => {
    return conversations.value.filter(
      (c) => c.type === "channel" && c.scope === "shop" && c.shopId === shopId
    );
  };

  /**
   * Get company-wide channels
   */
  const getCompanyChannels = (): ChatConversation[] => {
    return conversations.value.filter(
      (c) => c.type === "channel" && c.scope === "company"
    );
  };

  /**
   * Get department channels
   */
  const getDepartmentChannels = (department: string): ChatConversation[] => {
    return conversations.value.filter(
      (c) =>
        c.type === "channel" &&
        c.scope === "department" &&
        c.tags?.includes(department)
    );
  };

  /**
   * Check if current user can access a channel
   */
  const canAccessChannel = (channelId: string): boolean => {
    const channel = conversations.value.find((c) => c.id === channelId);
    if (!channel) return false;

    // Public channels are accessible to all
    if (!channel.isPrivate) return true;

    // For private channels, check member list
    const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
    if (!currentPubkey) return false;

    return channel.memberPubkeys?.includes(currentPubkey) || false;
  };

  /**
   * Add member to private channel
   */
  async function addChannelMember(
    channelId: string,
    pubkey: string
  ): Promise<boolean> {
    const channel = conversations.value.find((c) => c.id === channelId);
    if (!channel || !channel.isPrivate) return false;

    // Add to member list if not already present
    if (!channel.memberPubkeys) {
      channel.memberPubkeys = [];
    }

    if (!channel.memberPubkeys.includes(pubkey)) {
      channel.memberPubkeys.push(pubkey);
      await saveConversationToLocal(channel);
      return true;
    }

    return false;
  }

  /**
   * Remove member from private channel
   */
  async function removeChannelMember(
    channelId: string,
    pubkey: string
  ): Promise<boolean> {
    const channel = conversations.value.find((c) => c.id === channelId);
    if (!channel || !channel.isPrivate) return false;

    if (channel.memberPubkeys) {
      const index = channel.memberPubkeys.indexOf(pubkey);
      if (index > -1) {
        channel.memberPubkeys.splice(index, 1);
        await saveConversationToLocal(channel);
        return true;
      }
    }

    return false;
  }

  /**
   * Get channel members
   */
  const getChannelMembers = (channelId: string): string[] => {
    const channel = conversations.value.find((c) => c.id === channelId);
    return channel?.memberPubkeys || [];
  };

  // ============================================
  // Channel Operations
  // ============================================

  async function createChannel(
    name: string,
    about: string = "",
    isPrivate: boolean = false,
    shopId?: string,
    scope: "shop" | "company" | "department" = "company",
    tags: string[] = [],
    memberPubkeys: string[] = [] // NEW: Members to auto-invite to private channel
  ): Promise<string | null> {
    const keys = getUserKeys();
    if (!keys?.privkey) {
      console.error("[Chat] No private key to create channel");
      return null;
    }

    try {
      const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
      const privateKey = hexToBytes(privateKeyHex);

      const secretKey = isPrivate ? generateChannelKey() : undefined;

      const content = {
        name,
        about,
        picture: "",
        isPrivate, // Custom field to indicate privacy
        shopId, // NEW: Shop context
        scope, // NEW: Visibility scope
        tags, // NEW: Categorization tags
      };

      // Build event tags - use standard #t tag for team filtering (NIP-12)
      const eventTags: string[][] = [];
      if (company.companyCodeHash.value) {
        const teamTag = `team:${company.companyCodeHash.value}`;
        eventTags.push(["t", teamTag]); // Standard #t tag - better relay support
        eventTags.push(["c", company.companyCodeHash.value]); // Custom #c - backward compatibility
      }

      const eventTemplate = {
        kind: NOSTR_KINDS.CHANNEL_CREATE,
        content: JSON.stringify(content),
        created_at: Math.floor(Date.now() / 1000),
        tags: eventTags,
      };

      const signedEvent = $nostr.finalizeEvent(eventTemplate, privateKey);
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
      const pubs = $nostr.pool.publish(relayUrls, signedEvent);
      await Promise.race(pubs).catch(() => null);

      if (signedEvent) {
        // Create local conversation for the new channel
        const conversationId = signedEvent.id;
        const currentPubkey = usersStore.currentUser.value?.pubkeyHex;

        const newConversation: ChatConversation = {
          id: conversationId,
          type: "channel",
          participants: [],
          groupName: name,
          lastMessage: {
            content: "Channel created",
            timestamp: Date.now(),
            senderName: "System",
          },
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          isPrivate,
          key: secretKey,
          // NEW: Shop/Team Context
          shopId,
          scope,
          tags,
          isReadOnly: false,
          memberPubkeys: isPrivate && currentPubkey 
            ? [currentPubkey, ...memberPubkeys.filter(pk => pk !== currentPubkey)] 
            : [], // Add creator and invited members to private channel
        };
        conversations.value.unshift(newConversation);
        await saveConversationToLocal(newConversation);

        // Auto-invite members to private channel
        if (isPrivate && secretKey && memberPubkeys.length > 0) {
          console.log(`[Chat] 🔐 Auto-inviting ${memberPubkeys.length} members to private channel`);
          
          for (const memberPubkey of memberPubkeys) {
            if (memberPubkey === currentPubkey) continue; // Skip self
            
            try {
              // Send encryption key via DM
              const inviteContent = JSON.stringify({
                type: "channel_invite",
                channelId: conversationId,
                channelName: name,
                key: secretKey,
              });
              
              await sendMessage(memberPubkey, inviteContent, "User");
              console.log(`[Chat] ✅ Invited ${memberPubkey.slice(0, 8)} to private channel`);
            } catch (err) {
              console.error(`[Chat] Failed to invite ${memberPubkey.slice(0, 8)}:`, err);
            }
          }
        }

        // NEW: Sync to Nostr if team mode and not a DM
        if (
          company.isCompanyCodeEnabled.value &&
          newConversation.type !== "direct"
        ) {
          try {
            await nostrData.saveConversation({
              id: newConversation.id,
              type: newConversation.type,
              groupName: newConversation.groupName,
              groupAvatar: newConversation.groupAvatar,
              shopId: newConversation.shopId,
              scope: newConversation.scope,
              tags: newConversation.tags,
              isReadOnly: newConversation.isReadOnly,
              memberPubkeys: newConversation.memberPubkeys,
              isPrivate: newConversation.isPrivate,
              key: newConversation.key, // Sync encryption key for private channels
            });
          } catch (err) {
            console.warn("[Chat] Failed to sync conversation to Nostr:", err);
          }
        }

        return conversationId;
      }
    } catch (e) {
      console.error("[Chat] Failed to create channel:", e);
    }
    return null;
  }

  async function inviteToChannel(
    channelId: string,
    pubkey: string
  ): Promise<boolean> {
    const conv = conversations.value.find((c) => c.id === channelId);
    if (!conv || !conv.isPrivate || !conv.key) {
      console.error(
        "[Chat] Cannot invite: Channel not found, not private, or missing key"
      );
      return false;
    }

    // Add to member list
    if (!conv.memberPubkeys) {
      conv.memberPubkeys = [];
    }
    if (!conv.memberPubkeys.includes(pubkey)) {
      conv.memberPubkeys.push(pubkey);
      await saveConversationToLocal(conv);
    }

    // We send the key securely via DM (Kind 4)
    const inviteContent = JSON.stringify({
      type: "channel_invite",
      channelId: conv.id,
      channelName: conv.groupName,
      key: conv.key,
    });

    return await sendMessage(pubkey, inviteContent, "User"); // This sends Kind 4
  }

  /**
   * Request access to a private channel
   * Sends a request to the channel creator
   */
  async function requestChannelAccess(channelId: string): Promise<boolean> {
    const conv = conversations.value.find((c) => c.id === channelId);
    if (!conv || !conv.isPrivate) {
      return false;
    }

    try {
      const keys = getUserKeys();
      if (!keys?.privkey || !$nostr?.pool) return false;

      // Query for the channel creator (who created the channel)
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
      const channelCreationEvents = await $nostr.pool.querySync(relayUrls, {
        kinds: [NOSTR_KINDS.CHANNEL_CREATE],
        ids: [channelId],
        limit: 1,
      });

      if (channelCreationEvents.length === 0) {
        console.error("[Chat] Cannot find channel creator");
        return false;
      }

      const creatorPubkey = channelCreationEvents[0].pubkey;

      // Send access request via DM
      const requestContent = JSON.stringify({
        type: "channel_access_request",
        channelId: conv.id,
        channelName: conv.groupName,
        requestedBy: keys.pubkey,
      });

      await sendMessage(creatorPubkey, requestContent, "User");
      console.log("[Chat] 🔑 Access request sent to channel creator");
      return true;
    } catch (e) {
      console.error("[Chat] Failed to request channel access:", e);
      return false;
    }
  }

  async function sendChannelMessage(
    channelId: string,
    content: string,
    replyToId?: string
  ): Promise<boolean> {
    const keys = getUserKeys();
    const currentUser = usersStore.currentUser.value;

    if (!keys?.privkey) return false;

    const conv = conversations.value.find((c) => c.id === channelId);
    let finalContent = content;

    if (conv?.isPrivate && conv.key) {
      finalContent = encryptChannelMessage(content, conv.key);
    }

    isSending.value = true;
    const messageId = generateMessageId();

    // Get reply context if replying
    let replyToContent: string | undefined;
    let replyToSender: string | undefined;
    if (replyToId) {
      const conversationMessages = messages.value.get(channelId);
      const replyToMessage = conversationMessages?.find(
        (m) => m.id === replyToId || m.nostrEventId === replyToId
      );
      if (replyToMessage) {
        replyToContent = replyToMessage.content;
        replyToSender = replyToMessage.senderName;
      }
    }

    const message: ChatMessage = {
      id: messageId,
      conversationId: channelId,
      senderPubkey: keys.pubkey,
      senderName: currentUser?.name || "Me",
      senderAvatar: currentUser?.avatar,
      recipientPubkey: "", // Public channel
      content: content, // We store decrypted locally
      timestamp: Date.now(),
      status: "sending",
      replyToId,
      replyToContent,
      replyToSender,
    };

    // Optimistic update
    const currentMessages = messages.value.get(channelId) || [];
    messages.value.set(channelId, [...currentMessages, message]);
    await saveMessageToLocal(message);

    try {
      const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
      const privateKey = hexToBytes(privateKeyHex);

      // Use NIP-29 kind 9 for better cross-client compatibility
      const tags: string[][] = [
        ["h", channelId], // NIP-29: group/channel reference
        ["e", channelId, "", "root"], // Backward compatibility
      ];

      // Add reply tags (NIP-10 threading)
      if (replyToId) {
        tags.push(["e", replyToId, "", "reply"]); // Reply to specific message
      }

      // Add company code hash for team filtering (CRITICAL!)
      // Using BOTH #t (standard - NIP-12) AND #c (custom) for maximum relay compatibility
      if (company.companyCodeHash.value) {
        const teamTag = `team:${company.companyCodeHash.value}`;
        tags.push(["t", teamTag]); // Standard #t tag - better relay support (NIP-12)
        tags.push(["c", company.companyCodeHash.value]); // Custom #c tag - backward compatibility
      } else {
        console.warn("[Chat] No company code hash - message may not sync!");
      }

      const eventTemplate = {
        kind: NOSTR_KINDS.GROUP_CHAT_MESSAGE,
        content: finalContent,
        created_at: Math.floor(Date.now() / 1000),
        tags,
      };

      const signedEvent = $nostr.finalizeEvent(eventTemplate, privateKey);
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);

      const pubs = $nostr.pool.publish(relayUrls, signedEvent);

      // Wait for publish confirmation from at least one relay
      try {
        await Promise.any(pubs);
        console.log("[Chat] ✅ Message published to at least one relay");
      } catch (pubError) {
        console.warn("[Chat] ⚠️ Publish may have failed:", pubError);
      }

      if (signedEvent) {
        message.status = "sent";
        message.nostrEventId = signedEvent.id;
        await saveMessageToLocal(message);

        // Update conversation last message
        await updateConversationWithMessage(
          channelId,
          "",
          "", // No specific recipient for channel
          message,
          "channel"
        );
        isSending.value = false;
        return true;
      }
    } catch (e) {
      console.error("[Chat] Failed to send channel message:", e);
      message.status = "failed";
      await saveMessageToLocal(message);
    }

    isSending.value = false;
    return false;
  }

  // ============================================
  // Push Notifications
  // ============================================

  /**
   * Request notification permission
   */
  async function requestNotificationPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("[Chat] Browser doesn't support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }

  /**
   * Show browser push notification
   */
  function showPushNotification(
    title: string,
    body: string,
    conversationId: string,
    icon?: string
  ): void {
    if (Notification.permission !== "granted") return;

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || "/icon.png",
        badge: "/icon.png",
        tag: conversationId, // Prevent duplicate notifications
        requireInteraction: false,
        silent: false,
      });

      // Click to open chat
      notification.onclick = () => {
        window.focus();
        openChat();
        selectConversation(conversationId);
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (e) {
      console.error("[Chat] Failed to show notification:", e);
    }
  }

  // ============================================
  // Typing Indicators
  // ============================================

  /**
   * Send typing indicator (ephemeral event)
   * Throttled to avoid spamming - max once per 3 seconds
   */
  async function sendTypingIndicator(conversationId: string): Promise<void> {
    const currentUser = usersStore.currentUser.value;
    if (!currentUser?.pubkeyHex || !$nostr?.pool) return;

    // Throttle typing events
    const now = Date.now();
    if (now - lastTypingTime < 3000) return;
    lastTypingTime = now;

    const conversation = conversations.value.find(
      (c) => c.id === conversationId
    );
    if (!conversation) return;

    try {
      const keys = getUserKeys();
      if (!keys?.privkey) return;

      const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
      const privateKey = hexToBytes(privateKeyHex);

      const tags: string[][] = [];

      // Add conversation reference
      if (conversation.type === "channel" || conversation.type === "group") {
        tags.push(["h", conversationId]); // Channel ID
        // Add company code for team channels (BOTH standard #t and custom #c)
        if (
          company.isCompanyCodeEnabled.value &&
          company.companyCodeHash.value
        ) {
          const teamTag = `team:${company.companyCodeHash.value}`;
          tags.push(["t", teamTag]); // Standard #t tag - better relay support
          tags.push(["c", company.companyCodeHash.value]); // Custom #c - backward compatibility
        }
      } else if (conversation.type === "direct") {
        // For DMs, tag the other participant
        const otherParticipant = conversation.participants.find(
          (p) => p.pubkey !== currentUser.pubkeyHex
        );
        if (otherParticipant) {
          tags.push(["p", otherParticipant.pubkey]);
        }
      }

      const eventTemplate = {
        kind: NOSTR_KINDS.TYPING_INDICATOR,
        content: JSON.stringify({ typing: true, conversation: conversationId }),
        created_at: Math.floor(Date.now() / 1000),
        tags,
      };

      const signedEvent = $nostr.finalizeEvent(eventTemplate, privateKey);
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
      const pubs = $nostr.pool.publish(relayUrls, signedEvent);
      await Promise.race(pubs).catch(() => null);
    } catch (e) {
      console.error("[Chat] Failed to send typing indicator:", e);
    }
  }

  /**
   * Stop typing indicator
   */
  function stopTyping(conversationId: string): void {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
  }

  /**
   * Handle typing from input
   */
  function handleTyping(conversationId: string): void {
    sendTypingIndicator(conversationId);

    // Auto-stop after 3 seconds
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      stopTyping(conversationId);
    }, 3000);
  }

  /**
   * Get typing users for a conversation
   */
  const getTypingUsers = computed(() => (conversationId: string) => {
    const conversationTyping = typingUsers.value.get(conversationId);
    if (!conversationTyping) return [];

    // Filter to only show active typing indicators (< 4 seconds old)
    // Don't mutate state inside computed - just filter
    const now = Date.now();
    const activeTyping: string[] = [];

    conversationTyping.forEach((value, _pubkey) => {
      if (now - value.timestamp < 4000) {
        activeTyping.push(value.name);
      }
      // Don't delete here - let setTimeout handle cleanup
    });

    return activeTyping;
  });

  // ============================================
  // Message Reactions (NIP-25)
  // ============================================

  /**
   * Add reaction to a message
   */
  async function addReaction(
    messageId: string,
    emoji: string,
    conversationId: string
  ): Promise<boolean> {
    const currentUser = usersStore.currentUser.value;
    if (!currentUser?.pubkeyHex || !$nostr?.pool) return false;

    try {
      const keys = getUserKeys();
      if (!keys?.privkey) return false;

      // Find the message and get its Nostr event ID
      const conversationMessages = messages.value.get(conversationId);
      const message = conversationMessages?.find((m) => m.id === messageId);

      if (!message?.nostrEventId) {
        console.warn("[Chat] Cannot react: message has no nostrEventId");
        return false;
      }

      const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
      const privateKey = hexToBytes(privateKeyHex);

      // Create reaction event (kind 7 - NIP-25)
      const tags: string[][] = [
        ["e", message.nostrEventId], // Reference to the Nostr event ID (critical for cross-device sync)
        ["p", message.senderPubkey], // Tag the message author
      ];

      // Add team tag for channel reactions (BOTH standard #t and custom #c)
      const conversation = conversations.value.find(
        (c) => c.id === conversationId
      );
      if (conversation?.type !== "direct" && company.companyCodeHash.value) {
        const teamTag = `team:${company.companyCodeHash.value}`;
        tags.push(["t", teamTag]); // Standard #t tag - better relay support
        tags.push(["c", company.companyCodeHash.value]); // Custom #c - backward compatibility
      }

      const eventTemplate = {
        kind: NOSTR_KINDS.REACTION,
        content: emoji,
        created_at: Math.floor(Date.now() / 1000),
        tags,
      };

      const signedEvent = $nostr.finalizeEvent(eventTemplate, privateKey);
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
      const pubs = $nostr.pool.publish(relayUrls, signedEvent);
      await Promise.race(pubs).catch(() => null);

      // Optimistically update local state
      if (!message.reactions) {
        message.reactions = new Map();
      }

      const emojiReactions = message.reactions.get(emoji) || [];
      const existingIndex = emojiReactions.findIndex(
        (r) => r.pubkey === currentUser.pubkeyHex
      );

      if (existingIndex === -1) {
        emojiReactions.push({
          emoji,
          pubkey: currentUser.pubkeyHex,
          name: currentUser.name,
          timestamp: Date.now(),
          eventId: signedEvent.id,
        });
        message.reactions.set(emoji, emojiReactions);

        // Save to database to persist reactions
        await saveMessageToLocal(message);
      }

      return true;
    } catch (e) {
      console.error("[Chat] Failed to add reaction:", e);
      return false;
    }
  }

  /**
   * Remove reaction from a message
   * Publishes a NIP-09 deletion event to sync across devices
   */
  async function removeReaction(
    messageId: string,
    emoji: string,
    conversationId: string
  ): Promise<boolean> {
    const currentUser = usersStore.currentUser.value;
    if (!currentUser?.pubkeyHex || !$nostr?.pool) return false;

    try {
      // Find the reaction event ID to delete
      const conversationMessages = messages.value.get(conversationId);
      const message = conversationMessages?.find((m) => m.id === messageId);
      if (!message?.reactions) return false;

      const emojiReactions = message.reactions.get(emoji);
      if (!emojiReactions) return false;

      const myReaction = emojiReactions.find(
        (r) => r.pubkey === currentUser.pubkeyHex
      );
      if (!myReaction?.eventId) {
        console.warn("[Chat] Cannot remove reaction - no event ID found");
        return false;
      }

      // Publish NIP-09 deletion event
      const keys = getUserKeys();
      if (!keys?.privkey) {
        console.error("[Chat] Cannot remove reaction - no private key");
        return false;
      }

      const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey);
      const privateKey = hexToBytes(privateKeyHex);

      const tags: string[][] = [
        ["e", myReaction.eventId], // Reference to the reaction event to delete
      ];

      // Add team tag for sync
      if (company.companyCodeHash.value) {
        const teamTag = `team:${company.companyCodeHash.value}`;
        tags.push(["t", teamTag]);
        tags.push(["c", company.companyCodeHash.value]);
      }

      const eventTemplate = {
        kind: 5, // NIP-09 deletion
        content: "Removed reaction",
        created_at: Math.floor(Date.now() / 1000),
        tags,
      };

      const signedEvent = $nostr.finalizeEvent(eventTemplate, privateKey);
      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
      const pubs = $nostr.pool.publish(relayUrls, signedEvent);
      await Promise.race(pubs).catch(() => null);

      console.log(
        "[Chat] 🗑️ Reaction deletion event published:",
        signedEvent.id.slice(0, 8)
      );

      // Remove from local state
      const filtered = emojiReactions.filter(
        (r) => r.pubkey !== currentUser.pubkeyHex
      );
      if (filtered.length === 0) {
        message.reactions.delete(emoji);
      } else {
        message.reactions.set(emoji, filtered);
      }

      // Save to database to persist reaction removal
      await saveMessageToLocal(message);

      return true;
    } catch (e) {
      console.error("[Chat] Failed to remove reaction:", e);
      return false;
    }
  }

  /**
   * Get reactions for a message
   */
  function getMessageReactions(
    messageId: string,
    conversationId: string
  ): Map<string, MessageReaction[]> {
    const conversationMessages = messages.value.get(conversationId);
    const message = conversationMessages?.find((m) => m.id === messageId);
    return message?.reactions || new Map();
  }

  // ============================================
  // Message Search
  // ============================================

  /**
   * Search messages across conversations
   */
  async function searchMessages(query: string): Promise<ChatMessage[]> {
    if (!query.trim()) return [];

    try {
      const lowerQuery = query.toLowerCase();
      const results: ChatMessage[] = [];

      // Search in IndexedDB
      const allMessages = await db.chatMessages.toArray();

      for (const record of allMessages) {
        if (
          record.content.toLowerCase().includes(lowerQuery) ||
          record.senderName.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            id: record.id,
            conversationId: record.conversationId,
            senderPubkey: record.senderPubkey,
            senderName: record.senderName,
            senderAvatar: record.senderAvatar,
            recipientPubkey: record.recipientPubkey,
            content: record.content,
            timestamp: record.timestamp,
            status: record.status as any,
            replyToId: record.replyToId,
            nostrEventId: record.nostrEventId,
          });
        }
      }

      // Sort by timestamp (newest first)
      results.sort((a, b) => b.timestamp - a.timestamp);

      return results.slice(0, 50); // Limit to 50 results
    } catch (e) {
      console.error("[Chat] Search failed:", e);
      return [];
    }
  }

  /**
   * Search in active conversation
   */
  async function searchInConversation(
    conversationId: string,
    query: string
  ): Promise<ChatMessage[]> {
    if (!query.trim()) return [];

    try {
      const lowerQuery = query.toLowerCase();
      const conversationMessages = messages.value.get(conversationId) || [];

      const results = conversationMessages.filter(
        (msg) =>
          msg.content.toLowerCase().includes(lowerQuery) ||
          msg.senderName.toLowerCase().includes(lowerQuery)
      );

      return results;
    } catch (e) {
      console.error("[Chat] Conversation search failed:", e);
      return [];
    }
  }

  // ============================================
  // Real-time Subscription
  // ============================================

  async function subscribeToMessages(): Promise<void> {
    // Close any existing subscription before creating a new one
    if (chatSubscription) {
      console.log(
        "[Chat] 🔄 Closing existing subscription before re-subscribing"
      );
      chatSubscription.close();
      chatSubscription = null;
    }

    const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
    if (!currentPubkey || !$nostr?.pool) {
      console.warn("[Chat] Cannot subscribe - no pubkey or nostr pool");
      return;
    }

    const relayUrls = DEFAULT_RELAYS.map((r) => r.url);

    // Get known contact pubkeys for DM subscription
    const contactPubkeys = availableContacts.value
      .map((c) => c.pubkey)
      .filter(Boolean);

    // Filter 1: DMs TO me (tagged with my pubkey)
    const dmToMeFilter = {
      kinds: [NOSTR_KINDS.ENCRYPTED_DM],
      "#p": [currentPubkey],
      since: Math.floor(Date.now() / 1000) - 86400,
    };

    // Filter 2: DMs FROM my contacts (authored by contacts, to catch their messages)
    // This ensures we receive messages even if relay doesn't properly index #p tags
    // Using Record type to allow dynamic filter keys
    const filters: Record<string, unknown>[] = [dmToMeFilter];

    if (contactPubkeys.length > 0) {
      const dmFromContactsFilter = {
        kinds: [NOSTR_KINDS.ENCRYPTED_DM],
        authors: contactPubkeys,
        "#p": [currentPubkey], // Still filter by #p to only get DMs to me
        since: Math.floor(Date.now() / 1000) - 86400,
      };
      filters.push(dmFromContactsFilter);
    }

    // Reactions on my messages (DMs and channels)
    const dmReactionsFilter = {
      kinds: [NOSTR_KINDS.REACTION],
      "#p": [currentPubkey], // Reactions on messages I sent or to me
      since: Math.floor(Date.now() / 1000) - 86400,
    };
    filters.push(dmReactionsFilter);

    // If team mode, subscribe to team channel messages
    // Using BOTH #t (standard tag - NIP-12) AND #c (custom tag) for maximum compatibility
    if (company.isCompanyCodeEnabled.value && company.companyCodeHash.value) {
      const teamTag = `team:${company.companyCodeHash.value}`;

      // Primary filter: by standard #t tag (better relay support per NIP-12)
      const teamChannelFilterT = {
        kinds: [
          NOSTR_KINDS.GROUP_CHAT_MESSAGE,
          NOSTR_KINDS.CHANNEL_CREATE,
          NOSTR_KINDS.CHANNEL_MESSAGE,
        ],
        "#t": [teamTag], // Standard tag filter - better relay support
        since: Math.floor(Date.now() / 1000) - 86400,
      };
      filters.push(teamChannelFilterT);

      // Secondary filter: by custom #c tag (for backward compatibility)
      const teamChannelFilterC = {
        kinds: [
          NOSTR_KINDS.GROUP_CHAT_MESSAGE,
          NOSTR_KINDS.CHANNEL_CREATE,
          NOSTR_KINDS.CHANNEL_MESSAGE,
        ],
        "#c": [company.companyCodeHash.value], // Custom tag - may not work on all relays
        since: Math.floor(Date.now() / 1000) - 86400,
      };
      filters.push(teamChannelFilterC);

      // Typing indicators for team channels (using both tags)
      const typingFilterT = {
        kinds: [NOSTR_KINDS.TYPING_INDICATOR],
        "#t": [teamTag],
        since: Math.floor(Date.now() / 1000),
      };
      filters.push(typingFilterT);

      // Reactions for team messages
      const reactionsFilterT = {
        kinds: [NOSTR_KINDS.REACTION],
        "#t": [teamTag],
        since: Math.floor(Date.now() / 1000) - 86400,
      };
      filters.push(reactionsFilterT);

      // Fallback filter: subscribe to all group messages (for relays that don't support tag filters)
      // We filter by company code in handleIncomingMessage
      const fallbackChannelFilter = {
        kinds: [NOSTR_KINDS.GROUP_CHAT_MESSAGE],
        since: Math.floor(Date.now() / 1000) - 86400,
      };
      filters.push(fallbackChannelFilter);
    } else {
      // Solo mode: subscribe to all public channels
      const channelFilter = {
        kinds: [
          NOSTR_KINDS.GROUP_CHAT_MESSAGE,
          NOSTR_KINDS.CHANNEL_CREATE,
          NOSTR_KINDS.CHANNEL_MESSAGE,
        ],
        since: Math.floor(Date.now() / 1000) - 86400,
      };
      filters.push(channelFilter);
    }

    // Cast filters to satisfy nostr-tools type requirements
    // nostr-tools expects Filter[], but our dynamic filters need explicit cast
    chatSubscription = $nostr.pool.subscribeMany(
      relayUrls,
      filters as unknown as Parameters<typeof $nostr.pool.subscribeMany>[1],
      {
        async onevent(event: NostrEvent) {
          console.log(
            "[Chat] 📨 Received event kind:",
            event.kind,
            "id:",
            event.id.slice(0, 8) + "...",
            "from:",
            event.pubkey.slice(0, 8) + "..."
          );
          console.log(
            "[Chat] 📨 Event tags:",
            JSON.stringify(event.tags.slice(0, 3))
          );
          await handleIncomingMessage(event);
        },
        oneose() {
          console.log(
            "[Chat] ✅ Subscription established, EOSE received - now listening for real-time events"
          );
        },
        onclose(reasons: string[]) {
          console.warn("[Chat] ❌ Subscription closed:", reasons);
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            console.log("[Chat] 🔄 Attempting to reconnect subscription...");
            subscribeToMessages();
          }, 5000);
        },
      }
    );

    // Log subscription status
    console.log("[Chat] 📡 Subscription created, waiting for events...");

    // Also set up a periodic check to ensure subscription is alive
    // and manually poll for new messages if needed
    setupRealtimePolling();
  }

  // Fallback polling mechanism when websocket subscriptions don't deliver events
  let pollingInterval: NodeJS.Timeout | null = null;
  let lastPolledTimestamp = Math.floor(Date.now() / 1000);

  function setupRealtimePolling(): void {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 5 seconds as a fallback for real-time
    pollingInterval = setInterval(async () => {
      await pollForNewMessages();
    }, 5000);

    console.log("[Chat] ⏰ Polling fallback enabled (every 5s)");
  }

  async function pollForNewMessages(): Promise<void> {
    if (!$nostr?.pool) return;

    const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
    if (!currentPubkey) return;

    const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
    const now = Math.floor(Date.now() / 1000);

    try {
      // Poll for new channel messages since last check
      const filters: Record<string, unknown>[] = [];

      if (company.isCompanyCodeEnabled.value && company.companyCodeHash.value) {
        const teamTag = `team:${company.companyCodeHash.value}`;

        // Query for new team messages
        filters.push({
          kinds: [NOSTR_KINDS.GROUP_CHAT_MESSAGE],
          "#t": [teamTag],
          since: lastPolledTimestamp,
        });

        // Also try the fallback without tag filter
        filters.push({
          kinds: [NOSTR_KINDS.GROUP_CHAT_MESSAGE],
          since: lastPolledTimestamp,
          limit: 20,
        });
      }

      // Query for DMs to me
      filters.push({
        kinds: [NOSTR_KINDS.ENCRYPTED_DM],
        "#p": [currentPubkey],
        since: lastPolledTimestamp,
      });

      // Query for reactions on my messages
      filters.push({
        kinds: [NOSTR_KINDS.REACTION],
        "#p": [currentPubkey],
        since: lastPolledTimestamp,
      });

      // Query for typing indicators (team mode)
      if (company.isCompanyCodeEnabled.value && company.companyCodeHash.value) {
        const teamTag = `team:${company.companyCodeHash.value}`;
        filters.push({
          kinds: [NOSTR_KINDS.TYPING_INDICATOR],
          "#t": [teamTag],
          since: lastPolledTimestamp - 10, // Look back 10 seconds for typing
        });

        // Also query reactions for team messages
        filters.push({
          kinds: [NOSTR_KINDS.REACTION],
          "#t": [teamTag],
          since: lastPolledTimestamp,
        });

        // Query for deletion events (NIP-09) - for unreacting
        filters.push({
          kinds: [5], // NIP-09 deletion
          "#t": [teamTag],
          since: lastPolledTimestamp,
        });
      }

      // Run queries in parallel
      for (const filter of filters) {
        try {
          const events = await $nostr.pool.querySync(
            relayUrls,
            filter as Parameters<typeof $nostr.pool.querySync>[1]
          );
          if (events.length > 0) {
            console.log("[Chat] ⏰ Poll found", events.length, "new events");
            for (const event of events) {
              await handleIncomingMessage(event);
            }
          }
        } catch {
          // Silently ignore query errors during polling
        }
      }

      lastPolledTimestamp = now;
    } catch {
      // Silently ignore polling errors
    }
  }

  function stopPolling(): void {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  async function handleIncomingMessage(event: NostrEvent): Promise<void> {
    const currentUser = usersStore.currentUser.value;
    if (!currentUser?.pubkeyHex) {
      console.warn("[Chat] No current user pubkey, cannot process message");
      return;
    }

    // Check if we already have this message/event
    const existingMsg =
      (await db.chatMessages.where("nostrEventId").equals(event.id).first()) ||
      (await db.chatConversations.where("id").equals(event.id).first()); // Check conv ID for kind 40 too
    if (existingMsg) {
      console.log("[Chat] ⏭️ Skipping duplicate event:", event.id.slice(0, 8));
      return;
    }

    try {
      // HANDLE GROUP CHAT MESSAGE (NIP-29)
      if (event.kind === NOSTR_KINDS.GROUP_CHAT_MESSAGE) {
        // Skip if it's my own message
        if (event.pubkey === currentUser.pubkeyHex) {
          console.log("[Chat] Skipping own message");
          return;
        }

        // Verify company code if in team mode (fallback filter may include unwanted messages)
        // Check BOTH #t (standard) and #c (custom) tags for compatibility
        if (
          company.isCompanyCodeEnabled.value &&
          company.companyCodeHash.value
        ) {
          const expectedTeamTag = `team:${company.companyCodeHash.value}`;
          const messageTeamTag = event.tags.find((t) => t[0] === "t")?.[1];
          const messageCompanyCode = event.tags.find((t) => t[0] === "c")?.[1];

          // Accept if EITHER tag matches
          const teamTagMatches = messageTeamTag === expectedTeamTag;
          const companyCodeMatches =
            messageCompanyCode === company.companyCodeHash.value;

          if (!teamTagMatches && !companyCodeMatches) {
            console.log(
              "[Chat] Ignoring message from different team:",
              messageTeamTag || messageCompanyCode
            );
            return; // Silently ignore messages from different companies
          }
        }

        const channelId =
          event.tags.find((t) => t[0] === "h")?.[1] ||
          event.tags.find((t) => t[0] === "e")?.[1];

        if (!channelId) {
          console.warn("[Chat] Kind 9 message without channel ID");
          return;
        }

        let conversation = conversations.value.find((c) => c.id === channelId);

        if (!conversation) {
          // Check if this conversation was deleted
          const wasDeleted = await db.deletedConversations.get(channelId);
          if (wasDeleted) {
            console.log(
              "[Chat] Ignoring message for deleted channel:",
              channelId.slice(0, 16)
            );
            return;
          }

          console.warn(
            "[Chat] Channel not found, fetching metadata:",
            channelId.slice(0, 16)
          );

          // Fetch channel metadata BEFORE creating to get isPrivate and key
          if ($nostr?.pool) {
            try {
              const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
              const channelMetadata = await $nostr.pool.querySync(relayUrls, {
                kinds: [NOSTR_KINDS.CHANNEL_CREATE],
                ids: [channelId],
                limit: 1,
              });

              if (channelMetadata.length > 0) {
                const metadata = channelMetadata[0];
                let channelData: any = {};
                
                try {
                  channelData = JSON.parse(metadata.content);
                } catch (e) {
                  console.warn("[Chat] Failed to parse channel metadata");
                }

                // If private channel, try to get the key from Nostr data sync
                let channelKey: string | undefined;
                if (channelData.isPrivate && company.isCompanyCodeEnabled.value) {
                  try {
                    const syncedConv = await nostrData.getConversation(channelId);
                    channelKey = syncedConv?.key;
                    console.log("[Chat] 🔑 Retrieved channel key from sync:", !!channelKey);
                  } catch (e) {
                    console.warn("[Chat] Failed to get channel key from sync");
                  }
                }

                conversation = {
                  id: channelId,
                  type: "channel",
                  participants: [],
                  groupName: channelData.name || "Team Channel",
                  groupAvatar: channelData.picture,
                  lastMessage: {
                    content: "",
                    timestamp: 0,
                    senderName: "",
                  },
                  unreadCount: 0,
                  isPinned: false,
                  isMuted: false,
                  isPrivate: channelData.isPrivate || false,
                  key: channelKey,
                  shopId: channelData.shopId,
                  scope: channelData.scope,
                  tags: channelData.tags,
                  isReadOnly: channelData.isReadOnly,
                  memberPubkeys: [],
                };
                
                console.log("[Chat] ✅ Channel metadata fetched, isPrivate:", conversation.isPrivate, "hasKey:", !!conversation.key);
              } else {
                // No metadata found, create placeholder
                conversation = {
                  id: channelId,
                  type: "channel",
                  participants: [],
                  groupName: "Team Channel",
                  lastMessage: {
                    content: "",
                    timestamp: 0,
                    senderName: "",
                  },
                  unreadCount: 0,
                  isPinned: false,
                  isMuted: false,
                };
              }
            } catch (e) {
              console.error("[Chat] Failed to fetch channel metadata:", e);
              // Create placeholder on error
              conversation = {
                id: channelId,
                type: "channel",
                participants: [],
                groupName: "Team Channel",
                lastMessage: {
                  content: "",
                  timestamp: 0,
                  senderName: "",
                },
                unreadCount: 0,
                isPinned: false,
                isMuted: false,
              };
            }
          } else {
            // No nostr pool, create placeholder
            conversation = {
              id: channelId,
              type: "channel",
              participants: [],
              groupName: "Team Channel",
              lastMessage: {
                content: "",
                timestamp: 0,
                senderName: "",
              },
              unreadCount: 0,
              isPinned: false,
              isMuted: false,
            };
          }

          conversations.value.unshift(conversation);
          await saveConversationToLocal(conversation);
        }

        // Parse message content
        let content = event.content;

        // Decrypt if this is a private channel
        if (conversation.isPrivate && conversation.key) {
          content = decryptChannelMessage(event.content, conversation.key);
        } else if (conversation.isPrivate && !conversation.key) {
          // No key available - request access
          console.warn(
            "[Chat] 🔒 Private channel message but no key available"
          );
          
          // Auto-request access once
          const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
          if (currentPubkey && !conversation.memberPubkeys?.includes(currentPubkey)) {
            console.log("[Chat] 🔑 Auto-requesting channel access...");
            requestChannelAccess(channelId).catch((e) =>
              console.error("[Chat] Failed to request access:", e)
            );
          }
          
          content = "🔒 [Private Channel - Requesting Access...]";
        } else {
          // Try to parse as JSON for non-private channels
          try {
            const parsed = JSON.parse(event.content);
            content = parsed.content || event.content;
          } catch {
            // Content is plain text
          }
        }

        // Get sender info
        const sender = usersStore.users.value.find(
          (u) => u.pubkeyHex === event.pubkey
        );

        // Extract reply context from tags (NIP-10)
        const replyTag = event.tags.find(
          (t) => t[0] === "e" && t[3] === "reply"
        );
        let replyToId: string | undefined;
        let replyToContent: string | undefined;
        let replyToSender: string | undefined;

        if (replyTag) {
          replyToId = replyTag[1];
          // Try to find the original message in current messages
          const channelMessages = messages.value.get(channelId) || [];
          const originalMsg = channelMessages.find(
            (m) => m.nostrEventId === replyToId || m.id === replyToId
          );
          if (originalMsg) {
            replyToContent = originalMsg.content.slice(0, 100);
            replyToSender = originalMsg.senderName;
          }
        }

        const newMessage: ChatMessage = {
          id: event.id,
          conversationId: channelId,
          senderPubkey: event.pubkey,
          senderName: sender?.name || "Unknown",
          senderAvatar: sender?.avatar,
          recipientPubkey: "",
          content,
          timestamp: event.created_at * 1000,
          status: "delivered",
          nostrEventId: event.id,
          replyToId,
          replyToContent,
          replyToSender,
        };

        // Add to messages
        const currentMessages = messages.value.get(channelId) || [];
        messages.value.set(channelId, [...currentMessages, newMessage]);
        await saveMessageToLocal(newMessage);

        // Update conversation
        conversation.lastMessage = {
          content,
          timestamp: newMessage.timestamp,
          senderName: newMessage.senderName,
        };
        conversation.unreadCount += 1;
        await saveConversationToLocal(conversation);

        // Move conversation to top (like WhatsApp/Telegram)
        const index = conversations.value.findIndex((c) => c.id === channelId);
        if (index > 0) {
          const [movedConv] = conversations.value.splice(index, 1);
          conversations.value.unshift(movedConv);
        }

        // Play sound and show notification
        sound.playNotification();

        // Show push notification if not currently viewing this conversation
        if (activeConversationId.value !== channelId && !conversation.isMuted) {
          showPushNotification(
            conversation.groupName || "Team Chat",
            `${newMessage.senderName}: ${content.slice(0, 100)}`,
            channelId,
            conversation.groupAvatar
          );
        }

        console.log(
          "[Chat] 🔔 New message notification triggered for channel:",
          channelId.slice(0, 8) + "..."
        );
        return;
      }

      // HANDLE DIRECT MESSAGE (NIP-04)
      if (event.kind === NOSTR_KINDS.ENCRYPTED_DM) {
        console.log(
          "[Chat] 💬 Processing DM from:",
          event.pubkey.slice(0, 8) + "..."
        );

        // Skip if it's my own message
        if (event.pubkey === currentUser.pubkeyHex) {
          console.log("[Chat] ⏭️ Skipping own DM");
          return;
        }

        // Decrypt message
        console.log("[Chat] 🔓 Decrypting DM...");
        const content = await decryptMessage(event.content, event.pubkey);
        console.log("[Chat] ✅ DM decrypted, length:", content.length);

        // CHECK FOR INVITE OR ACCESS REQUEST
        try {
          const parsed = JSON.parse(content);
          
          // Handle channel invite
          if (
            parsed.type === "channel_invite" &&
            parsed.channelId &&
            parsed.key
          ) {
            // It's a channel invite!
            console.log("[Chat] 🔑 Received channel invite:", parsed.channelName);
            
            // Check if we already have this channel
            let existingConv = conversations.value.find(
              (c) => c.id === parsed.channelId
            );
            if (existingConv) {
              // Update key if missing
              if (!existingConv.key) {
                existingConv.key = parsed.key;
                existingConv.isPrivate = true;
                
                // Add self to member list
                const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
                if (currentPubkey) {
                  if (!existingConv.memberPubkeys) {
                    existingConv.memberPubkeys = [];
                  }
                  if (!existingConv.memberPubkeys.includes(currentPubkey)) {
                    existingConv.memberPubkeys.push(currentPubkey);
                  }
                }
                
                await saveConversationToLocal(existingConv);
                console.log("[Chat] ✅ Channel key updated, can now decrypt messages");
              }
            } else {
              // Create new channel placeholder with key
              const currentPubkey = usersStore.currentUser.value?.pubkeyHex;
              const newConv: ChatConversation = {
                id: parsed.channelId,
                type: "channel",
                participants: [],
                groupName: parsed.channelName || "Private Channel",
                lastMessage: {
                  content: "You were invited to this private channel",
                  timestamp: event.created_at * 1000,
                  senderName: "System",
                },
                unreadCount: 1,
                isPinned: false,
                isMuted: false,
                isPrivate: true,
                key: parsed.key,
                memberPubkeys: currentPubkey ? [currentPubkey] : [],
              };
              conversations.value.unshift(newConv);
              await saveConversationToLocal(newConv);
              sound.playSuccess();
              console.log("[Chat] ✅ Private channel created from invite");
            }
            return; // Stop processing as normal DM
          }
          
          // Handle channel access request
          if (
            parsed.type === "channel_access_request" &&
            parsed.channelId &&
            parsed.requestedBy
          ) {
            console.log("[Chat] 🔐 Received access request for channel:", parsed.channelName);
            
            // Check if we have this channel and own it
            const channel = conversations.value.find((c) => c.id === parsed.channelId);
            if (channel && channel.key) {
              // We have the channel - auto-invite the requester
              try {
                await inviteToChannel(parsed.channelId, parsed.requestedBy);
                console.log("[Chat] ✅ Auto-invited requester to private channel");
              } catch (err) {
                console.error("[Chat] Failed to auto-invite:", err);
              }
            }
            return; // Stop processing as normal DM
          }
        } catch (e) {
          // Not JSON, normal DM
        }

        const conversationId = generateConversationId(
          currentUser.pubkeyHex,
          event.pubkey
        );

        // Find sender info
        const sender = usersStore.users.value.find(
          (u) => u.pubkeyHex === event.pubkey
        );
        const senderName = sender?.name || `User ${event.pubkey.slice(0, 8)}`;

        const message: ChatMessage = {
          id: generateMessageId(),
          conversationId,
          senderPubkey: event.pubkey,
          senderName,
          senderAvatar: sender?.avatar,
          recipientPubkey: currentUser.pubkeyHex,
          content,
          timestamp: event.created_at * 1000,
          status: "delivered",
          nostrEventId: event.id,
        };

        await saveMessageToLocal(message);

        // Update state
        const currentMessages = messages.value.get(conversationId) || [];
        messages.value.set(conversationId, [...currentMessages, message]);

        await updateConversationWithMessage(
          conversationId,
          event.pubkey,
          senderName,
          message
        );

        // Notify
        if (activeConversationId.value !== conversationId) {
          const conv = conversations.value.find((c) => c.id === conversationId);
          if (conv && !conv.isMuted) {
            conv.unreadCount++;
            await saveConversationToLocal(conv);
            sound.playNotification();

            if (!isOpen.value) {
              // Show push notification if permission granted
              const messagePreview =
                message.content.length > 60
                  ? message.content.substring(0, 60) + "..."
                  : message.content;

              showPushNotification(
                `💬 ${senderName}`,
                messagePreview,
                conversationId
              );

              // Also show toast as fallback
              const toast = useToast();
              toast.add({
                title: senderName,
                description: messagePreview,
                icon: "i-heroicons-chat-bubble-left-right",
                timeout: 5000,
                click: () => {
                  openChat();
                  selectConversation(conversationId);
                },
              });
            }
          }
        }

        // Move conversation to top (like WhatsApp/Telegram)
        const index = conversations.value.findIndex(
          (c) => c.id === conversationId
        );
        if (index > 0) {
          const [movedConv] = conversations.value.splice(index, 1);
          conversations.value.unshift(movedConv);
        }

        return;
      }

      // HANDLE CHANNEL CREATION (NIP-28)
      else if (event.kind === NOSTR_KINDS.CHANNEL_CREATE) {
        const content = JSON.parse(event.content);
        const conversationId = event.id;

        const newConversation: ChatConversation = {
          id: conversationId,
          type: "channel",
          participants: [],
          groupName: content.name || "Unnamed Channel",
          lastMessage: {
            content: content.about || "Channel created",
            timestamp: event.created_at * 1000,
            senderName: "System",
          },
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          isPrivate: content.isPrivate || false,
        };

        // Check if exists (might be loaded from local)
        const existing = conversations.value.find(
          (c) => c.id === conversationId
        );
        if (!existing) {
          conversations.value.unshift(newConversation);
          await saveConversationToLocal(newConversation);
        } else {
          // Update metadata if it exists
          if (content.isPrivate !== undefined)
            existing.isPrivate = content.isPrivate;
          await saveConversationToLocal(existing);
        }
      }
      // HANDLE CHANNEL MESSAGE (NIP-28)
      else if (event.kind === NOSTR_KINDS.CHANNEL_MESSAGE) {
        const rootTag =
          event.tags.find((t) => t[0] === "e" && t[3] === "root") ||
          event.tags.find((t) => t[0] === "e");

        if (!rootTag || !rootTag[1]) return;
        const channelId = rootTag[1];

        // Ensure we know about this channel
        let conv = conversations.value.find((c) => c.id === channelId);

        if (!conv) {
          // Placeholder creation if we missed channel creation event
          conv = {
            id: channelId,
            type: "channel",
            participants: [],
            groupName: "Unknown Channel",
            lastMessage: {
              content: "",
              timestamp: 0,
              senderName: "",
            },
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
          };
          conversations.value.unshift(conv);
          // We should ideally fetch channel metadata here
        }

        const sender = usersStore.users.value.find(
          (u) => u.pubkeyHex === event.pubkey
        );
        const senderName = sender?.name || `User ${event.pubkey.slice(0, 8)}`;

        let content = event.content;
        // Decrypt if private
        if (conv.isPrivate && conv.key) {
          content = decryptChannelMessage(event.content, conv.key);
        } else if (conv.isPrivate && !conv.key) {
          content = "🔒 Encrypted Message (Key missing)";
        }

        const message: ChatMessage = {
          id: generateMessageId(),
          conversationId: channelId,
          senderPubkey: event.pubkey,
          senderName,
          senderAvatar: sender?.avatar,
          recipientPubkey: "",
          content: content,
          timestamp: event.created_at * 1000,
          status: "delivered",
          nostrEventId: event.id,
        };

        await saveMessageToLocal(message);

        // Update memory
        const currentMessages = messages.value.get(channelId) || [];
        messages.value.set(channelId, [...currentMessages, message]);

        await updateConversationWithMessage(
          channelId,
          "",
          "",
          message,
          "channel",
          conv.groupName
        );

        // Notify
        if (
          activeConversationId.value !== channelId &&
          event.pubkey !== currentUser.pubkeyHex &&
          !conv.isMuted
        ) {
          conv.unreadCount++;
          await saveConversationToLocal(conv);
          sound.playNotification();

          if (!isOpen.value) {
            const toast = useToast();
            toast.add({
              title: `#${conv.groupName} - ${senderName}`,
              description:
                message.content.length > 60
                  ? message.content.substring(0, 60) + "..."
                  : message.content,
              icon: "i-heroicons-hashtag",
              timeout: 5000,
              click: () => {
                openChat();
                selectConversation(channelId);
              },
            });
          }
        }
      }

      // HANDLE TYPING INDICATOR (Ephemeral)
      else if (event.kind === NOSTR_KINDS.TYPING_INDICATOR) {
        // Skip typing indicators from our own pubkey - only show OTHER users typing
        if (event.pubkey === currentUser.pubkeyHex) {
          return;
        }

        // Skip old typing events (> 5 seconds old) for performance
        const eventAge = Math.floor(Date.now() / 1000) - event.created_at;
        if (eventAge > 5) {
          return;
        }

        try {
          const data = JSON.parse(event.content);
          const conversationId = data.conversation;

          if (!conversationId) return;

          // Check if we already have a recent typing indicator for this user
          const existingConvTyping = typingUsers.value.get(conversationId);
          const existingTyping = existingConvTyping?.get(event.pubkey);

          // Only update if no existing typing or it's been > 2 seconds (debounce)
          if (existingTyping && Date.now() - existingTyping.timestamp < 2000) {
            return; // Skip duplicate typing events
          }

          // Get sender info
          const sender = usersStore.users.value.find(
            (u) => u.pubkeyHex === event.pubkey
          );
          const senderName = sender?.name || `User ${event.pubkey.slice(0, 8)}`;

          // Update typing state - need to trigger reactivity by creating new Map
          const newTypingUsers = new Map(typingUsers.value);
          if (!newTypingUsers.has(conversationId)) {
            newTypingUsers.set(conversationId, new Map());
          }

          const convTyping = newTypingUsers.get(conversationId)!;
          convTyping.set(event.pubkey, {
            name: senderName,
            timestamp: Date.now(),
          });

          // Reassign to trigger Vue reactivity
          typingUsers.value = newTypingUsers;

          // Auto-remove after 4 seconds
          setTimeout(() => {
            const newTypingUsers = new Map(typingUsers.value);
            const convTyping = newTypingUsers.get(conversationId);
            if (convTyping) {
              convTyping.delete(event.pubkey);
              // Reassign to trigger Vue reactivity
              typingUsers.value = newTypingUsers;
            }
          }, 4000);
        } catch (e) {
          console.error("[Chat] Failed to parse typing indicator:", e);
        }
        return;
      }

      // HANDLE REACTION (NIP-25)
      else if (event.kind === NOSTR_KINDS.REACTION) {
        console.log(
          "[Chat] 😀 Received reaction:",
          event.content,
          "from:",
          event.pubkey.slice(0, 8) + "..."
        );

        try {
          const emoji = event.content;
          const messageId = event.tags.find((t) => t[0] === "e")?.[1];

          if (!messageId) {
            console.warn("[Chat] Reaction without message reference");
            return;
          }

          // Find the message in all conversations
          let targetMessage: ChatMessage | undefined;
          let targetConversationId: string | undefined;

          for (const [conversationId, msgs] of messages.value) {
            const msg = msgs.find(
              (m) => m.id === messageId || m.nostrEventId === messageId
            );
            if (msg) {
              targetMessage = msg;
              targetConversationId = conversationId;
              break;
            }
          }

          if (!targetMessage || !targetConversationId) {
            return;
          }

          // Get sender info
          const sender = usersStore.users.value.find(
            (u) => u.pubkeyHex === event.pubkey
          );
          const senderName = sender?.name || `User ${event.pubkey.slice(0, 8)}`;

          // Initialize reactions if needed
          if (!targetMessage.reactions) {
            targetMessage.reactions = new Map();
          }

          // Get or create emoji reactions array
          const emojiReactions = targetMessage.reactions.get(emoji) || [];

          // Check if this user already reacted with this emoji
          const existingIndex = emojiReactions.findIndex(
            (r) => r.pubkey === event.pubkey
          );

          if (existingIndex === -1) {
            emojiReactions.push({
              emoji,
              pubkey: event.pubkey,
              name: senderName,
              timestamp: event.created_at * 1000,
              eventId: event.id,
            });
            targetMessage.reactions.set(emoji, emojiReactions);
            console.log("[Chat] 😀 Reaction added to message");

            // Save to database to persist
            await saveMessageToLocal(targetMessage);
          }
        } catch (e) {
          console.error("[Chat] Failed to process reaction:", e);
        }
        return;
      }

      // HANDLE DELETION EVENT (NIP-09) - for unreacting
      else if (event.kind === 5) {
        console.log(
          "[Chat] 🗑️ Received deletion event from:",
          event.pubkey.slice(0, 8) + "..."
        );

        try {
          // Find the event ID being deleted
          const deletedEventId = event.tags.find((t) => t[0] === "e")?.[1];
          if (!deletedEventId) return;

          // Search for this event ID in reactions and remove it
          for (const [_conversationId, msgs] of messages.value) {
            for (const msg of msgs) {
              if (!msg.reactions) continue;

              // Check each emoji's reactions
              for (const [emoji, reactions] of msg.reactions) {
                const reactionIndex = reactions.findIndex(
                  (r) =>
                    r.eventId === deletedEventId && r.pubkey === event.pubkey
                );
                if (reactionIndex !== -1) {
                  reactions.splice(reactionIndex, 1);
                  if (reactions.length === 0) {
                    msg.reactions.delete(emoji);
                  }
                  console.log("[Chat] 🗑️ Removed reaction via deletion event");

                  // Save to database to persist
                  await saveMessageToLocal(msg);
                  return;
                }
              }
            }
          }
        } catch (e) {
          console.error("[Chat] Failed to process deletion event:", e);
        }
        return;
      }
    } catch (e) {
      console.error("[Chat] Failed to process incoming message:", e);
    }
  }

  /**
   * Load older messages when user scrolls up (pagination)
   * Returns true if more messages were loaded, false if no more
   */
  async function loadOlderMessages(conversationId: string): Promise<boolean> {
    if (isLoadingMore.value) return false;

    const conv = conversations.value.find((c) => c.id === conversationId);
    if (!conv) return false;

    // Check if we know there are no more messages
    if (hasMoreMessages.value.get(conversationId) === false) {
      return false;
    }

    isLoadingMore.value = true;
    const limit = 30;

    try {
      // Get oldest message timestamp for this conversation
      const currentMessages = messages.value.get(conversationId) || [];
      const oldestTimestamp =
        currentMessages.length > 0
          ? Math.min(...currentMessages.map((m) => m.timestamp))
          : Date.now();

      // Convert to unix timestamp (seconds)
      const untilTimestamp = Math.floor(oldestTimestamp / 1000) - 1;

      if (!$nostr?.pool) {
        isLoadingMore.value = false;
        return false;
      }

      const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
      let newEventsCount = 0;

      if (conv.type === "channel" || conv.type === "group") {
        // Fetch older channel messages
        const filters: Record<string, unknown>[] = [
          {
            kinds: [NOSTR_KINDS.GROUP_CHAT_MESSAGE],
            "#h": [conversationId],
            until: untilTimestamp,
            limit,
          },
        ];

        // Add team filter if in team mode
        if (company.companyCodeHash.value) {
          const teamTag = `team:${company.companyCodeHash.value}`;
          filters.push({
            kinds: [NOSTR_KINDS.GROUP_CHAT_MESSAGE],
            "#t": [teamTag],
            until: untilTimestamp,
            limit,
          });
        }

        for (const filter of filters) {
          const events = await $nostr.pool.querySync(
            relayUrls,
            filter as Parameters<typeof $nostr.pool.querySync>[1]
          );

          for (const event of events) {
            // Check if we already have this message
            const existing = await db.chatMessages
              .where("nostrEventId")
              .equals(event.id)
              .first();
            if (existing) continue;

            // Verify channel ID
            const eventChannelId =
              event.tags.find((t: string[]) => t[0] === "h")?.[1] ||
              event.tags.find((t: string[]) => t[0] === "e")?.[1];
            if (eventChannelId !== conversationId) continue;

            // Find sender info
            const sender = usersStore.users.value.find(
              (u) => u.pubkeyHex === event.pubkey
            );
            const senderName =
              sender?.name || `User ${event.pubkey.slice(0, 8)}`;

            let messageContent = event.content;
            if (conv.isPrivate && conv.key) {
              try {
                messageContent = decryptChannelMessage(event.content, conv.key);
              } catch {
                messageContent = "[Encrypted]";
              }
            }

            const message: ChatMessage = {
              id: `msg_${event.id.slice(0, 12)}`,
              conversationId,
              senderPubkey: event.pubkey,
              senderName,
              senderAvatar: sender?.avatar,
              recipientPubkey: "",
              content: messageContent,
              timestamp: event.created_at * 1000,
              status: "delivered",
              nostrEventId: event.id,
            };

            await saveMessageToLocal(message);
            newEventsCount++;
          }
        }
      } else if (conv.type === "direct") {
        // Fetch older DMs
        const keys = getUserKeys();
        if (!keys?.pubkey || !keys?.privkey) {
          isLoadingMore.value = false;
          return false;
        }

        const otherPubkey = conv.participants.find(
          (p) => p.pubkey !== keys.pubkey
        )?.pubkey;
        if (!otherPubkey) {
          isLoadingMore.value = false;
          return false;
        }

        const filters = [
          {
            kinds: [NOSTR_KINDS.ENCRYPTED_DM],
            authors: [otherPubkey],
            "#p": [keys.pubkey],
            until: untilTimestamp,
            limit,
          },
          {
            kinds: [NOSTR_KINDS.ENCRYPTED_DM],
            authors: [keys.pubkey],
            "#p": [otherPubkey],
            until: untilTimestamp,
            limit,
          },
        ];

        for (const filter of filters) {
          const events = await $nostr.pool.querySync(
            relayUrls,
            filter as Parameters<typeof $nostr.pool.querySync>[1]
          );

          for (const event of events) {
            const existing = await db.chatMessages
              .where("nostrEventId")
              .equals(event.id)
              .first();
            if (existing) continue;

            try {
              const privateKeyHex = nostrKey.decodePrivateKey(keys.privkey!);
              const privateKey = hexToBytes(privateKeyHex);
              const otherPartyPubkey =
                event.pubkey === keys.pubkey ? otherPubkey : event.pubkey;
              const decryptedContent = await nip04.decrypt(
                privateKey,
                otherPartyPubkey,
                event.content
              );

              const sender = usersStore.users.value.find(
                (u) => u.pubkeyHex === event.pubkey
              );

              const message: ChatMessage = {
                id: `msg_${event.id.slice(0, 12)}`,
                conversationId,
                senderPubkey: event.pubkey,
                senderName: sender?.name || `User ${event.pubkey.slice(0, 8)}`,
                senderAvatar: sender?.avatar,
                recipientPubkey:
                  event.pubkey === keys.pubkey ? otherPubkey : keys.pubkey,
                content: decryptedContent,
                timestamp: event.created_at * 1000,
                status: "delivered",
                nostrEventId: event.id,
              };

              await saveMessageToLocal(message);
              newEventsCount++;
            } catch {
              // Skip messages we can't decrypt
            }
          }
        }
      }

      // Reload messages from local DB
      const msgs = await loadMessagesForConversation(conversationId);
      messages.value.set(conversationId, msgs);

      // Update pagination state
      if (newEventsCount < limit / 2) {
        // If we got less than half the limit, probably no more messages
        hasMoreMessages.value.set(conversationId, false);
      }

      console.log("[Chat] 📜 Loaded", newEventsCount, "older messages");
      isLoadingMore.value = false;
      return newEventsCount > 0;
    } catch (e) {
      console.error("[Chat] Failed to load older messages:", e);
      isLoadingMore.value = false;
      return false;
    }
  }

  async function selectConversation(conversationId: string): Promise<void> {
    console.log(
      "[Chat] 📂 Selecting conversation:",
      conversationId.slice(0, 16) + "..."
    );
    activeConversationId.value = conversationId;

    // Load messages if not cached
    if (!messages.value.has(conversationId)) {
      const msgs = await loadMessagesForConversation(conversationId);
      messages.value.set(conversationId, msgs);
    }

    // Sync reactions for existing messages when opening conversation
    const msgs = messages.value.get(conversationId) || [];
    if (msgs.length > 0) {
      const messageEventIds = msgs
        .filter((m) => m.nostrEventId)
        .map((m) => m.nostrEventId!);
      
      if (messageEventIds.length > 0) {
        // Fetch latest reactions in background
        fetchReactionsForMessages(messageEventIds).then(async (reactionsMap) => {
          let updated = false;
          for (const msg of msgs) {
            if (msg.nostrEventId && reactionsMap.has(msg.nostrEventId)) {
              msg.reactions = reactionsMap.get(msg.nostrEventId);
              await saveMessageToLocal(msg);
              updated = true;
            }
          }
          
          // Reload if any reactions were updated
          if (updated) {
            const updatedMsgs = await loadMessagesForConversation(conversationId);
            messages.value.set(conversationId, updatedMsgs);
          }
        }).catch((e) => {
          console.error("[Chat] Failed to sync reactions:", e);
        });
      }
    }

    // Find the conversation to determine type
    const conv = conversations.value.find((c) => c.id === conversationId);

    if (conv) {
      // For channels/groups, fetch from relays to get historical messages
      if (conv.type === "channel" || conv.type === "group") {
        console.log("[Chat] 🌐 Fetching channel messages in background...");
        fetchChannelMessagesFromRelay(conversationId).catch((e) => {
          console.error("[Chat] Background channel fetch failed:", e);
        });
      }
      // For DMs, fetch from relays to get historical messages
      else if (conv.type === "direct") {
        const keys = getUserKeys();
        if (keys?.pubkey) {
          // Find the other participant's pubkey
          const otherParticipant = conv.participants.find(
            (p) => p.pubkey !== keys.pubkey
          );
          if (otherParticipant?.pubkey) {
            console.log("[Chat] 🌐 Fetching DM messages in background...");
            fetchDMsFromRelay(otherParticipant.pubkey).catch((e) => {
              console.error("[Chat] Background DM fetch failed:", e);
            });
          }
        }
      }
    }

    // Mark as read
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      await saveConversationToLocal(conv);
    }
  }

  async function startNewChat(contact: ChatContact): Promise<void> {
    const currentUser = usersStore.currentUser.value;
    if (!currentUser?.pubkeyHex) return;

    const conversationId = generateConversationId(
      currentUser.pubkeyHex,
      contact.pubkey
    );

    // Check if conversation already exists
    const existing = conversations.value.find((c) => c.id === conversationId);
    if (existing) {
      await selectConversation(conversationId);
      return;
    }

    // Create new conversation
    const newConversation: ChatConversation = {
      id: conversationId,
      type: "direct",
      participants: [
        {
          pubkey: currentUser.pubkeyHex,
          name: currentUser.name,
          avatar: currentUser.avatar,
        },
        { pubkey: contact.pubkey, name: contact.name, avatar: contact.avatar },
      ],
      lastMessage: {
        content: "",
        timestamp: Date.now(),
        senderName: "",
      },
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
    };

    conversations.value.unshift(newConversation);
    await saveConversationToLocal(newConversation);
    await selectConversation(conversationId);
  }

  async function togglePinConversation(conversationId: string): Promise<void> {
    const conv = conversations.value.find((c) => c.id === conversationId);
    if (conv) {
      conv.isPinned = !conv.isPinned;
      await saveConversationToLocal(conv);
    }
  }

  async function toggleMuteConversation(conversationId: string): Promise<void> {
    const conv = conversations.value.find((c) => c.id === conversationId);
    if (conv) {
      conv.isMuted = !conv.isMuted;
      await saveConversationToLocal(conv);
    }
  }

  async function deleteConversation(conversationId: string): Promise<void> {
    const keys = getUserKeys();
    const conv = conversations.value.find((c) => c.id === conversationId);
    
    // Get all messages in this conversation
    const msgs = await db.chatMessages
      .where("conversationId")
      .equals(conversationId)
      .toArray();

    // Publish deletion events to Nostr
    if (keys?.pubkey && keys?.privkey && $nostr?.pool) {
      try {
        const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
        const privateKey = hexToBytes(nostrKey.decodePrivateKey(keys.privkey));

        // If it's a channel and user is the creator, delete the channel itself
        if (conv?.type === "channel" || conv?.type === "group") {
          // Check if this user created the channel (conversation ID is the channel event ID)
          // Try to find the channel creation event
          const channelCreationEvents = await $nostr.pool.querySync(relayUrls, {
            kinds: [NOSTR_KINDS.CHANNEL_CREATE],
            ids: [conversationId],
            authors: [keys.pubkey], // Only if we created it
            limit: 1,
          });

          if (channelCreationEvents.length > 0) {
            // We created this channel, publish deletion for the channel itself
            const channelDeletionEvent = {
              kind: NOSTR_KINDS.DELETION,
              content: "Channel deleted by creator",
              tags: [["e", conversationId], ["k", String(NOSTR_KINDS.CHANNEL_CREATE)]],
              created_at: Math.floor(Date.now() / 1000),
            };

            const signedChannelDeletion = $nostr.finalizeEvent(channelDeletionEvent, privateKey);
            await $nostr.pool.publish(relayUrls, signedChannelDeletion);
            console.log("[Chat] 🗑️ Channel deleted on Nostr");
          }
        }

        // Delete our own messages in the conversation
        const myMessages = msgs.filter(
          (m) => m.senderPubkey === keys.pubkey && m.nostrEventId
        );

        if (myMessages.length > 0) {
          const deletionEvent = {
            kind: NOSTR_KINDS.DELETION,
            content: "Messages deleted by user",
            tags: myMessages.map((m) => ["e", m.nostrEventId!]),
            created_at: Math.floor(Date.now() / 1000),
          };

          const signedEvent = $nostr.finalizeEvent(deletionEvent, privateKey);
          await $nostr.pool.publish(relayUrls, signedEvent);
          console.log("[Chat] 🗑️ Messages deleted on Nostr");
        }
      } catch (e) {
        console.error("[Chat] Failed to publish deletion events to Nostr:", e);
        // Continue with local deletion even if Nostr publish fails
      }
    }

    // Mark as deleted (so it doesn't reappear after refresh)
    await db.deletedConversations.put({
      id: conversationId,
      deletedAt: Date.now(),
    });

    // Delete from local DB
    await db.chatConversations.delete(conversationId);
    await db.chatMessages
      .where("conversationId")
      .equals(conversationId)
      .delete();

    // Remove from state
    conversations.value = conversations.value.filter(
      (c) => c.id !== conversationId
    );
    messages.value.delete(conversationId);

    if (activeConversationId.value === conversationId) {
      activeConversationId.value = null;
    }
  }

  // ============================================
  // Initialize
  // ============================================

  /**
   * Sync team conversations from Nostr
   * Fetches channel metadata and updates existing conversations
   */
  async function syncConversations(): Promise<void> {
    if (!company.isCompanyCodeEnabled.value || !company.companyCodeHash.value) {
      // Solo mode: only local conversations
      return;
    }

    try {
      // Load deleted conversation IDs to filter them out
      const deletedIds = new Set(
        (await db.deletedConversations.toArray()).map((d) => d.id)
      );

      // Query team conversations by company code hash
      const teamConversations = await nostrData.getAllConversations({
        companyCodeHash: company.companyCodeHash.value,
      });

      // Merge with local conversations
      for (const conv of teamConversations) {
        // Skip if this conversation was deleted locally
        if (deletedIds.has(conv.id)) {
          console.log(
            "[Chat] Skipping deleted conversation:",
            conv.id.slice(0, 16)
          );
          continue;
        }

        const existingIndex = conversations.value.findIndex(
          (c) => c.id === conv.id
        );

        if (existingIndex >= 0) {
          // UPDATE existing conversation metadata (fixes "Unknown Channel")
          const existing = conversations.value[existingIndex]!;
          if (conv.groupName && existing.groupName !== conv.groupName) {
            existing.groupName = conv.groupName;
            existing.groupAvatar = conv.groupAvatar;
            existing.scope = conv.scope;
            existing.tags = conv.tags;
            existing.isPrivate = conv.isPrivate || existing.isPrivate;
            existing.key = conv.key || existing.key; // Update key if provided
            await saveConversationToLocal(existing);
          }
        } else {
          // ADD new conversation
          const newConv: ChatConversation = {
            id: conv.id,
            type: conv.type,
            participants: [],
            groupName: conv.groupName || "Unknown Channel",
            groupAvatar: conv.groupAvatar,
            lastMessage: {
              content: "Channel synced from team",
              timestamp: Date.now(),
              senderName: "System",
            },
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
            isPrivate: conv.isPrivate || false,
            key: conv.key, // Load encryption key from Nostr
            shopId: conv.shopId,
            scope: conv.scope,
            tags: conv.tags,
            isReadOnly: conv.isReadOnly,
            memberPubkeys: conv.memberPubkeys,
          };
          conversations.value.push(newConv);
          await saveConversationToLocal(newConv);
        }
      }
    } catch (e) {
      console.error("[Chat] Failed to sync conversations:", e);
    }
  }

  /**
   * Subscribe to real-time conversation updates
   * Replaces setInterval polling with efficient Nostr subscription
   */
  let conversationSubscription: { close: () => void } | null = null;

  async function subscribeToConversations(): Promise<void> {
    if (!company.isCompanyCodeEnabled.value || !company.companyCodeHash.value) {
      return;
    }

    if (!$nostr?.pool) {
      console.warn(
        "[Chat] Nostr pool not available for conversation subscription"
      );
      return;
    }

    const relayUrls = DEFAULT_RELAYS.map((r) => r.url);
    const teamTag = `team:${company.companyCodeHash.value}`;

    console.log(
      "[Chat] 📢 Subscribing to conversation updates for team:",
      teamTag.slice(0, 32) + "..."
    );

    // Subscribe to team channel updates (BOTH standard #t and custom #c tags)
    const conversationFilters = [
      {
        kinds: [NOSTR_KINDS.CHAT_CHANNEL],
        "#t": [teamTag], // Standard #t tag - better relay support
        since: Math.floor(Date.now() / 1000),
      },
      {
        kinds: [NOSTR_KINDS.CHAT_CHANNEL],
        "#c": [company.companyCodeHash.value], // Custom #c - backward compatibility
        since: Math.floor(Date.now() / 1000),
      },
    ];

    // Cast to satisfy nostr-tools type requirements
    // nostr-tools expects Filter[], but our dynamic filters need explicit cast
    conversationSubscription = $nostr.pool.subscribeMany(
      relayUrls,
      conversationFilters as unknown as Parameters<
        typeof $nostr.pool.subscribeMany
      >[1],
      {
        async onevent(event: NostrEvent) {
          try {
            // Check if content is encrypted
            const isEncrypted = event.tags.find(
              (t) => t[0] === "encrypted" && t[1] === "true"
            );

            // Parse conversation from event
            let data;
            if (isEncrypted) {
              // Decrypt the content first
              data = await nostrData.decryptData(event.content);
              if (!data) {
                console.warn("[Chat] Failed to decrypt conversation data");
                return;
              }
            } else {
              data = JSON.parse(event.content);
            }

            // Validate required fields
            if (!data.id || typeof data.id !== "string") {
              console.warn(
                "[Chat] Invalid conversation data - missing or invalid ID:",
                data
              );
              return;
            }

            const existingIndex = conversations.value.findIndex(
              (c) => c.id === data.id
            );

            if (existingIndex >= 0) {
              // Update existing
              const existing = conversations.value[existingIndex]!;
              existing.groupName = data.groupName || existing.groupName;
              existing.groupAvatar = data.groupAvatar;
              existing.scope = data.scope;
              existing.tags = data.tags;
              existing.isPrivate = data.isPrivate || existing.isPrivate;
              existing.key = data.key || existing.key; // Update key if provided
              await saveConversationToLocal(existing);
            } else {
              // Add new conversation
              const newConv: ChatConversation = {
                id: data.id,
                type: data.type || "channel",
                participants: [],
                groupName: data.groupName || "Unknown Channel",
                groupAvatar: data.groupAvatar,
                lastMessage: {
                  content: "Channel created",
                  timestamp: Date.now(),
                  senderName: "System",
                },
                unreadCount: 0,
                isPinned: false,
                isMuted: false,
                isPrivate: data.isPrivate || false,
                key: data.key, // Load encryption key from real-time update
                shopId: data.shopId,
                scope: data.scope,
                tags: data.tags,
                isReadOnly: data.isReadOnly,
                memberPubkeys: data.memberPubkeys,
              };
              conversations.value.push(newConv);
              await saveConversationToLocal(newConv);
            }
          } catch (e) {
            console.warn("[Chat] Failed to process conversation event:", e);
          }
        },
        oneose() {
          // Conversation subscription established
        },
      }
    );
  }

  async function init(): Promise<void> {
    isLoading.value = true;
    try {
      console.log("[Chat] 🚀 Initializing chat...");

      // Request notification permission on first init
      await requestNotificationPermission();

      await loadConversationsFromLocal();

      // NEW: Initial sync + real-time subscription (NO setInterval!)
      if (company.isCompanyCodeEnabled.value) {
        await syncConversations();
        await subscribeToConversations(); // Real-time updates!
      }

      await subscribeToMessages();
      console.log("[Chat] ✅ Chat initialized successfully");
    } catch (e) {
      console.error("[Chat] Failed to initialize:", e);
    }
    isLoading.value = false;
  }

  /**
   * Refresh subscriptions (useful when user changes or contacts are updated)
   */
  async function refreshSubscriptions(): Promise<void> {
    console.log("[Chat] 🔄 Refreshing subscriptions...");
    cleanup();
    await subscribeToMessages();
    if (company.isCompanyCodeEnabled.value) {
      await subscribeToConversations();
    }
  }

  function cleanup(): void {
    console.log("[Chat] 🧹 Cleaning up subscriptions...");
    if (chatSubscription) {
      chatSubscription.close();
      chatSubscription = null;
    }
    if (conversationSubscription) {
      conversationSubscription.close();
      conversationSubscription = null;
    }
    stopPolling();
  }

  /**
   * Debug function to test subscription connectivity
   * Call this from browser console: useChat().testSubscription()
   */
  async function testSubscription(): Promise<void> {
    console.log("[Chat] 🧪 Testing subscription...");
    console.log("[Chat] 🧪 chatSubscription exists:", !!chatSubscription);

    if (!$nostr?.pool) {
      console.error("[Chat] 🧪 No Nostr pool available!");
      return;
    }

    const relayUrls = DEFAULT_RELAYS.map((r) => r.url);

    // Check relay connection status
    for (const url of relayUrls) {
      try {
        const relay = await $nostr.pool.ensureRelay(url);
        console.log("[Chat] 🧪 Relay", url, "connected:", relay.connected);
      } catch (e) {
        console.error("[Chat] 🧪 Failed to check relay:", url, e);
      }
    }
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    conversations,
    messages,
    activeConversationId,
    isLoading,
    isSending,
    isOpen,
    searchQuery,
    typingUsers,

    // Computed
    unreadCount,
    activeConversation,
    activeMessages,
    filteredConversations,
    sortedConversations,
    availableContacts,

    // Functions
    init,
    cleanup,
    refreshSubscriptions, // NEW: For re-subscribing when user/contacts change
    openChat,
    closeChat,
    toggleChat,
    startNewChat,
    sendMessage,
    createChannel,
    sendChannelMessage,
    inviteToChannel,
    requestChannelAccess,
    selectConversation,
    deleteConversation,
    togglePinConversation,
    toggleMuteConversation,

    // NEW: Shop Context & Filtering
    getShopChannels,
    getCompanyChannels,
    getDepartmentChannels,
    canAccessChannel,
    addChannelMember,
    removeChannelMember,
    getChannelMembers,

    // Typing Indicators
    handleTyping,
    stopTyping,
    getTypingUsers,

    // Push Notifications
    requestNotificationPermission,

    // Message Reactions
    addReaction,
    removeReaction,
    getMessageReactions,

    // Message Search
    searchMessages,
    searchInConversation,

    // Fetch historical messages
    fetchChannelMessagesFromRelay,
    fetchDMsFromRelay,
    loadOlderMessages,
    isLoadingMore,
    hasMoreMessages,

    // Utilities
    generateConversationId,

    // Debug
    testSubscription,
  };
}
