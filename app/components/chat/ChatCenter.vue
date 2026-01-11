<script setup lang="ts">
/**
 * 💬 Chat Center
 * Main slideover component for employee messaging
 * Mobile-optimized with responsive drawer and touch-friendly controls
 */
import type { ChatContact, ChatConversation } from "~/composables/use-chat";

const { t } = useI18n();
const chat = useChat();

// Local state
const messageInput = ref("");
const showNewChatModal = ref(false);
const showCreateChannelModal = ref(false);
const showEmojiPicker = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

// Reactions & Threading state
const showReactionPicker = ref<string | null>(null); // Message ID for which picker is shown
const customEmojiInput = ref<string>(""); // Custom emoji input
const replyingTo = ref<any | null>(null); // Message being replied to
const searchQuery = ref("");
const searchResults = ref<any[]>([]);

// Mobile state
const showMobileConversations = ref(true); // Show conversation list on mobile by default
const isMobile = ref(false);

// Detect mobile device
onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768; // md breakpoint
    if (!isMobile.value) {
      showMobileConversations.value = true; // Always show on desktop
    }
  };
  checkMobile();
  window.addEventListener("resize", checkMobile);

  onUnmounted(() => {
    window.removeEventListener("resize", checkMobile);
  });
});

// Create Channel Form
const newChannelName = ref("");
const newChannelAbout = ref("");
const isCreatingChannel = ref(false);
const isPrivateChannel = ref(false);
const newChannelScope = ref<"shop" | "company" | "department">("shop");
const newChannelTags = ref<string[]>([]);
const newChannelShopId = ref<string | undefined>(undefined);

// Invite Modal
const showInviteModal = ref(false);
const inviteSearchQuery = ref("");

// Delete confirmation
const showDeleteConfirm = ref(false);
const conversationToDelete = ref<string | null>(null);

// Get current shop ID
const currentShopId = computed(() => {
  const shop = useShop();
  return shop.currentBranch.value?.id || "";
});

const directMessages = computed(() => {
  return chat.sortedConversations.value.filter((c) => c.type === "direct");
});

// TEMPORARY: Keep old channels computed for backward compatibility
// TODO: Remove after template is fully updated
const channels = computed(() => {
  return chat.sortedConversations.value.filter(
    (c) => c.type === "channel" || c.type === "group"
  );
});

// Handle conversation selection on mobile
const selectConversationMobile = async (conversationId: string) => {
  await chat.selectConversation(conversationId);
  if (isMobile.value) {
    showMobileConversations.value = false; // Hide conversation list, show chat
  }
};

// Back to conversations on mobile
const backToConversations = () => {
  if (isMobile.value) {
    showMobileConversations.value = true;
    chat.activeConversationId.value = null;
  }
};

// Initialize chat on mount
onMounted(async () => {
  await chat.init();
});

onUnmounted(() => {
  chat.cleanup();
});

// Auto-scroll to bottom when new messages arrive
watch(
  () => chat.activeMessages.value.length,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop =
          messagesContainer.value.scrollHeight;
      }
    });
  }
);

// Handle sending message
const sendMessage = async () => {
  if (!messageInput.value.trim() || !chat.activeConversation.value) return;

  const content = messageInput.value.trim();
  const replyToId = replyingTo.value?.id;
  messageInput.value = "";
  replyingTo.value = null; // Clear reply state

  if (chat.activeConversation.value.type === "channel") {
    await chat.sendChannelMessage(
      chat.activeConversation.value.id,
      content,
      replyToId
    );
  } else {
    const recipient = chat.activeConversation.value.participants.find(
      (p) => p.pubkey !== useUsers().currentUser.value?.pubkeyHex
    );

    if (!recipient) return;

    await chat.sendMessage(recipient.pubkey, content, recipient.name);
  }
};

// Reactions (includes Bitcoin/Lightning for crypto payments)
const reactionEmojis = [
  "⚡",
  "₿",
  "👍",
  "❤️",
  "😂",
  "🎉",
  "👏",
  "🔥",
  "💰",
  "✅",
];

const toggleReaction = async (messageId: string, emoji: string) => {
  if (!chat.activeConversationId.value) return;

  const reactions = chat.getMessageReactions(
    messageId,
    chat.activeConversationId.value
  );
  const currentUser = useUsers().currentUser.value;
  const emojiReactions = reactions.get(emoji) || [];
  const hasReacted = emojiReactions.some(
    (r) => r.pubkey === currentUser?.pubkeyHex
  );

  if (hasReacted) {
    await chat.removeReaction(
      messageId,
      emoji,
      chat.activeConversationId.value
    );
  } else {
    await chat.addReaction(messageId, emoji, chat.activeConversationId.value);
  }

  showReactionPicker.value = null; // Close picker
  customEmojiInput.value = ""; // Clear custom input
};

// Add custom emoji reaction
const addCustomReaction = async (messageId: string) => {
  const emoji = customEmojiInput.value.trim();
  if (!emoji || !chat.activeConversationId.value) return;

  await chat.addReaction(messageId, emoji, chat.activeConversationId.value);
  showReactionPicker.value = null;
  customEmojiInput.value = "";
};

// Reply to message
const startReply = (message: any) => {
  replyingTo.value = message;
  showReactionPicker.value = null;
};

const cancelReply = () => {
  replyingTo.value = null;
};

// Search
const performSearch = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }

  if (chat.activeConversationId.value) {
    searchResults.value = await chat.searchInConversation(
      chat.activeConversationId.value,
      searchQuery.value
    );
  } else {
    searchResults.value = await chat.searchMessages(searchQuery.value);
  }
};

// Handle Enter key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

// Format timestamp
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return `Yesterday ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Get other participant in direct chat
const getOtherParticipant = (conversation: ChatConversation) => {
  const currentPubkey = useUsers().currentUser.value?.pubkeyHex;
  return conversation.participants.find((p) => p.pubkey !== currentPubkey);
};

// Check if message is from current user
const isMyMessage = (senderPubkey: string) => {
  return senderPubkey === useUsers().currentUser.value?.pubkeyHex;
};

// Start new chat with selected contact
const startChat = async (contact: ChatContact) => {
  await chat.startNewChat(contact);
  showNewChatModal.value = false;
};

const createChannel = async () => {
  if (!newChannelName.value.trim()) return;

  isCreatingChannel.value = true;

  // Determine shopId based on scope
  const shopId =
    newChannelScope.value === "shop"
      ? newChannelShopId.value || currentShopId.value
      : undefined;

  await chat.createChannel(
    newChannelName.value,
    newChannelAbout.value,
    isPrivateChannel.value,
    shopId,
    newChannelScope.value,
    newChannelTags.value
  );

  isCreatingChannel.value = false;
  showCreateChannelModal.value = false;

  // Reset form
  newChannelName.value = "";
  newChannelAbout.value = "";
  isPrivateChannel.value = false;
  newChannelScope.value = "shop";
  newChannelTags.value = [];
  newChannelShopId.value = undefined;
};

const inviteUser = async (user: ChatContact) => {
  if (!chat.activeConversationId.value) return;

  await chat.inviteToChannel(chat.activeConversationId.value, user.pubkey);
  showInviteModal.value = false;
  // Optional: show toast notification
};

// Simple emojis for quick access
const quickEmojis = ["👍", "❤️", "😊", "🎉", "👏", "🙏", "✅", "💯"];

const insertEmoji = (emoji: string) => {
  messageInput.value += emoji;
  showEmojiPicker.value = false;
};

// Mobile keyboard handling
const handleFocus = () => {
  if (isMobile.value) {
    // Scroll to bottom when keyboard opens
    nextTick(() => {
      messagesContainer.value?.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: "smooth",
      });
    });
  }
};

// Typing indicator handling
const handleTypingIndicator = () => {
  if (chat.activeConversationId.value) {
    chat.handleTyping(chat.activeConversationId.value);
  }
};

// Handle scroll for loading older messages
const handleMessagesScroll = async (e: Event) => {
  const container = e.target as HTMLElement;

  // If scrolled near top (within 100px), load older messages
  if (container.scrollTop < 100 && chat.activeConversationId.value) {
    const previousHeight = container.scrollHeight;
    const loaded = await chat.loadOlderMessages(
      chat.activeConversationId.value
    );

    // Maintain scroll position after loading older messages
    if (loaded) {
      nextTick(() => {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - previousHeight;
      });
    }
  }
};

// Get typing users for active conversation
const typingText = computed(() => {
  if (!chat.activeConversationId.value) return "";

  const users = chat.getTypingUsers.value(chat.activeConversationId.value);
  if (users.length === 0) return "";
  if (users.length === 1) return `${users[0]} is typing...`;
  if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
  return `${users[0]} and ${users.length - 1} others are typing...`;
});

// Delete conversation with confirmation
const confirmDelete = () => {
  if (!chat.activeConversationId.value) return;
  conversationToDelete.value = chat.activeConversationId.value;
  showDeleteConfirm.value = true;
};

const deleteConversation = async () => {
  if (!conversationToDelete.value) return;
  
  await chat.deleteConversation(conversationToDelete.value);
  showDeleteConfirm.value = false;
  conversationToDelete.value = null;
  
  // Go back on mobile
  if (isMobile.value) {
    backToConversations();
  }
};
</script>

<template>
  <USlideover
    v-model:open="chat.isOpen.value"
    :title="t('chat.title', 'Team Chat')"
    :description="t('chat.description', 'Message your team members')"
    side="right"
    :ui="{ content: 'max-w-2xl md:max-w-3xl lg:max-w-4xl', body: 'p-0 sm:p-0' }"
  >
    <template #body>
      <div class="flex h-full relative">
        <!-- Conversation List (Responsive: Full width on mobile, sidebar on desktop) -->
        <div
          v-show="!isMobile || showMobileConversations"
          class="w-full md:w-72 lg:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900/50"
          :class="{
            'absolute inset-0 z-10 md:relative':
              isMobile && showMobileConversations,
          }"
        >
          <!-- Search & New Chat -->
          <div
            class="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2"
          >
            <div class="flex gap-2">
              <UInput
                v-model="chat.searchQuery.value"
                :placeholder="t('chat.search', 'Search...')"
                icon="i-heroicons-magnifying-glass"
                size="sm"
                class="flex-1"
              />
            </div>
            <div class="flex gap-2">
              <UButton
                block
                icon="i-heroicons-hashtag"
                color="gray"
                :size="isMobile ? 'md' : 'sm'"
                variant="solid"
                class="flex-1 min-h-11"
                @click="showCreateChannelModal = true"
              >
                {{ t("chat.newChannel", "New Channel") }}
              </UButton>
              <UButton
                block
                icon="i-heroicons-user-plus"
                color="primary"
                :size="isMobile ? 'md' : 'sm'"
                variant="solid"
                class="flex-1 min-h-11"
                @click="showNewChatModal = true"
              >
                {{ t("chat.newDM", "New DM") }}
              </UButton>
            </div>
          </div>

          <!-- Conversations -->
          <div class="flex-1 overflow-y-auto p-2 space-y-4">
            <!-- Channels Section -->
            <div v-if="channels.length > 0 || chat.searchQuery.value">
              <h4
                class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
              >
                {{ t("chat.channels", "Channels") }}
              </h4>
              <div class="space-y-1">
                <button
                  v-for="conversation in channels"
                  :key="conversation.id"
                  class="w-full text-left p-3 min-h-[56px] rounded-md transition-all hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-98"
                  :class="{
                    'bg-primary-50 dark:bg-primary-900/20':
                      chat.activeConversationId.value === conversation.id,
                  }"
                  @click="selectConversationMobile(conversation.id)"
                >
                  <div class="flex items-center gap-2">
                    <div
                      class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400"
                    >
                      <UIcon
                        v-if="conversation.isPrivate"
                        name="i-heroicons-lock-closed"
                        class="w-4 h-4"
                      />
                      <span v-else>#</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span
                          class="font-medium text-sm text-gray-900 dark:text-white truncate"
                        >
                          {{ conversation.groupName }}
                        </span>
                        <span
                          v-if="conversation.unreadCount > 0"
                          class="flex-shrink-0 min-w-[1.25rem] h-5 rounded-full bg-primary-500 text-white text-[10px] px-1 flex items-center justify-center font-bold"
                        >
                          {{
                            conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                <div
                  v-if="channels.length === 0 && chat.searchQuery.value"
                  class="px-2 text-sm text-gray-400"
                >
                  {{ t("chat.noChannelsFound", "No channels found") }}
                </div>
              </div>
            </div>

            <!-- DMs Section -->
            <div>
              <h4
                class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
              >
                {{ t("chat.directMessages", "Direct Messages") }}
              </h4>
              <div class="space-y-1">
                <button
                  v-for="conversation in directMessages"
                  :key="conversation.id"
                  class="w-full text-left p-3 min-h-[64px] rounded-md transition-all hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-98"
                  :class="{
                    'bg-primary-50 dark:bg-primary-900/20':
                      chat.activeConversationId.value === conversation.id,
                  }"
                  @click="selectConversationMobile(conversation.id)"
                >
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <div
                        class="w-8 h-8 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold"
                      >
                        {{
                          getOtherParticipant(conversation)?.name?.charAt(0) ||
                          "?"
                        }}
                      </div>
                      <div
                        v-if="conversation.isPinned"
                        class="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center text-[8px]"
                      >
                        📌
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span
                          class="font-medium text-sm text-gray-900 dark:text-white truncate"
                        >
                          {{ getOtherParticipant(conversation)?.name }}
                        </span>
                        <span
                          class="text-[10px] text-gray-400 whitespace-nowrap"
                        >
                          {{ formatTime(conversation.lastMessage.timestamp) }}
                        </span>
                      </div>
                      <div class="flex items-center justify-between mt-0.5">
                        <p class="text-xs text-gray-500 truncate max-w-[120px]">
                          {{ conversation.lastMessage.content }}
                        </p>
                        <span
                          v-if="conversation.unreadCount > 0"
                          class="flex-shrink-0 min-w-[1.25rem] h-5 rounded-full bg-primary-500 text-white text-[10px] px-1 flex items-center justify-center font-bold"
                        >
                          {{
                            conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                <div
                  v-if="directMessages.length === 0"
                  class="px-2 text-sm text-gray-400 italic"
                >
                  {{ t("chat.noDMs", "No direct messages") }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Area (Responsive: Full width on mobile when conversation selected) -->
        <div
          v-show="!isMobile || !showMobileConversations"
          class="flex-1 flex flex-col bg-white dark:bg-gray-900"
          :class="{
            'absolute inset-0 z-20 md:relative':
              isMobile && !showMobileConversations,
          }"
        >
          <!-- Chat Header -->
          <div
            v-if="chat.activeConversation.value"
            class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between min-h-[64px]"
          >
            <div class="flex items-center gap-3">
              <!-- Mobile Back Button -->
              <button
                v-if="isMobile"
                class="min-w-11 min-h-11 -ml-2 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-transform"
                @click="backToConversations"
              >
                <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
              </button>
              <div
                v-if="chat.activeConversation.value.type === 'direct'"
                class="w-10 h-10 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold"
              >
                {{
                  getOtherParticipant(
                    chat.activeConversation.value
                  )?.name?.charAt(0) || "?"
                }}
              </div>
              <div
                v-else
                class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold"
              >
                <UIcon
                  v-if="chat.activeConversation.value.isPrivate"
                  name="i-heroicons-lock-closed"
                  class="w-5 h-5"
                />
                <span v-else>#</span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{
                    chat.activeConversation.value.type === "direct"
                      ? getOtherParticipant(chat.activeConversation.value)?.name
                      : chat.activeConversation.value.groupName
                  }}
                </h3>
                <p
                  v-if="chat.activeConversation.value.type === 'direct'"
                  class="text-xs text-gray-500"
                >
                  {{ t("chat.online", "Online") }}
                </p>
                <p
                  v-else-if="chat.activeConversation.value.isPrivate"
                  class="text-xs text-gray-500 flex items-center gap-1"
                >
                  <UIcon name="i-heroicons-lock-closed" class="w-3 h-3" />
                  {{ t("chat.privateChannel", "Private Channel") }}
                </p>
                <p v-else class="text-xs text-gray-500">
                  {{ t("chat.channel", "Public Channel") }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <UButton
                v-if="chat.activeConversation.value.type === 'direct'"
                icon="i-heroicons-phone"
                variant="ghost"
                color="gray"
                size="sm"
              />
              <UDropdownMenu
                :items="[
                [
                  {
                    label: chat.activeConversation.value.isPinned
                      ? t('chat.unpin', 'Unpin')
                      : t('chat.pin', 'Pin'),
                    icon: 'i-heroicons-bookmark',
                    onClick: () => chat.togglePinConversation(chat.activeConversationId.value!),
                  },
                  {
                    label: chat.activeConversation.value.isMuted
                      ? t('chat.unmute', 'Unmute')
                      : t('chat.mute', 'Mute'),
                    icon: 'i-heroicons-bell-slash',
                    onClick: () => chat.toggleMuteConversation(chat.activeConversationId.value!),
                  },
                ],
                [
                  ...(chat.activeConversation.value.isPrivate && chat.activeConversation.value.key ? [{
                    label: t('chat.invite', 'Invite Member'),
                    icon: 'i-heroicons-user-plus',
                    onClick: () => showInviteModal = true
                  }] : []),
                  {
                    label: t('chat.delete', 'Delete chat'),
                    icon: 'i-heroicons-trash',
                    color: 'red',
                    onClick: confirmDelete,
                  },
                ],
              ]"
              >
                <UButton
                  icon="i-heroicons-ellipsis-vertical"
                  variant="ghost"
                  color="gray"
                  size="sm"
                />
              </UDropdownMenu>
            </div>
          </div>

          <!-- Messages (Optimized scrolling) -->
          <div
            ref="messagesContainer"
            class="flex-1 overflow-y-auto p-4 space-y-4 messages-container"
            @scroll="handleMessagesScroll"
          >
            <!-- No conversation selected -->
            <div
              v-if="!chat.activeConversation.value"
              class="h-full flex flex-col items-center justify-center text-center"
            >
              <div class="text-6xl mb-4">💬</div>
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
              >
                {{ t("chat.selectConversation", "Select a conversation") }}
              </h3>
              <p class="text-sm text-gray-500 max-w-xs">
                {{
                  t(
                    "chat.selectHint",
                    "Choose a conversation from the list or start a new chat with a team member"
                  )
                }}
              </p>
            </div>

            <!-- Messages list -->
            <template v-else>
              <!-- Loading older messages indicator -->
              <div
                v-if="chat.isLoadingMore.value"
                class="flex justify-center py-2"
              >
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-4 h-4 animate-spin"
                  />
                  {{ t("chat.loadingOlder", "Loading older messages...") }}
                </div>
              </div>

              <!-- No more messages indicator -->
              <div
                v-else-if="chat.hasMoreMessages.value.get(chat.activeConversationId.value!) === false"
                class="flex justify-center py-2"
              >
                <span class="text-xs text-gray-400">
                  {{ t("chat.noMoreMessages", "No older messages") }}
                </span>
              </div>

              <!-- Scroll up hint -->
              <div
                v-else-if="chat.activeMessages.value.length >= 10"
                class="flex justify-center py-2"
              >
                <span class="text-xs text-gray-400">
                  ↑
                  {{ t("chat.scrollForMore", "Scroll up for older messages") }}
                </span>
              </div>

              <div
                v-for="(message, index) in chat.activeMessages.value"
                :key="message.id"
                class="flex gap-2"
                :class="{
                  'flex-row-reverse': isMyMessage(message.senderPubkey),
                  'flex-row': !isMyMessage(message.senderPubkey),
                  'mt-1':
                    index > 0 &&
                    chat.activeMessages.value?.[index - 1]?.senderPubkey ===
                      message.senderPubkey,
                  'mt-4':
                    index > 0 &&
                    chat.activeMessages.value?.[index - 1]?.senderPubkey !==
                      message.senderPubkey,
                }"
              >
                <!-- Avatar (only show for first message in group) -->
                <div
                  v-if="
                    !isMyMessage(message.senderPubkey) &&
                    (index === 0 ||
                      chat.activeMessages.value?.[index - 1]?.senderPubkey !==
                        message.senderPubkey)
                  "
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                >
                  {{ message.senderName?.charAt(0).toUpperCase() }}
                </div>
                <div
                  v-else-if="!isMyMessage(message.senderPubkey)"
                  class="w-8 flex-shrink-0"
                />

                <div
                  class="flex flex-col max-w-[75%]"
                  :class="{
                    'items-end': isMyMessage(message.senderPubkey),
                    'items-start': !isMyMessage(message.senderPubkey),
                  }"
                >
                  <!-- Sender Name (only in channels/groups and not me) -->
                  <span
                    v-if="
                      !isMyMessage(message.senderPubkey) &&
                      chat.activeConversation.value.type !== 'direct' &&
                      (index === 0 ||
                        chat.activeMessages.value?.[index - 1]?.senderPubkey !==
                          message.senderPubkey)
                    "
                    class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 px-1"
                  >
                    {{ message.senderName }}
                  </span>

                  <div class="group relative w-full">
                    <!-- Message Bubble -->
                    <div
                      class="rounded-2xl px-3.5 py-2.5 relative wrap-break-word shadow-sm"
                      :class="{
                        'bg-primary-500 text-white rounded-br-md': isMyMessage(
                          message.senderPubkey
                        ),
                        'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md':
                          !isMyMessage(message.senderPubkey),
                      }"
                    >
                      <!-- Reply Context -->
                      <div
                        v-if="message.replyToContent"
                        class="mb-2 pb-2 border-l-2 pl-2.5 opacity-75 text-xs rounded"
                        :class="{
                          'border-white bg-white/10': isMyMessage(
                            message.senderPubkey
                          ),
                          'border-primary-500 bg-gray-50 dark:bg-gray-700/50':
                            !isMyMessage(message.senderPubkey),
                        }"
                      >
                        <div class="font-semibold mb-0.5">
                          {{ message.replyToSender }}
                        </div>
                        <div class="line-clamp-2 opacity-80">
                          {{ message.replyToContent }}
                        </div>
                      </div>

                      <p
                        class="text-[13px] leading-relaxed whitespace-pre-wrap wrap-break-word"
                      >
                        {{ message.content }}
                      </p>
                      <div
                        class="flex items-center gap-1.5 mt-1.5"
                        :class="{
                          'justify-end': isMyMessage(message.senderPubkey),
                          'opacity-60': isMyMessage(message.senderPubkey),
                          'opacity-50': !isMyMessage(message.senderPubkey),
                        }"
                      >
                        <span class="text-[10px] font-medium whitespace-nowrap">
                          {{ formatTime(message.timestamp) }}
                        </span>
                        <!-- Status icons for sent messages -->
                        <UIcon
                          v-if="isMyMessage(message.senderPubkey)"
                          :name="
                            message.status === 'read'
                              ? 'i-heroicons-check-circle-solid'
                              : message.status === 'sent'
                              ? 'i-heroicons-check'
                              : message.status === 'failed'
                              ? 'i-heroicons-exclamation-circle'
                              : 'i-heroicons-clock'
                          "
                          class="w-3 h-3"
                        />
                      </div>

                      <!-- Message Action Buttons (show on hover) -->
                      <div
                        class="absolute top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        :class="{
                          'right-full mr-2': isMyMessage(message.senderPubkey),
                          'left-full ml-2': !isMyMessage(message.senderPubkey),
                        }"
                      >
                        <button
                          class="p-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
                          @click="
                            showReactionPicker =
                              showReactionPicker === message.id
                                ? null
                                : message.id
                          "
                        >
                          <UIcon
                            name="i-heroicons-face-smile"
                            class="w-4 h-4 text-gray-600 dark:text-gray-300"
                          />
                        </button>
                        <button
                          class="p-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
                          @click="startReply(message)"
                        >
                          <UIcon
                            name="i-heroicons-arrow-uturn-left"
                            class="w-4 h-4 text-gray-600 dark:text-gray-300"
                          />
                        </button>
                      </div>

                      <!-- Reaction Picker (Emoji Selector) -->
                      <div
                        v-if="showReactionPicker === message.id"
                        class="absolute bottom-full mb-2 p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20"
                        :class="{
                          'right-0': isMyMessage(message.senderPubkey),
                          'left-0': !isMyMessage(message.senderPubkey),
                        }"
                      >
                        <!-- Quick reactions -->
                        <div class="flex gap-1 mb-2">
                          <button
                            v-for="emoji in reactionEmojis"
                            :key="emoji"
                            class="min-w-9 min-h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-lg transition-all active:scale-90"
                            @click="toggleReaction(message.id, emoji)"
                          >
                            {{ emoji }}
                          </button>
                        </div>
                        <!-- Custom emoji input -->
                        <div
                          class="flex gap-1.5 border-t border-gray-200 dark:border-gray-700 pt-2"
                        >
                          <input
                            v-model="customEmojiInput"
                            type="text"
                            placeholder="Type emoji..."
                            maxlength="10"
                            class="flex-1 px-2.5 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            @keydown.enter="addCustomReaction(message.id)"
                          />
                          <button
                            @click="addCustomReaction(message.id)"
                            class="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 active:scale-95 transition-all"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Reactions Display -->
                    <div
                      v-if="message.reactions && message.reactions.size > 0"
                      class="flex flex-wrap gap-1.5 mt-1.5"
                    >
                      <button
                        v-for="[emoji, reactions] in message.reactions"
                        :key="emoji"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95 border"
                        :class="{
                          'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30':
                            reactions.some(
                              (r) =>
                                r.pubkey ===
                                useUsers().currentUser.value?.pubkeyHex
                            ),
                          'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700':
                            !reactions.some(
                              (r) =>
                                r.pubkey ===
                                useUsers().currentUser.value?.pubkeyHex
                            ),
                        }"
                        @click="toggleReaction(message.id, emoji)"
                        :title="reactions.map((r) => r.name).join(', ')"
                      >
                        <span class="text-sm leading-none">{{ emoji }}</span>
                        <span class="font-semibold leading-none">{{
                          reactions.length
                        }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div
                v-if="chat.activeMessages.value.length === 0"
                class="h-full flex flex-col items-center justify-center text-center opacity-50"
              >
                <div class="text-4xl mb-2">👋</div>
                <p class="text-sm text-gray-500">
                  {{ t("chat.startConversation", "Start the conversation!") }}
                </p>
              </div>
            </template>
          </div>

          <!-- Typing Indicator -->
          <div
            v-if="chat.activeConversation.value && typingText"
            class="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700"
          >
            <div
              class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
            >
              <div class="flex gap-1">
                <span
                  class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style="animation-delay: 0ms"
                ></span>
                <span
                  class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style="animation-delay: 150ms"
                ></span>
                <span
                  class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style="animation-delay: 300ms"
                ></span>
              </div>
              <span class="italic">{{ typingText }}</span>
            </div>
          </div>

          <!-- Message Input (Touch-optimized with safe area for mobile keyboards) -->
          <div
            v-if="chat.activeConversation.value"
            class="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            :class="{ 'pb-safe': isMobile }"
          >
            <!-- Reply Indicator -->
            <div
              v-if="replyingTo"
              class="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-between"
            >
              <div class="flex-1 min-w-0">
                <div
                  class="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1"
                >
                  Replying to {{ replyingTo.senderName }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {{ replyingTo.content }}
                </div>
              </div>
              <button
                @click="cancelReply"
                class="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
              </button>
            </div>

            <div class="flex items-end gap-2">
              <!-- Emoji picker -->
              <div class="relative">
                <UButton
                  icon="i-heroicons-face-smile"
                  variant="ghost"
                  color="gray"
                  :size="isMobile ? 'md' : 'sm'"
                  @click="showEmojiPicker = !showEmojiPicker"
                />
                <!-- Quick emoji panel (Touch-optimized) -->
                <div
                  v-if="showEmojiPicker"
                  class="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex gap-1 z-10"
                >
                  <button
                    v-for="emoji in quickEmojis"
                    :key="emoji"
                    class="min-w-11 min-h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl transition-colors active:scale-95"
                    @click="insertEmoji(emoji)"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>

              <!-- Input -->
              <div class="flex-1">
                <UTextarea
                  v-model="messageInput"
                  :placeholder="
                    'Message ' +
                    (chat.activeConversation.value.type === 'direct'
                      ? getOtherParticipant(chat.activeConversation.value)
                          ?.name || ''
                      : '#' + chat.activeConversation.value.groupName)
                  "
                  :rows="isMobile ? 2 : 1"
                  autoresize
                  :maxrows="isMobile ? 3 : 4"
                  class="w-full text-base md:text-sm"
                  @input="handleTypingIndicator"
                  @focus="handleFocus"
                  @keydown="handleKeydown"
                />
              </div>

              <!-- Send button (Touch-optimized) -->
              <div>
                <UButton
                  icon="i-heroicons-paper-airplane"
                  color="primary"
                  :size="isMobile ? 'lg' : 'md'"
                  :loading="chat.isSending.value"
                  :disabled="!messageInput.trim()"
                  @click="sendMessage"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <!-- New Chat Modal -->
  <UModal v-model:open="showNewChatModal">
    <template #header>
      <h3 class="text-lg font-semibold">{{ t("chat.newChat", "New Chat") }}</h3>
    </template>
    <template #body>
      <div class="p-4">
        <UInput
          :placeholder="t('chat.searchContacts', 'Search team members...')"
          icon="i-heroicons-magnifying-glass"
          class="mb-4 w-full"
        />

        <div class="space-y-2 max-h-80 overflow-y-auto">
          <div
            v-for="contact in chat.availableContacts.value"
            :key="contact.id"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            @click="startChat(contact)"
          >
            <div
              class="w-10 h-10 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold"
            >
              {{ contact.name.charAt(0) }}
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-white">
                {{ contact.name }}
              </p>
              <p class="text-xs text-gray-500">
                {{
                  contact.isOnline
                    ? t("chat.online", "Online")
                    : t("chat.offline", "Offline")
                }}
              </p>
            </div>
            <span
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-green-500': contact.isOnline,
                'bg-gray-400': !contact.isOnline,
              }"
            />
          </div>

          <div
            v-if="chat.availableContacts.value.length === 0"
            class="text-center py-8"
          >
            <div class="text-4xl mb-2">👥</div>
            <p class="text-sm text-gray-500">
              {{ t("chat.noContacts", "No team members available") }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Create Channel Modal -->
  <UModal v-model:open="showCreateChannelModal">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t("chat.createChannel", "Create Channel") }}
      </h3>
    </template>
    <template #body>
      <div class="p-4 space-y-4">
        <UFormField :label="t('chat.channelName', 'Channel Name')" required>
          <UInput
            v-model="newChannelName"
            placeholder="e.g. general, support"
            icon="i-heroicons-hashtag"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('chat.description', 'Description')">
          <UTextarea
            v-model="newChannelAbout"
            placeholder="What is this channel about?"
            class="w-full"
          />
        </UFormField>

        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="isPrivateChannel"
            :label="t('chat.privateChannel', 'Private Channel')"
          />
          <div class="text-xs text-gray-500">
            {{
              t("chat.privateHint", "Only invited members can read messages.")
            }}
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            color="gray"
            variant="ghost"
            @click="showCreateChannelModal = false"
          >
            {{ t("common.cancel", "Cancel") }}
          </UButton>
          <UButton
            color="primary"
            :loading="isCreatingChannel"
            :disabled="!newChannelName.trim()"
            @click="createChannel"
          >
            {{ t("chat.create", "Create") }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Invite Member Modal -->
  <UModal v-model:open="showInviteModal">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t("chat.inviteToChannel", "Invite to Channel") }}
      </h3>
    </template>
    <template #body>
      <div class="p-4">
        <UInput
          v-model="inviteSearchQuery"
          :placeholder="t('chat.searchContacts', 'Search team members...')"
          icon="i-heroicons-magnifying-glass"
          class="mb-4 w-full"
        />

        <div class="space-y-2 max-h-80 overflow-y-auto">
          <div
            v-for="contact in chat.availableContacts.value"
            :key="contact.id"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            @click="inviteUser(contact)"
          >
            <div
              class="w-10 h-10 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold"
            >
              {{ contact.name.charAt(0) }}
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-white">
                {{ contact.name }}
              </p>
            </div>
            <UButton
              size="xs"
              color="gray"
              variant="ghost"
              icon="i-heroicons-plus"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal v-model:open="showDeleteConfirm">
    <template #header>
      <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">
        {{ t("chat.deleteConfirm", "Delete Conversation?") }}
      </h3>
    </template>
    <template #body>
      <div class="p-4">
        <div class="flex items-start gap-3 mb-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">
              {{ 
                chat.activeConversation.value?.type === "direct" 
                  ? t("chat.deleteDirectWarning", "This will delete all messages in this conversation. This action cannot be undone.")
                  : t("chat.deleteChannelWarning", "This will delete the channel and all its messages from your device. This action cannot be undone.")
              }}
            </p>
            <p v-if="chat.activeConversation.value?.type !== 'direct'" class="text-xs text-gray-500 dark:text-gray-400">
              {{ t("chat.deleteChannelNote", "Note: This only deletes from your device. Other members can still access the channel.") }}
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <UButton
            color="gray"
            variant="ghost"
            @click="showDeleteConfirm = false"
          >
            {{ t("common.cancel", "Cancel") }}
          </UButton>
          <UButton
            color="red"
            @click="deleteConversation"
          >
            {{ t("chat.delete", "Delete") }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
/* Mobile safe area support */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}

/* Smooth scroll for messages */
.messages-container {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

/* Touch feedback */
.active\:scale-95:active {
  transform: scale(0.95);
}

.active\:scale-98:active {
  transform: scale(0.98);
}

/* Prevent text selection on buttons */
button {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
</style>
