/**
 * Escapes source-derived text so it stays plain text when passed through
 * Markdown renderers. Local documentation treats comments/titles/descriptions
 * as evidence, never as trusted Markdown or HTML.
 */
export function escapeMarkdownPlainText(value: string): string {
  return String(value)
    .replace(/[\r\n]+/g, " ")
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}\[\]()#+\-.!>])/g, "\\$1");
}

export function escapeMarkdownTableText(value: string): string {
  return escapeMarkdownPlainText(value).replace(/\|/g, "\\|");
}
