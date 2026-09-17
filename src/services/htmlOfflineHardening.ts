const OFFLINE_FALLBACK_MARKER = 'data-documint-offline-fallback="true"';
const INLINE_APP_SCRIPT_ANCHOR = "  <script>\n  (function () {";

const OFFLINE_FALLBACK_BOOTSTRAP = `  <script ${OFFLINE_FALLBACK_MARKER}>
  (function () {
    if (typeof window.hljs === 'undefined') {
      window.hljs = {
        highlightElement: function () {}
      };
    }

    if (typeof window.mermaid === 'undefined') {
      window.mermaid = {
        initialize: function () {},
        render: function () {
          return Promise.reject(new Error(
            'Mermaid library unavailable. Diagram source is preserved for offline viewing.'
          ));
        }
      };
    }
  })();
  </script>`;

/**
 * Keeps generated documentation usable when optional CDN assets cannot load.
 * The real CDN globals win when available. When offline, the lightweight stubs
 * allow the existing page bootstrap to continue: syntax highlighting becomes a
 * no-op and Mermaid rendering enters its existing caught-error/source fallback.
 */
export function hardenGeneratedHtmlForOffline(html: string): string {
  if (!html || html.includes(OFFLINE_FALLBACK_MARKER)) {
    return html;
  }

  const anchorIndex = html.indexOf(INLINE_APP_SCRIPT_ANCHOR);
  if (anchorIndex < 0) {
    return html;
  }

  return (
    html.slice(0, anchorIndex) +
    `${OFFLINE_FALLBACK_BOOTSTRAP}\n` +
    html.slice(anchorIndex)
  );
}
