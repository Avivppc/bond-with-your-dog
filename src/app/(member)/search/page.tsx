import Link from "next/link";
import { SoonLink } from "@/components/app/SoonLink";
import { isComingSoon } from "@/lib/member/coming-soon";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { LevelPill, Ms } from "@/components/app/ui";
import { groupResults, normalizeQuery, resultCount, MAX_QUERY_LENGTH, type SearchGroup, type SearchHit } from "@/lib/practice/search";
import { viewerTimeZone } from "@/lib/practice/server/zone";
import { searchFeedback, searchLessons, searchMoves, searchRecordings, suggestionTerms, type MoveHit } from "./load";

export const metadata = { title: "Search" };

/** "a, b and c". */
const listJoin = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

type Search = Promise<Record<string, string | string[] | undefined>>;

function Thumb({ src, size }: { src: string | null | undefined; size: "lesson" | "move" }) {
  if (size === "move") {
    return (
      <div className="sketch" style={{ width: 58, height: 58, flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- move artwork */}
        <img src={src ?? "/app/img/intro.jpg"} alt="" style={{ width: 50 }} />
      </div>
    );
  }
  return (
    <div className="th" style={{ width: 88, height: 58, borderRadius: 12, overflow: "hidden", background: "var(--tint)", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- lesson thumbnail */}
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
    </div>
  );
}

function Row({ group, hit, level }: { group: SearchGroup["key"]; hit: SearchHit; level?: MoveHit["level"] }) {
  return (
    <Link className="list-row" href={hit.href}>
      {group === "lessons" && <Thumb src={hit.image} size="lesson" />}
      {group === "moves" && <Thumb src={hit.image} size="move" />}
      {group === "feedback" && (
        // eslint-disable-next-line @next/next/no-img-element -- Roni's photo
        <img className="avatar" src="/app/img/roni.jpg" alt="" />
      )}
      {group === "qa" && (
        <span style={{ color: "var(--teal)", display: "flex" }}>
          <Ms name="live_tv" />
        </span>
      )}
      <div className="grow">
        <div className="title">{hit.title}</div>
        <div className="faint">{hit.subtitle}</div>
      </div>
      {group === "moves" && level ? <LevelPill level={level} /> : null}
      {group === "lessons" && (
        <span style={{ color: "var(--ink-3)", display: "flex" }} aria-label={hit.locked ? "Locked" : undefined}>
          <Ms name={hit.locked ? "lock" : "chevron_right"} />
        </span>
      )}
    </Link>
  );
}

function SearchBox({ q }: { q: string }) {
  return (
    <form action="/search" role="search">
      <label className="search" htmlFor="bigSearch" style={{ width: "100%", height: 60, fontSize: 18, background: "var(--card)", boxShadow: "var(--shadow)" }}>
        <Ms name="search" />
        <span className="sr-only">Search</span>
        <input id="bigSearch" name="q" type="search" defaultValue={q} maxLength={MAX_QUERY_LENGTH} placeholder="Search lessons and notes…" autoComplete="off" />
      </label>
    </form>
  );
}

function Suggestions({ terms, withMoves }: { terms: string[]; withMoves: boolean }) {
  return (
    <div className="card state-card">
      <div className="big-ic">
        <Ms name="search_off" />
      </div>
      <h2 className="h3">No results</h2>
      <p className="faint">{withMoves ? "Try a move name or a word from a lesson title." : "Try a word from a lesson title."}</p>
      {terms.length > 0 && (
        <div className="row" style={{ justifyContent: "center" }}>
          {terms.map((t) => (
            <Link key={t} className="chip" href={`/search?q=${encodeURIComponent(t)}`}>
              {t}
            </Link>
          ))}
        </div>
      )}
      <div className="row" style={{ justifyContent: "center" }}>
        <SoonLink className="link" href="/moves">
          Browse the Moves Library
          <Ms name="arrow_forward" />
        </SoonLink>
        <Link className="link" href="/my-courses">
          Go to My Courses
          <Ms name="arrow_forward" />
        </Link>
      </div>
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const viewer = await requireMember("/search");
  const sp = await searchParams;
  const q = normalizeQuery(sp.q);
  const raw = typeof sp.q === "string" ? sp.q.slice(0, MAX_QUERY_LENGTH) : "";
  const supabase = await createClient();
  // Sections still "Coming soon" stay out of members' results (the team keeps them for previewing).
  const withMoves = viewer.isStaff || !isComingSoon("/moves");
  const withRecordings = viewer.isStaff || !isComingSoon("/community");

  if (!q) {
    const sources = ["lessons", withMoves && "moves", "Roni's notes on your videos", withRecordings && "Q&A recordings"].filter(Boolean) as string[];
    return (
      <>
        <div className="head-block">
          <span className="eyebrow">Search</span>
          <SearchBox q={raw} />
          <p className="faint">Search {listJoin(sources)}. Type at least two letters.</p>
        </div>
      </>
    );
  }

  const timeZone = await viewerTimeZone();
  const [lessons, moves, feedback, qa] = await Promise.all([
    searchLessons(supabase, viewer.userId, q),
    withMoves ? searchMoves(supabase, viewer.activeDog?.id ?? null, q) : Promise.resolve([] as MoveHit[]),
    searchFeedback(supabase, q, timeZone),
    withRecordings ? searchRecordings(supabase, q, timeZone) : Promise.resolve([] as Awaited<ReturnType<typeof searchRecordings>>),
  ]);
  const groups = groupResults({ lessons, moves, feedback, qa });
  const count = resultCount(groups);
  const levels = new Map(moves.map((m) => [m.id, m.level]));

  return (
    <>
      <div className="head-block">
        <span className="eyebrow">Search</span>
        <SearchBox q={q} />
        <p className="faint" role="status">
          {count} {count === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
        </p>
      </div>
      {count === 0 ? (
        <Suggestions terms={withMoves ? await suggestionTerms(supabase) : []} withMoves={withMoves} />
      ) : (
        <div className="grid-2">
          {groups.map((g) => (
            <div key={g.key} className="card">
              <span className="eyebrow muted">{g.label}</span>
              <div className="list">
                {g.hits.map((h) => (
                  <Row key={h.id} group={g.key} hit={h} level={levels.get(h.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
