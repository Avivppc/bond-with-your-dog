"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Card } from "@/app/admin/_components/ui";

interface BodyEditorProps {
  /** The lesson form this editor submits with (the page's single Save button). */
  formId: string;
  initialHtml: string;
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

function ToolbarButton({ label, active, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[6px] px-2.5 py-1 text-xs font-semibold ${active ? "bg-[#343332] text-white" : "text-[#3d3c3a] hover:bg-[#f3f3f2]"}`}
    >
      {label}
    </button>
  );
}

/** "example.com" → "https://example.com"; keeps http(s)/mailto as typed (the server drops anything else). */
function normalizeHref(raw: string): string {
  const href = raw.trim();
  return /^(https?:\/\/|mailto:)/i.test(href) ? href : `https://${href.replace(/^\/+/, "")}`;
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL (https://…)", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: normalizeHref(href) }).run();
  }

  return (
    <div className="flex flex-wrap gap-1 border-b border-[#efeeed] p-1.5">
      <ToolbarButton label="B" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton label="I" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton label="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <ToolbarButton label="• List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton label="1. List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink} />
    </div>
  );
}

/**
 * Rich lesson text (TipTap). The HTML rides along with the lesson form in a hidden field and is
 * sanitized on the server when the lesson is saved.
 */
export function BodyEditor({ formId, initialHtml }: BodyEditorProps) {
  const [html, setHtml] = useState(initialHtml);
  // The server stores a sanitized version whose markup can differ from TipTap's (attribute order,
  // <br />), so "saved" means: the page came back with new content after we posted ours.
  const [baseline, setBaseline] = useState({ server: initialHtml, editor: initialHtml });
  if (baseline.server !== initialHtml) setBaseline({ server: initialHtml, editor: html });
  const dirty = html !== baseline.editor;

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } })],
    content: initialHtml,
    immediatelyRender: false, // required for SSR (Next.js) to avoid hydration mismatches
    shouldRerenderOnTransaction: true, // keep the toolbar's bold/heading/link states current
    editorProps: {
      attributes: { class: "lesson-prose min-h-56 px-4 py-3 focus:outline-none", "aria-label": "Lesson text" },
    },
    onUpdate: ({ editor: e }) => setHtml(e.isEmpty ? "" : e.getHTML()),
  });

  // Don't lose typed text by navigating away before pressing Save.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <Card
      title="Lesson text"
      description="Notes, instructions or a transcript shown under the video."
      actions={dirty ? <span className="text-xs font-medium text-amber-700">Unsaved changes</span> : undefined}
    >
      <input type="hidden" name="body_html" form={formId} value={html} />
      <div className="overflow-hidden rounded-[8px] border border-[#d9d8d6] focus-within:border-[#343332]">
        {editor ? <Toolbar editor={editor} /> : null}
        <EditorContent editor={editor} />
      </div>
    </Card>
  );
}
