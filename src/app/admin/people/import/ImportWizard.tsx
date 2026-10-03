"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseCsv } from "@/lib/csv";
import { buildImport, FIELD_LABEL, guessMapping, IMPORT_BATCH, IMPORT_FIELDS, MAX_IMPORT_ROWS, type ColumnMapping, type ImportField } from "@/lib/contacts-import";
import { BTN_PRIMARY, BTN_SECONDARY, Card, INPUT, LABEL, MUTED, TABLE, TD, TH, THEAD, TROW } from "../../_components/ui";
import { importContactsBatch, type ImportBatchResult } from "./actions";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const PREVIEW_ROWS = 5;

interface Sheet {
  fileName: string;
  headers: string[];
  data: string[][];
}

interface Totals {
  done: number;
  created: number;
  updated: number;
  members: number;
  tagsAdded: number;
  granted: number;
  waiting: number;
  failed: { email: string; reason: string }[];
  error: string | null;
}

const ZERO: Totals = { done: 0, created: 0, updated: 0, members: 0, tagsAdded: 0, granted: 0, waiting: 0, failed: [], error: null };

function addUp(t: Totals, r: ImportBatchResult, size: number): Totals {
  return {
    done: t.done + size,
    created: t.created + r.created,
    updated: t.updated + r.updated,
    members: t.members + r.members,
    tagsAdded: t.tagsAdded + r.tagsAdded,
    granted: t.granted + r.granted,
    waiting: t.waiting + r.waiting,
    failed: [...t.failed, ...r.failed],
    error: r.ok ? t.error : (r.error ?? "A batch failed."),
  };
}

const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
const consentText = (v: boolean | null) => (v === null ? "Keep as is" : v ? "Subscribed" : "Not subscribed");

/** Contacts → Import: CSV in, contacts (with consent and tags, optionally an offer) out. */
export function ImportWizard({ offers }: { offers: { id: string; title: string }[] }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [extraTag, setExtraTag] = useState("");
  const [offerId, setOfferId] = useState("");
  const [days, setDays] = useState("");
  const [running, setRunning] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);

  const built = useMemo(() => (sheet && mapping ? buildImport(sheet.headers, sheet.data, mapping, extraTag ? [extraTag] : []) : null), [sheet, mapping, extraTag]);

  async function onFile(file: File | undefined) {
    setFileError(null);
    setTotals(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setFileError("That file is over 10 MB. Split it into smaller files.");
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return setFileError("That file has no rows under the header. Export it as CSV and try again.");
    if (rows.length - 1 > MAX_IMPORT_ROWS) return setFileError(`Import up to ${MAX_IMPORT_ROWS.toLocaleString("en-US")} people per file.`);
    const [headers, ...data] = rows;
    setSheet({ fileName: file.name, headers, data });
    setMapping(guessMapping(headers));
  }

  async function runImport() {
    if (!built || built.rows.length === 0) return;
    setRunning(true);
    let t = ZERO;
    setTotals(t);
    for (let i = 0; i < built.rows.length; i += IMPORT_BATCH) {
      const batch = built.rows.slice(i, i + IMPORT_BATCH);
      const result = await importContactsBatch({ rows: batch, offerId: offerId || null, days }).catch(
        (): ImportBatchResult => ({ ok: false, error: "The connection dropped. Run the import again; nothing is duplicated.", created: 0, updated: 0, members: 0, tagsAdded: 0, granted: 0, waiting: 0, failed: [] }),
      );
      t = addUp(t, result, batch.length);
      setTotals(t);
      if (!result.ok) break;
    }
    setRunning(false);
  }

  const setField = (field: ImportField, value: string) => setMapping((m) => (m ? { ...m, [field]: value === "" ? null : Number(value) } : m));

  if (!sheet || !mapping) {
    return (
      <Card title="1. Choose a file" description="A CSV with one person per row and a header row. From Kajabi: People → Export.">
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-[14px]" aria-label="CSV file" />
        {fileError && (
          <p role="alert" className="mt-3 text-[14px] text-red-700">
            {fileError}
          </p>
        )}
      </Card>
    );
  }

  const finished = totals && !running && (totals.error || totals.done >= (built?.rows.length ?? 0));

  return (
    <div className="space-y-5">
      <Card
        title="2. Match the columns"
        description={`${sheet.fileName} · ${sheet.data.length.toLocaleString("en-US")} rows. We guessed from the headers; change anything that's wrong.`}
        actions={
          <button type="button" className="text-[14px] font-medium hover:underline" onClick={() => (setSheet(null), setMapping(null), setTotals(null))} disabled={running}>
            Choose another file
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IMPORT_FIELDS.map((field) => (
            <label key={field} className="flex flex-col gap-1.5">
              <span className={LABEL}>
                {FIELD_LABEL[field]}
                {field === "email" && " (required)"}
              </span>
              <select className={INPUT} value={mapping[field] ?? ""} onChange={(e) => setField(field, e.target.value)} disabled={running}>
                <option value="">Don&apos;t import</option>
                {sheet.headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className={`mt-3 text-[12px] ${MUTED}`}>
          Newsletter consent: only import it if these people agreed to marketing email. Empty cells keep what we already have. Unsubscribes are always kept.
        </p>
      </Card>

      <Card title="3. Options">
        <div className="flex flex-wrap gap-4">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5">
            <span className={LABEL}>Tag everyone in this file (optional)</span>
            <input className={INPUT} value={extraTag} maxLength={40} onChange={(e) => setExtraTag(e.target.value)} placeholder="kajabi" disabled={running} />
            <span className={`text-[12px] ${MUTED}`}>Handy for a campaign to just this list later.</span>
          </label>
          <label className="flex min-w-56 flex-1 flex-col gap-1.5">
            <span className={LABEL}>Give access to an offer (optional)</span>
            <select className={INPUT} value={offerId} onChange={(e) => setOfferId(e.target.value)} disabled={running}>
              <option value="">No offer</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
            <span className={`text-[12px] ${MUTED}`}>People with an account get it now; others when they sign up with this email.</span>
          </label>
          {offerId && (
            <label className="flex w-40 flex-col gap-1.5">
              <span className={LABEL}>Days of access</span>
              <input className={INPUT} type="number" min={1} max={36500} placeholder="Lifetime" value={days} onChange={(e) => setDays(e.target.value)} disabled={running} />
            </label>
          )}
        </div>
      </Card>

      <Card
        flush
        title="4. Check and import"
        description={
          mapping.email === null
            ? "Pick the email column first."
            : `${built?.rows.length.toLocaleString("en-US") ?? 0} people ready${built?.invalidLines.length ? ` · ${plural(built.invalidLines.length, "row")} without a valid email skipped` : ""}${built?.duplicates ? ` · ${plural(built.duplicates, "repeated email")} skipped` : ""}`
        }
      >
        {built && built.rows.length > 0 && (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Email</th>
                  <th className={TH}>Name</th>
                  <th className={TH}>Newsletter</th>
                  <th className={TH}>Tags</th>
                </tr>
              </thead>
              <tbody>
                {built.rows.slice(0, PREVIEW_ROWS).map((r) => (
                  <tr key={r.email} className={TROW}>
                    <td className={TD}>{r.email}</td>
                    <td className={TD}>{r.name ?? "—"}</td>
                    <td className={TD}>{consentText(r.subscribed)}</td>
                    <td className={TD}>{r.tags.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {built && built.invalidLines.length > 0 && (
          <p className={`px-5 pt-3 text-[12px] ${MUTED}`}>
            Skipped lines: {built.invalidLines.slice(0, 20).join(", ")}
            {built.invalidLines.length > 20 && "…"}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <button type="button" className={BTN_PRIMARY} disabled={running || !built || built.rows.length === 0 || Boolean(finished)} onClick={runImport}>
            {running ? "Importing…" : `Import ${built?.rows.length.toLocaleString("en-US") ?? 0} people`}
          </button>
          {totals && built && (
            <span className="flex min-w-48 flex-1 items-center gap-3 text-[14px]" role="status">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#efeeed]">
                <span className="block h-full rounded-full bg-[#343332] transition-all" style={{ width: `${Math.round((totals.done / built.rows.length) * 100)}%` }} />
              </span>
              {totals.done.toLocaleString("en-US")} / {built.rows.length.toLocaleString("en-US")}
            </span>
          )}
        </div>
      </Card>

      {finished && totals && (
        <Card title={totals.error ? "Import stopped" : "Import finished"}>
          {totals.error && (
            <p role="alert" className="mb-3 text-[14px] text-red-700">
              {totals.error}
            </p>
          )}
          <ul className="space-y-1 text-[14px]">
            <li>
              <b>{totals.created.toLocaleString("en-US")}</b> new email-only contacts, <b>{totals.updated.toLocaleString("en-US")}</b> updated
            </li>
            <li>
              <b>{totals.members.toLocaleString("en-US")}</b> already had an account
            </li>
            <li>
              <b>{totals.tagsAdded.toLocaleString("en-US")}</b> tags added
            </li>
            {offerId && (
              <li>
                Offer: <b>{totals.granted}</b> got access now, <b>{totals.waiting}</b> get it when they sign up
              </li>
            )}
          </ul>
          {totals.failed.length > 0 && (
            <ul className="mt-3 space-y-1 text-[12px] text-red-700">
              {totals.failed.slice(0, 50).map((f) => (
                <li key={f.email}>
                  {f.email}: {f.reason}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/leads?tab=imported" className={BTN_SECONDARY}>
              See email-only contacts
            </Link>
            <Link href="/admin/people" className={BTN_SECONDARY}>
              Back to contacts
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
