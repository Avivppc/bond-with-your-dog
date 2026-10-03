"use client";

import { useId } from "react";
import type { ButtonBlock, CodeBlock, EmailBlock, HeadingBlock, QuoteBlock, SpacerBlock, TextBlock } from "@/lib/email-blocks/types";
import { INPUT, LABEL } from "../ui";
import { ALIGN_OPTIONS, Note, RangeField, Segmented } from "./controls";
import type { BlockPatch, TextFieldName } from "./doc-ops";
import { ImageFields, type UploadImage } from "./ImageFields";
import { TagField } from "./TagField";

/** The inline fields of the selected block, one small editor per block type. */

interface FieldsProps<B extends EmailBlock> {
  block: B;
  onPatch: (patch: BlockPatch<B>) => void;
}

const fieldTarget = (id: string, field: TextFieldName) => ({ scope: "block", id, field }) as const;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MARKUP_HINT = "Blank line = new paragraph · **bold** · *italic* · [link text](https://…)";

function HeadingFields({ block, onPatch }: FieldsProps<HeadingBlock>) {
  return (
    <div className="flex flex-col gap-4">
      <TagField target={fieldTarget(block.id, "text")} label="Heading" value={block.text} onChange={(text) => onPatch({ text })} />
      <div className="flex flex-wrap gap-4">
        <Segmented
          label="Size"
          value={block.level}
          options={[
            { value: 1, label: "Large" },
            { value: 2, label: "Small" },
          ]}
          onChange={(level) => onPatch({ level })}
        />
        <Segmented label="Align" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => onPatch({ align })} />
      </div>
    </div>
  );
}

function TextFields({ block, onPatch }: FieldsProps<TextBlock>) {
  return (
    <div className="flex flex-col gap-4">
      <TagField target={fieldTarget(block.id, "text")} label="Text" multiline rows={7} hint={MARKUP_HINT} value={block.text} onChange={(text) => onPatch({ text })} />
      <Segmented label="Align" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => onPatch({ align })} />
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const id = useId();
  const safe = HEX_COLOR.test(value) ? value : "#0e666a";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        Colour
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Pick button colour"
          className="h-[38px] w-12 cursor-pointer rounded-[8px] border border-[#d9d8d6] bg-white p-1"
        />
        <input id={id} type="text" value={value} spellCheck={false} maxLength={7} onChange={(e) => onChange(e.target.value.trim())} className={`${INPUT} w-28 font-mono`} />
      </div>
    </div>
  );
}

function ButtonFields({ block, onPatch }: FieldsProps<ButtonBlock>) {
  return (
    <div className="flex flex-col gap-4">
      <TagField target={fieldTarget(block.id, "label")} label="Button text" value={block.label} onChange={(label) => onPatch({ label })} />
      <TagField
        target={fieldTarget(block.id, "url")}
        label="Link"
        inputMode="url"
        value={block.url}
        hint="Usually {{offer_url}} (their checkout link). The button is hidden if the link is empty."
        onChange={(url) => onPatch({ url })}
      />
      <div className="flex flex-wrap gap-4">
        <ColorField value={block.color} onChange={(color) => onPatch({ color })} />
        <Segmented label="Align" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => onPatch({ align })} />
      </div>
    </div>
  );
}

function CodeFields({ block, onPatch }: FieldsProps<CodeBlock>) {
  return (
    <div className="flex flex-col gap-4">
      <TagField target={fieldTarget(block.id, "title")} label="Title" value={block.title} onChange={(title) => onPatch({ title })} />
      <Note>Shows the member&apos;s personal code, discount and expiry date in a highlighted box. Members without a code don&apos;t see this block.</Note>
    </div>
  );
}

function QuoteFields({ block, onPatch }: FieldsProps<QuoteBlock>) {
  return (
    <div className="flex flex-col gap-4">
      <TagField target={fieldTarget(block.id, "text")} label="Quote" multiline rows={4} hint={MARKUP_HINT} value={block.text} onChange={(text) => onPatch({ text })} />
      <TagField target={fieldTarget(block.id, "author")} label="Author (optional)" value={block.author} placeholder="e.g. Noa & Max" onChange={(author) => onPatch({ author })} />
    </div>
  );
}

function SpacerFields({ block, onPatch }: FieldsProps<SpacerBlock>) {
  return <RangeField label="Height" value={block.size} min={8} max={64} step={4} unit="px" onChange={(size) => onPatch({ size })} />;
}

interface BlockFieldsProps {
  block: EmailBlock;
  onPatch: (patch: BlockPatch) => void;
  uploadImage?: UploadImage;
}

export function BlockFields({ block, onPatch, uploadImage }: BlockFieldsProps) {
  switch (block.type) {
    case "heading":
      return <HeadingFields block={block} onPatch={onPatch} />;
    case "text":
      return <TextFields block={block} onPatch={onPatch} />;
    case "button":
      return <ButtonFields block={block} onPatch={onPatch} />;
    case "image":
      return <ImageFields block={block} onPatch={onPatch} uploadImage={uploadImage} />;
    case "code":
      return <CodeFields block={block} onPatch={onPatch} />;
    case "quote":
      return <QuoteFields block={block} onPatch={onPatch} />;
    case "spacer":
      return <SpacerFields block={block} onPatch={onPatch} />;
    case "divider":
      return <Note>A thin line to separate sections. Nothing to set.</Note>;
    default:
      return null;
  }
}
