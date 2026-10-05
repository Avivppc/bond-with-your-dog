import type { EmailBlock, EmailBlockType } from "@/lib/email-blocks/types";

/** How each block type appears in the editor: palette label, Material Symbols icon, hint. */
export interface BlockMeta {
  label: string;
  icon: string;
  hint: string;
}

export const BLOCK_META: Record<EmailBlockType, BlockMeta> = {
  heading: { label: "Heading", icon: "title", hint: "A large or small title" },
  text: { label: "Text", icon: "notes", hint: "Paragraphs with bold, italic and links" },
  button: { label: "Button", icon: "smart_button", hint: "A call-to-action link" },
  image: { label: "Image", icon: "image", hint: "Upload or link a picture" },
  code: { label: "Member code", icon: "confirmation_number", hint: "The member's personal discount code" },
  quote: { label: "Quote", icon: "format_quote", hint: "A testimonial or quote" },
  divider: { label: "Divider", icon: "horizontal_rule", hint: "A thin line" },
  spacer: { label: "Spacer", icon: "height", hint: "Empty vertical space" },
};

export const BLOCK_TYPES = Object.keys(BLOCK_META) as EmailBlockType[];

const SUMMARY_LENGTH = 60;

function shorten(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > SUMMARY_LENGTH ? `${line.slice(0, SUMMARY_LENGTH - 1)}…` : line;
}

/** One line describing a block's content, for the collapsed card. */
export function blockSummary(block: EmailBlock): string {
  switch (block.type) {
    case "heading":
    case "text":
      return shorten(block.text) || "Empty";
    case "button":
      return shorten(block.label) || "No label";
    case "image":
      return block.src ? shorten(block.alt || block.src) : "No image yet";
    case "code":
      return shorten(block.title) || "Member code";
    case "quote":
      return shorten(block.text) || "Empty quote";
    case "divider":
      return "Line";
    case "spacer":
      return `${block.size}px`;
    default:
      return "";
  }
}
