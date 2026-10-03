"use client";

import { createContext, useContext, useState } from "react";
import { emptyValue, newBlock, type BlockDef, type FieldDef, type FieldValue, type FieldValues, type ImageValue, type LinkValue } from "@/lib/site/fields";
import { INPUT } from "@/app/admin/_components/ui";
import { ImageLibrary } from "./ImageLibrary";
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


/**
 * A field to bring into view (clicked on the page): the DOM id of its wrapper, and a counter so
 * the same field can be asked for twice. Lists open the item that holds it.
 */
export const FieldFocusContext = createContext<{ target: string | null; nonce: number }>({ target: null, nonce: 0 });

/** The wrapper id of the field at `path` in a section: "f-hero-cards-1-title". */
export const fieldDomId = (sectionId: string, path: string) => `f-${sectionId}-${path.split("#")[0].replace(/\./g, "-")}`;

function forcedIndex(target: string | null, id: string, count: number): number | null {
  const prefix = `f-${id}-`;
  if (!target?.startsWith(prefix)) return null;
  const i = parseInt(target.slice(prefix.length), 10);
  return Number.isInteger(i) && i >= 0 && i < count ? i : null;
}

/** Opens the list item holding the focused field, once per focus request. */
function useFocusedItem(id: string, count: number, setOpen: (i: number) => void) {
  const focus = useContext(FieldFocusContext);
  // Requests are numbered from 1, so a list that opens because of one still acts on it.
  const [seen, setSeen] = useState(0);
  if (focus.nonce !== seen) {
    setSeen(focus.nonce);
    const i = forcedIndex(focus.target, id, count);
    if (i !== null) setOpen(i);
  }
}

function ImageControl({ field, value, onChange, id }: { field: FieldDef; value: ImageValue; onChange: (v: ImageValue) => void; id: string }) {
  const [library, setLibrary] = useState(false);
  return (
    <div>
      <Label field={field} htmlFor={`${id}-alt`} />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setLibrary(true)}
          className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#e7e6e4] bg-[#f8f8f8] hover:border-[#343332]"
          aria-label={value.src ? `Change ${field.label}` : `Choose ${field.label}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a preview of whatever image is chosen */}
          {value.src ? <img src={value.src} alt="" className="h-full w-full object-cover" /> : <span className="material-symbols-outlined text-[#9b9997]">add_photo_alternate</span>}
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setLibrary(true)} className="rounded-full border border-[#d9d8d6] bg-white px-3 py-1 text-[12px] font-medium hover:bg-[#f3f3f2]">
              {value.src ? "Change" : "Choose image"}
            </button>
            {value.src && (
              <button type="button" className="rounded-full px-2 py-1 text-[12px] text-[#a4262c] hover:bg-red-50" onClick={() => onChange({ src: "", alt: value.alt })}>
                Remove
              </button>
            )}
          </div>
          <input id={`${id}-alt`} className={`${INPUT} py-1 text-[13px]`} value={value.alt} maxLength={300} placeholder="Describe the image (for screen readers)" onChange={(e) => onChange({ ...value, alt: e.target.value })} />
        </div>
      </div>
      <Help text={field.help} />
      {library && (
        <ImageLibrary
          onClose={() => setLibrary(false)}
          onPick={(src) => {
            onChange({ src, alt: value.alt });
            setLibrary(false);
          }}
        />
      )}
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
  useFocusedItem(id, value.length, setOpen);
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


function blockTitle(def: BlockDef | undefined, item: FieldValues): string {
  const raw = def?.titleKey ? item[def.titleKey] : undefined;
  const text = typeof raw === "string" ? raw.replace(/\*/g, "").trim() : raw && typeof raw === "object" && !Array.isArray(raw) && "label" in raw ? String((raw as LinkValue).label) : "";
  return text || (def?.label ?? "Block");
}

function BlocksControl({ field, value, onChange, id }: { field: Extract<FieldDef, { kind: "blocks" }>; value: FieldValues[]; onChange: (v: FieldValues[]) => void; id: string }) {
  const [open, setOpen] = useState<number | null>(null);
  useFocusedItem(id, value.length, setOpen);
  const [adding, setAdding] = useState(false);
  const defOf = (item: FieldValues) => field.blockTypes.find((b) => b.type === item.type);
  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setOpen(to);
  };
  return (
    <div>
      <ul className="space-y-1.5">
        {value.map((item, i) => {
          const def = defOf(item);
          return (
            <li key={i} className="rounded-[8px] border border-[#e7e6e4] bg-white">
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#6c6a69]" aria-hidden>
                  {def?.icon ?? "help"}
                </span>
                <button type="button" className="min-w-0 flex-1 truncate py-1 text-left text-[13px] hover:underline" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  {blockTitle(def, item)}
                </button>
                <button type="button" className={ICON_BTN} disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move block up">
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
                <button type="button" className={ICON_BTN} disabled={i === value.length - 1} onClick={() => move(i, i + 1)} aria-label="Move block down">
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </button>
                <button type="button" className={ICON_BTN} disabled={value.length >= field.max} onClick={() => onChange([...value.slice(0, i + 1), structuredClone(item), ...value.slice(i + 1)])} aria-label="Duplicate block">
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
                <button type="button" className={ICON_BTN} onClick={() => (onChange(value.filter((_, j) => j !== i)), setOpen(null))} aria-label="Remove block">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              {open === i && def && (
                <div className="space-y-3 border-t border-[#efeeed] bg-[#fafaf9] p-3">
                  <FieldsForm fields={def.fields} values={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...v, type: def.type } : x)))} idPrefix={`${id}-${i}`} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {value.length < field.max &&
        (adding ? (
          <div className="mt-2 rounded-[8px] border border-[#d9d8d6] bg-white p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#6c6a69]">Add a block</span>
              <button type="button" className={ICON_BTN} onClick={() => setAdding(false)} aria-label="Cancel">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {field.blockTypes.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => {
                    onChange([...value, newBlock(b)]);
                    setOpen(value.length);
                    setAdding(false);
                  }}
                  className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12px] hover:bg-[#f3f3f2]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#6c6a69]">{b.icon}</span>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" className="mt-1.5 flex items-center gap-1 text-[13px] font-medium text-[#1d4f91] hover:underline" onClick={() => setAdding(true)}>
            <span className="material-symbols-outlined text-[18px]">add</span>Add block
          </button>
        ))}
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
    case "blocks":
      return <BlocksControl field={field} value={Array.isArray(value) ? value : []} onChange={onChange} id={id} />;
  }
}

/** All of a section's (or list item's) fields. */
export function FieldsForm({ fields, values, onChange, idPrefix }: { fields: readonly FieldDef[]; values: FieldValues; onChange: (v: FieldValues) => void; idPrefix: string }) {
  return (
    <>
      {fields.map((f) => (
        <div key={f.key} id={`f-${idPrefix}-${f.key}`} className="scroll-mt-20 rounded-[8px]">
          <Control field={f} value={values[f.key]} id={`${idPrefix}-${f.key}`} onChange={(v) => onChange({ ...values, [f.key]: v })} />
        </div>
      ))}
    </>
  );
}
