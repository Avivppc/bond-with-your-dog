import sanitizeHtml from "sanitize-html";

/**
 * Rich text on website pages (written in the editor, shown with dangerouslySetInnerHTML), cleaned
 * when saved and again when shown. Like lesson text, but links may also point to site pages
 * ("/refund-policy") and in-page anchors, and only links to other sites open in a new tab.
 */
const SITE_PATH = /^\/(?![/\\])[^\s"<>]*$/;
const ANCHOR = /^#[A-Za-z0-9_-]+$/;
const EXTERNAL = /^https?:\/\//i;
const MAILTO = /^mailto:/i;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "code", "pre", "hr"],
  // Headings may carry an id so "#cookies"-style links into a page work.
  allowedAttributes: { a: ["href", "target", "rel"], h2: ["id"], h3: ["id"] },
  allowedSchemes: ["https", "http", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs): sanitizeHtml.Tag => {
      const href = (attribs.href ?? "").trim();
      if (EXTERNAL.test(href)) return { tagName, attribs: { href, target: "_blank", rel: "noopener noreferrer nofollow" } };
      if (MAILTO.test(href) || SITE_PATH.test(href) || ANCHOR.test(href)) return { tagName, attribs: { href } };
      return { tagName, attribs: {} };
    },
  },
  exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren?.length,
};

export function sanitizeSiteHtml(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS).trim().replace(/^(<p><\/p>)+$/, "");
}
