"use client";

import { useState } from "react";
import { emptyValue, type FieldDef, type FieldValue, type FieldValues, type ImageValue, type LinkValue } from "@/lib/site/fields";
import { INPUT } from "@/app/admin/_components/ui";
import { uploadSiteImage } from "../actions";
import { RichTextField } from "./RichTextField";

/** One control per field kind; values go up through onChange (the editor keeps the page state). */

const SMALL = "text-[12px] text-[#6c6a69]";
const ICON_BTN = "flex h-7 w-7 items-center justify-center rounded-[6px] text-[#6c6a69] hover:bg-[#efeeed] hover:text-[#1a1a19] disabled:opacity-30";

function Label({ field, htmlFor }: { field: FieldDef; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-medium text-[#1a1a19]">
      {field.label}
    </label>
  );
}

function Help({ text }: { text?: string }) {
  return text ? <p className={`mt-1 ${SMALL}`}>{text}</p> : null;
}

const asString = (v: FieldValue | undefined) => (typeof v === "string" ? v : "");
const asImage = (v: FieldValue | undefined): ImageValue => (v && typeof v === "object" && !Array.isArray(v) && "src" in v ? (v as ImageValue) : { src: "", alt: "" });
const asLink = (v: FieldValue | undefined): LinkValue => (v && typeof v === "object" && !Array.isArray(v) && "href" in v ? (v as LinkValue) : { label: "", href: "" });

function ImageControl({ field, value, onChange, id }: { field: FieldDef; value: ImageValue; onChange: (v: ImageValue) => void; id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const result = await uploadSiteImage(form).catch(() => ({ error: "The upload didn't go through. Try again." }));
    setBusy(false);
    if ("error" in result) setError(result.error);
    else onChange({ src: result.url, alt: value.alt });
  }
  return (
    <div>
      <Label field={field} htmlFor={`${id}-alt`} />
      <div className="flex gap-3">
        <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#e7e6e4] bg-[#f8f8f8]">
          {/* eslint-disable-next-line @next/next/no-img-element -- a preview of whatever image is chosen */}
          {value.src ? <img src={value.src} alt="" className="h-full w-full object-cover" /> : <span className="material-symbols-outlined text-[#9b9997]">image</span>}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-full border border-[#d9d8d6] bg-white px-3 py-1 text-[12px] font-medium hover:bg-[#f3f3f2]">
              {busy ? "Uploading…" : value.src ? "Replace" : "Upload"}
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {value.src && (
              <button type="button" className="rounded-full px-2 py-1 text-[12px] text-[#a4262c] hover:bg-red-50" onClick={() => onChange({ src: "", alt: value.alt })}>
                Remove
              </button>
            )}
          </div>
          <input id={`${id}-alt`} className={`${INPUT} py-1 text-[13px]`} value={value.alt} maxLength={300} placeholder="Describe the image (for screen readers)" onChange={(e) => onChange({ ...value, alt: e.target.value })} />
        </div>
      </div>
      {error && <p className="mt-1 text-[12px] text-red-700">{error}</p>}
      <Help text={field.help} />
    </div>
  );
}

function LinkControl({ field, value, onChange, id }: { field: FieldDef; value: LinkValue; onChange: (v: LinkValue) => void; id: string }) {
  return (
    <div>
      <Label field={field} htmlFor={`${id}-label`} />
      <div className="grid grid-cols-2 gap-2">
        <input id={`${id}-label`} className={INPUT} value={value.label} maxLength={80} placeholder="Button text" onChange={(e) => onChange({ ...value, label: e.target.value })} />
        <input className={INPUT} value={value.href} maxLength={1000} placeholder="/courses or https://…" onChange={(e) => onChange({ ...value, href: e.target.value })} aria-label={`${field.label} link`} />
      </div>
      <Help text={field.kind === "link" && field.optional ? `${field.help ? `${field.help} ` : ""}Leave the text empty to hide it.` : field.help} />
    </div>
  );
}

function ListControl({ field, value, onChange, id }: { field: Extract<FieldDef, { kind: "list" }>; value: FieldValues[]; onChange: (v: FieldValues[]) => void; id: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const blank = (): FieldValues => Object.fromEntries(field.fields.map((f) => [f.key, emptyValue(f)]));
  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setOpen(to);
  };
  const titleOf = (item: FieldValues, i: number) => {
    const t = field.titleKey ? item[field.titleKey] : undefined;
    return (typeof t === "string" && t.trim()) || `${field.itemLabel} ${i + 1}`;
  };
  return (
    <div>
      <p className="mb-1 text-[13px] font-medium text-[#1a1a19]">{field.label}</p>
      <ul className="divide-y divide-[#efeeed] rounded-[8px] border border-[#e7e6e4] bg-white">
        {value.map((item, i) => (
          <li key={i}>
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" className="min-w-0 flex-1 truncate py-1 text-left text-[13px] hover:underline" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {titleOf(item, i)}
              </button>
              <button type="button" className={ICON_BTN} disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
              <button type="button" className={ICON_BTN} disabled={i === value.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down">
                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
              </button>
              <button type="button" className={ICON_BTN} onClick={() => (onChange(value.filter((_, j) => j !== i)), setOpen(null))} aria-label={`Remove ${titleOf(item, i)}`}>
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
            {open === i && (
              <div className="space-y-3 border-t border-[#efeeed] bg-[#fafaf9] p-3">
                <FieldsForm fields={field.fields} values={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} idPrefix={`${id}-${i}`} />
              </div>
            )}
          </li>
        ))}
      </ul>
      {value.length < field.max && (
        <button type="button" className="mt-1.5 text-[13px] font-medium text-[#1a1a19] hover:underline" onClick={() => (onChange([...value, blank()]), setOpen(value.length))}>
          + Add {field.itemLabel.toLowerCase()}
        </button>
      )}
      <Help text={field.help} />
    </div>
  );
}

function Control({ field, value, onChange, id }: { field: FieldDef; value: FieldValue | undefined; onChange: (v: FieldValue) => void; id: string }) {
  switch (field.kind) {
    case "text":
    case "youtube":
    case "icon":
      return (
        <div>
          <Label field={field} htmlFor={id} />
          {field.kind === "text" && field.highlight ? (
            <textarea id={id} rows={2} className={INPUT} value={asString(value)} maxLength={field.max ?? 300} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <input
              id={id}
              className={INPUT}
              value={asString(value)}
              maxLength={field.kind === "text" ? (field.max ?? 300) : 200}
              placeholder={field.kind === "youtube" ? "YouTube link" : field.kind === "icon" ? "e.g. pets" : field.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          <Help text={field.kind === "icon" ? `${field.help ?? ""} Names from fonts.google.com/icons.`.trim() : field.help} />
        </div>
      );
    case "textarea":
      return (
        <div>
          <Label field={field} htmlFor={id} />
          <textarea id={id} rows={field.rows ?? 4} className={INPUT} value={asString(value)} maxLength={field.max ?? 4000} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          <Help text={field.help ?? "Leave an empty line between paragraphs."} />
        </div>
      );
    case "richtext":
      return (
        <div>
          <p className="mb-1 text-[13px] font-medium text-[#1a1a19]">{field.label}</p>
          <RichTextField value={asString(value)} onChange={onChange} label={field.label} />
          <Help text={field.help} />
        </div>
      );
    case "select":
      return (
        <div>
          <Label field={field} htmlFor={id} />
          <select id={id} className={INPUT} value={asString(value)} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Help text={field.help} />
        </div>
      );
    case "toggle":
      return (
        <label className="flex items-start gap-2 text-[13px]">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#343332]" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          <span>
            <span className="font-medium">{field.label}</span>
            {field.help && <span className={`block ${SMALL}`}>{field.help}</span>}
          </span>
        </label>
      );
    case "image":
      return <ImageControl field={field} value={asImage(value)} onChange={onChange} id={id} />;
    case "link":
      return <LinkControl field={field} value={asLink(value)} onChange={onChange} id={id} />;
    case "list":
      return <ListControl field={field} value={Array.isArray(value) ? value : []} onChange={onChange} id={id} />;
  }
}

/** All of a section's (or list item's) fields. */
export function FieldsForm({ fields, values, onChange, idPrefix }: { fields: readonly FieldDef[]; values: FieldValues; onChange: (v: FieldValues) => void; idPrefix: string }) {
  return (
    <>
      {fields.map((f) => (
        <Control key={f.key} field={f} value={values[f.key]} id={`${idPrefix}-${f.key}`} onChange={(v) => onChange({ ...values, [f.key]: v })} />
      ))}
    </>
  );
}
