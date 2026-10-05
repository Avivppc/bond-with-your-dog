"use client";

import { useCallback, useRef, useState } from "react";
import { blockId, newBlock } from "@/lib/email-blocks/defaults";
import type { EmailBlock, EmailBlockType, EmailDoc } from "@/lib/email-blocks/types";
import { DEFAULT_ART_SETTINGS, type EmailArtKind } from "@/lib/email-art";
import { ArtField } from "./ArtField";
import { BLOCK_TYPES } from "./block-meta";
import { BlockFields } from "./BlockFields";
import { BlockList } from "./BlockList";
import {
  duplicateBlock,
  insertAtCursor,
  insertBlock,
  moveBlockBy,
  moveBlockTo,
  patchBlock,
  removeBlock,
  setArt,
  setTextField,
  type BlockPatch,
  type FieldTarget,
} from "./doc-ops";
import type { UploadImage } from "./ImageFields";
import { Palette, type DragItem } from "./Palette";
import { Preview } from "./Preview";
import { FieldFocusContext, TagChips, TagField, type FieldElement, type TagOption } from "./TagField";

export { EmailEditorModal, type EmailEditorModalProps } from "./EmailEditorModal";

/**
 * Block email editor: subject and preview text, a palette of blocks (drag in or click), the block
 * list with inline fields, "Insert tag" chips, and a live preview. Controlled: every change is a
 * new EmailDoc passed to onChange.
 */

export interface EmailEditorProps {
  value: EmailDoc;
  onChange: (doc: EmailDoc) => void;
  tags: readonly TagOption[];
  exampleVars: Record<string, string>;
  siteUrl: string;
  /** The picture Settings → Email gives this kind of email (default: a photo). */
  defaultArt?: EmailArtKind;
  /** When given, image blocks get an Upload button (see upload-client.ts → uploadImage). */
  uploadImage?: UploadImage;
  /** Which blocks the palette offers (default: all). */
  blockTypes?: readonly EmailBlockType[];
  /** How a new block starts out (default: newBlock). */
  makeBlock?: (type: EmailBlockType) => EmailBlock;
}

interface FocusedField {
  target: FieldTarget;
  el: FieldElement;
}

const NO_FIELD_MESSAGE = "Click into a text field first, then pick a tag.";

export function EmailEditor({ value, onChange, tags, exampleVars, siteUrl, defaultArt = DEFAULT_ART_SETTINGS.flows, uploadImage, blockTypes = BLOCK_TYPES, makeBlock = newBlock }: EmailEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragItem | null>(null);
  const [tagMessage, setTagMessage] = useState<string | null>(null);
  const focused = useRef<FocusedField | null>(null);

  const onFieldFocus = useCallback((target: FieldTarget, el: FieldElement) => {
    focused.current = { target, el };
    setTagMessage(null);
  }, []);

  function addBlock(type: EmailBlockType, index = value.blocks.length) {
    const block = makeBlock(type);
    onChange(insertBlock(value, index, block));
    setSelectedId(block.id);
  }

  function handleDrop(item: DragItem, index: number) {
    if (item.source === "palette") addBlock(item.type, index);
    else onChange(moveBlockTo(value, item.id, index));
  }

  function duplicate(id: string) {
    const copyId = blockId();
    onChange(duplicateBlock(value, id, copyId));
    setSelectedId(copyId);
  }

  function remove(id: string) {
    onChange(removeBlock(value, id));
    if (selectedId === id) setSelectedId(null);
  }

  function insertTag(tag: string) {
    const field = focused.current;
    if (!field || !field.el.isConnected) {
      setTagMessage(NO_FIELD_MESSAGE);
      return;
    }
    const { el, target } = field;
    const end = el.value.length;
    const next = insertAtCursor(el.value, el.selectionStart ?? end, el.selectionEnd ?? end, `{{${tag}}}`);
    onChange(setTextField(value, target, next.value));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
    });
  }

  const renderFields = (block: EmailBlock) => (
    <BlockFields block={block} onPatch={(patch: BlockPatch) => onChange(patchBlock(value, block.id, patch))} uploadImage={uploadImage} />
  );

  return (
    <FieldFocusContext.Provider value={onFieldFocus}>
      <div className="flex flex-col gap-4 text-[#1a1a19]">
        <div className="grid gap-4 md:grid-cols-2">
          <TagField
            target={{ scope: "doc", field: "subject" }}
            label="Subject"
            value={value.subject}
            placeholder="e.g. {{first_name}}, news from Bonded"
            onChange={(subject) => onChange({ ...value, subject })}
          />
          <TagField
            target={{ scope: "doc", field: "preheader" }}
            label="Preview text"
            value={value.preheader}
            hint="The grey line inboxes show after the subject."
            onChange={(preheader) => onChange({ ...value, preheader })}
          />
          <ArtField value={value.art} defaultArt={defaultArt} onChange={(art) => onChange(setArt(value, art))} />
        </div>
        <div className="z-20 -mx-1 border-b border-[#efeeed] bg-white/95 px-1 py-2 backdrop-blur lg:sticky lg:top-0">
          <TagChips tags={tags} onInsert={insertTag} message={tagMessage} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[148px_minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[168px_minmax(340px,1fr)_minmax(380px,620px)]">
          <div className="lg:sticky lg:top-24 lg:self-start xl:top-16">
            <Palette types={blockTypes} onAdd={(type) => addBlock(type)} onDragChange={setDrag} />
          </div>
          <BlockList
            blocks={value.blocks}
            selectedId={selectedId}
            drag={drag}
            onDragChange={setDrag}
            onDrop={handleDrop}
            onSelect={setSelectedId}
            onMove={(id, delta) => onChange(moveBlockBy(value, id, delta))}
            onDuplicate={duplicate}
            onRemove={remove}
            renderFields={renderFields}
          />
          <div className="lg:sticky lg:top-24 lg:self-start xl:top-16">
            <Preview doc={value} siteUrl={siteUrl} exampleVars={exampleVars} defaultArt={defaultArt} />
          </div>
        </div>
      </div>
    </FieldFocusContext.Provider>
  );
}
