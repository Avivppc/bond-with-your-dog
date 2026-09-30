"use client";

import { useState } from "react";
import Link from "next/link";
import { Ms } from "@/components/app/ui";
import { FAQ, filterFaq } from "@/lib/feedback/faq";

/** Help: the search box filters the FAQ as you type; the aside holds the contact options. */
export function HelpCenter({ aside }: { aside: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const items = filterFaq(FAQ, query);

  return (
    <>
      <div className="head-block">
        <span className="eyebrow">Help</span>
        <h1 className="h1">How can we help?</h1>
        <label className="search" htmlFor="helpQ" style={{ width: "min(560px, 100%)", height: 54, background: "var(--card)", boxShadow: "var(--shadow)" }}>
          <Ms name="search" />
          <input id="helpQ" type="search" placeholder="Search help articles" value={query} onChange={(e) => setQuery(e.target.value)} aria-controls="faqList" />
        </label>
      </div>
      <div className="grid-main">
        <div className="stack" id="faqList" aria-live="polite">
          {items.length === 0 ? (
            <div className="card state-card">
              <div className="big-ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>
                <Ms name="search_off" />
              </div>
              <span className="eyebrow muted">No results</span>
              <h2 className="h3">Nothing matches &quot;{query.trim()}&quot;</h2>
              <p className="faint">Try another word, or ask us directly.</p>
              <Link className="btn btn-ghost btn-sm" href="#ask">
                Ask a question
              </Link>
            </div>
          ) : (
            items.map((f, i) => (
              <details className="faq" key={f.id} open={i === 0 && !query ? true : undefined}>
                <summary>
                  {f.question}
                  <Ms name="add" />
                </summary>
                <p>{f.answer}</p>
              </details>
            ))
          )}
        </div>
        <div className="stack-lg sticky">{aside}</div>
      </div>
    </>
  );
}
