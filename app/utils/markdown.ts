/**
 * Simple Markdown Parser
 * Converts basic markdown to HTML without external dependencies
 * Supports: **bold**, *italic*, `code`, [links](url), and line breaks
 */

export function parseMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML to prevent XSS
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

    // Headers (# ## ###)
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-base font-semibold mt-2 mb-1">$1</h3>'
    )
    .replace(
      /^## (.+)$/gm,
      '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>'
    )
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-2">$1</h1>')

    // Bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')

    // Italic (*text* or _text_)
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    .replace(/_([^_]+)_/g, '<em class="italic">$1</em>')

    // Code (`code`)
    .replace(
      /`([^`]+)`/g,
      '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">$1</code>'
    )

    // Links [text](url)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="text-primary-500 hover:underline">$1</a>'
    )

    // Unordered lists (- item or * item)
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')

    // Blockquotes (> text)
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="pl-3 border-l-2 border-gray-300 dark:border-gray-600 italic text-gray-600 dark:text-gray-400">$1</blockquote>'
    )

    // Line breaks
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, "<br>");

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith("<h") && !html.startsWith("<p")) {
    html = `<p>${html}</p>`;
  }

  return html;
}

/**
 * Strip markdown to plain text (for previews/summaries)
 */
export function stripMarkdown(text: string): string {
  if (!text) return "";

  return (
    text
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic markers
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove code backticks
      .replace(/`([^`]+)`/g, "$1")
      // Convert links to just text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove list markers
      .replace(/^[*-]\s+/gm, "")
      // Remove blockquote markers
      .replace(/^>\s+/gm, "")
      .trim()
  );
}
