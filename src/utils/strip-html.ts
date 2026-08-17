const BLOCK_LEVEL_TAG_PATTERN = /<\/(p|div|li|h[1-6]|tr|section|article)>/gi;
const LINE_BREAK_TAG_PATTERN = /<br\s*\/?>/gi;
const LIST_ITEM_OPEN_PATTERN = /<li[^>]*>/gi;
const SCRIPT_OR_STYLE_PATTERN = /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi;
const ANY_TAG_PATTERN = /<[^>]+>/g;
const EXCESS_BLANK_LINES_PATTERN = /\n{3,}/g;
const TRAILING_SPACES_PATTERN = /[ \t]+$/gm;

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

/**
 * Converts job-description HTML into readable plain text.
 *
 * Descriptions go straight into LLM prompts, so this preserves the paragraph and
 * list breaks that carry meaning ("Requirements:" followed by bullets) rather
 * than flattening everything into one run-on line.
 */
export function stripHtml(html: string): string {
  return html
    .replace(SCRIPT_OR_STYLE_PATTERN, "")
    .replace(LINE_BREAK_TAG_PATTERN, "\n")
    .replace(LIST_ITEM_OPEN_PATTERN, "• ")
    .replace(BLOCK_LEVEL_TAG_PATTERN, "\n")
    .replace(ANY_TAG_PATTERN, "")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(TRAILING_SPACES_PATTERN, "")
    .replace(EXCESS_BLANK_LINES_PATTERN, "\n\n")
    .trim();
}
