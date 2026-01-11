/**
 * 🛡️ Auth Middleware
 *
 * Protects routes requiring authentication.
 * Supports both Hasura Auth (JWT), Nostr (NIP-07), and Staff (PIN/password) authentication.
 */

export default defineNuxtRouteMiddleware((to, _from) => {
  // Skip auth pages
  const publicPaths = [
    "/auth/signin",
    "/auth/signup",
    "/auth/callback",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
    "/auth/join", // Staff invite join page
    "/order", // Customer order page (public)
  ];

  if (publicPaths.some((path) => to.path.startsWith(path))) {
    return;
  }

  // Check authentication from all sources
  const nostrPubkey = useCookie("nostr-pubkey");
  const staffUserId = useCookie("staff-user-id"); // Staff login cookie

  const isAuthenticated = !!nostrPubkey.value || !!staffUserId.value;

  if (!isAuthenticated && to.meta.auth !== false) {
    // Redirect to sign in with return URL
    return navigateTo({
      path: "/auth/signin",
      query: { redirect: to.fullPath },
    });
  }
});
