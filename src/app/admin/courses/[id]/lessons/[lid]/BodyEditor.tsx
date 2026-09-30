"use client";

import { useRef, useState, useTransition } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { saveLessonBody } from "./content-actions";

interface BodyEditorProps {
  courseId: string;
  lessonId: string;
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
      className={`px-2.5 py-1 rounded-md text-xs font-bold ${active ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-700"}`}
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
    <div className="flex flex-wrap gap-1 border-b border-slate-100 p-2">
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

/** Rich lesson text (TipTap). Saved HTML is sanitized on the server before storage. */
export function BodyEditor({ courseId, lessonId, initialHtml }: BodyEditorProps) {
  const [status, setStatus] = useState<{ kind: "saved" | "error"; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  // Bumped on every edit, so typing during a save keeps the editor dirty.
  const revision = useRef(0);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } })],
    content: initialHtml,
    immediatelyRender: false, // required for SSR (Next.js) to avoid hydration mismatches
    editorProps: {
      attributes: { class: "lesson-prose min-h-48 px-4 py-3 focus:outline-none", "aria-label": "Lesson text" },
    },
    onUpdate: () => {
      revision.current += 1;
      setDirty(true);
    },
  });

  function save() {
    if (!editor) return;
    const savedRevision = revision.current;
    startTransition(async () => {
      const res = await saveLessonBody({ courseId, lessonId, html: editor.getHTML() });
      if (res.ok) {
        if (revision.current === savedRevision) setDirty(false);
        setStatus({ kind: "saved", message: "Saved." });
      } else {
        setStatus({ kind: "error", message: res.error });
      }
    });
  }

  return (
    <section className="bg-white rounded-xl p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tighter">Lesson text</h2>
        <div className="flex items-center gap-3">
          {status && (
            <span role={status.kind === "error" ? "alert" : "status"} className={`text-xs ${status.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>
              {status.message}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="bg-orange-700 text-white px-5 py-2 rounded-full font-bold text-sm disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save text"}
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200">
        {editor ? <Toolbar editor={editor} /> : null}
        <EditorContent editor={editor} />
      </div>
    </section>
  );
}
