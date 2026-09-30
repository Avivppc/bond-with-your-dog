import sanitizeHtml from "sanitize-html";

/**
 * Lesson bodies are written in the admin rich-text editor and rendered to students
 * with dangerouslySetInnerHTML, so they are sanitized on WRITE (server action) and
 * stored clean. Only the formatting the editor can produce is allowed.
 */
const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "code", "pre", "hr"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["https", "http", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs): sanitizeHtml.Tag => {
      const href = attribs.href ?? "";
      return SAFE_HREF.test(href)
        ? { tagName, attribs: { href, target: "_blank", rel: "noopener noreferrer nofollow" } }
        : { tagName, attribs: {} };
    },
  },
  exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren?.length,
};

export function sanitizeLessonHtml(html: string): string {
  const clean = sanitizeHtml(html ?? "", OPTIONS).trim();
  return clean.replace(/^(<p><\/p>)+$/, "");
}
