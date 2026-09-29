export interface GeneratedTimestamp {
  month: string;
  day: string;
  year: string;
  time: string;
}

export interface HtmlExternalAssets {
  highlightThemeLink: string;
  externalScriptTags: string;
  highlightThemeDark: string;
  highlightThemeLight: string;
}

export interface HtmlLocalSurfaceChrome {
  tocHtml: string;
  keyboardHints: string;
}

export function formatGeneratedTimestamp(value: string): GeneratedTimestamp {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      month: new Intl.DateTimeFormat("en-US", { month: "short" })
        .format(parsed)
        .toUpperCase(),
      day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(parsed),
      year: new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(parsed),
      time: new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(parsed),
    };
  }

  const [datePart, timePart] = value.split(",").map((part) => part.trim());
  return {
    month: "DATE",
    day: datePart || value,
    year: "",
    time: timePart || value,
  };
}

export function resolveHtmlExternalAssets(
  enabled: boolean,
): HtmlExternalAssets {
  if (!enabled) {
    return {
      highlightThemeLink: "",
      externalScriptTags: "",
      highlightThemeDark: "",
      highlightThemeLight: "",
    };
  }

  return {
    highlightThemeLink:
      '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" id="hljs-theme">',
    externalScriptTags:
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.0/mermaid.min.js"></script>',
    highlightThemeDark:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css",
    highlightThemeLight:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css",
  };
}

export function resolveHtmlLocalSurfaceChrome(
  hasLocalCodeMap: boolean,
): HtmlLocalSurfaceChrome {
  return hasLocalCodeMap
    ? {
        tocHtml:
          '<ul><li><a class="toc-link level-1" href="#documint-local-code-map"><span class="toc-text">Project map</span></a></li></ul>',
        keyboardHints:
          '<kbd>Ctrl/⌘ K</kbd> Files &nbsp; <kbd>/</kbd> Docs &nbsp; <kbd>T</kbd> Theme',
      }
    : {
        tocHtml: "",
        keyboardHints: '<kbd>/</kbd> Search &nbsp; <kbd>T</kbd> Theme',
      };
}
