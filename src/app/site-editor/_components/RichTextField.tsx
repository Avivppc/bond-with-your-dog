"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/** Rich text for website sections (TipTap). The server cleans the HTML when the page is saved. */

function Btn({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[6px] px-2 py-0.5 text-[12px] font-semibold ${active ? "bg-[#343332] text-white" : "text-[#3d3c3a] hover:bg-[#f3f3f2]"}`}
    >
      {label}
    </button>
  );
}

/** Site pages keep their own address ("/refund-policy"); anything else gets https:// in front. */
function normalizeHref(raw: string): string {
  const href = raw.trim();
  if (href.startsWith("/") || href.startsWith("#") || /^(https?:\/\/|mailto:)/i.test(href)) return href;
  return `https://${href}`;
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link (a page like /courses, or https://…)", previous ?? "");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: normalizeHref(href) }).run();
  }
  return (
    <div className="flex flex-wrap gap-0.5 border-b border-[#efeeed] p-1">
      <Btn label="B" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Btn label="I" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Btn label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Btn label="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <Btn label="• List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <Btn label="1. List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <Btn label="Link" active={editor.isActive("link")} onClick={setLink} />
    </div>
  );
}

export function RichTextField({ value, onChange, label }: { value: string; onChange: (html: string) => void; label: string }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } })],
    content: value,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: "lesson-prose min-h-40 max-h-[420px] overflow-y-auto px-3 py-2 text-[14px] focus:outline-none", "aria-label": label } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  // A restored version or discarded draft replaces the text from outside.
  useEffect(() => {
    if (editor && !editor.isFocused && editor.getHTML() !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#d9d8d6] bg-white focus-within:border-[#343332]">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
