import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { pageWindow, parsePage } from "@/lib/admin-helpers/pagination";
import { formatAmounts } from "@/lib/admin-helpers/money";
import { BTN_PRIMARY, BTN_SECONDARY, Card, EmptyState, Notice, PageHeader, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { Avatar, MENU_ITEM, OptionsMenu, Pagination, shortDate } from "../_components/list-kit";
import { ContactsToolbar } from "./ContactsToolbar";
import { PasswordResetButton } from "./PasswordResetButton";
import { BULK_FORM_ID, BulkBar, SelectAllBox } from "./BulkBar";
import { loadOfferOptions } from "./_lib/person-data";
import { loadPeople, parseSegment, PEOPLE_PER_PAGE, SEGMENTS, type PeoplePage, type PersonRow, type Segment } from "./_lib/people-data";

export const dynamic = "force-dynamic";

const MAX_SEARCH = 100;

interface PeopleParams {
  q?: string;
  segment?: string;
  page?: string;
  ok?: string;
  error?: string;
}

function ContactRow({ person }: { person: PersonRow }) {
  const name = person.fullName || person.email.split("@")[0];
  const href = `/admin/people/${person.userId}`;
  return (
    <tr className={TROW}>
      <td className={`${TD} w-10 pr-0`}>
        <input type="checkbox" name="ids" value={person.userId} form={BULK_FORM_ID} aria-label={`Select ${person.email}`} className="h-4 w-4 accent-[#343332]" />
      </td>
      <td className={TD}>
        <Link href={href} className="flex items-center gap-3 font-medium hover:underline">
          <Avatar name={name} src={person.avatarUrl} />
          <span className="min-w-0">
            <span className="block truncate">{name}</span>
            {person.staffRole && <span className="text-[12px] font-normal capitalize text-[#6c6a69]">{person.staffRole}</span>}
          </span>
        </Link>
      </td>
      <td className={`${TD} text-[#3d3c3a]`}>{person.email}</td>
      <td className={TD}>
        {person.marketingOptIn ? (
          <span className="rounded-full bg-[#e3f5e8] px-2.5 py-0.5 text-[12px] font-medium text-[#1c6b35]">Subscribed</span>
        ) : (
          <span className="text-[#9b9997]">Not subscribed</span>
        )}
      </td>
      <td className={`${TD} whitespace-nowrap tabular-nums`}>{formatAmounts(person.lifetimeValue)}</td>
      <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{shortDate(person.createdAt)}</td>
      <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{person.lastSignInAt ? shortDate(person.lastSignInAt) : "Never signed in"}</td>
      <td className={`${TD} text-right`}>
        <OptionsMenu label={`Options for ${person.email}`}>
          <Link href={href} className={MENU_ITEM}>
            View
          </Link>
          <Link href={`${href}#courses`} className={MENU_ITEM}>
            Grant access
          </Link>
          <PasswordResetButton userId={person.userId} className={MENU_ITEM} />
        </OptionsMenu>
      </td>
    </tr>
  );
}

/** A page past the end (e.g. after a search narrowed the list) shows the last real page instead. */
async function loadPeopleClamped(q: string, segment: Segment, requested: number): Promise<PeoplePage> {
  const page = await loadPeople(q, segment, (requested - 1) * PEOPLE_PER_PAGE);
  if (page.rows.length > 0 || requested === 1 || page.failed) return page;
  const firstPage = await loadPeople(q, segment, 0);
  const win = pageWindow(firstPage.total, requested, PEOPLE_PER_PAGE);
  return win.page === 1 ? firstPage : loadPeople(q, segment, win.offset);
}

export default async function ContactsPage({ searchParams }: { searchParams: Promise<PeopleParams> }) {
  await requireStaff("sales");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, MAX_SEARCH) : "";
  const segment = parseSegment(params.segment);
  const requested = parsePage(params.page);
  const [result, offers] = await Promise.all([loadPeopleClamped(q, segment, requested), loadOfferOptions()]);
  const win = pageWindow(result.total, requested, PEOPLE_PER_PAGE);

  const hrefFor = (page: number) => {
    const next = new URLSearchParams({ ...(q ? { q } : {}), ...(segment !== "all" ? { segment } : {}), page: String(page) });
    return `/admin/people?${next.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts"
        actions={
          <>
            <Link href="/admin/people/export" className={BTN_SECONDARY} prefetch={false}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                download
              </span>
              Export
            </Link>
            <Link href="/admin/people/import" className={BTN_SECONDARY}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                upload
              </span>
              Import
            </Link>
            <Link href="/admin/people/add" className={BTN_PRIMARY}>
              Add contacts
            </Link>
          </>
        }
      />
      {typeof params.ok === "string" && <Notice tone="success">{params.ok}</Notice>}
      {typeof params.error === "string" && <Notice tone="error">{params.error}</Notice>}

      <Card flush>
        <div className="-mt-1 px-5 pt-4">
          <ContactsToolbar key={`${segment}:${q}`} segments={SEGMENTS} segment={segment} query={q} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[14px] text-[#6c6a69]">
          <span>
            Displaying {win.first}–{win.last} of <b className="text-[#1a1a19]">{result.total.toLocaleString("en-US")}</b> contacts
          </span>
          <span className="flex items-center gap-3">
            <span>{PEOPLE_PER_PAGE} / page</span>
            <Pagination page={win.page} pages={win.pages} hrefFor={hrefFor} />
          </span>
        </div>
        <BulkBar offers={offers} returnTo={hrefFor(win.page)} />
        {result.failed ? (
          <EmptyState title="Contacts couldn't be loaded.">Please refresh the page. If it keeps happening, check the server logs.</EmptyState>
        ) : result.rows.length === 0 ? (
          <EmptyState title={q ? "No contacts match your search." : "No contacts in this segment yet."} />
        ) : (
          // Visible overflow on wide screens so the last rows' ⋯ menus aren't clipped.
          // `relative` keeps the absolutely positioned sr-only header inside the scroll box on phones.
          <div className="relative overflow-x-auto xl:overflow-visible">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={`${TH} w-10 pr-0`}>
                    <SelectAllBox />
                  </th>
                  <th className={TH}>Name</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Email marketing</th>
                  <th className={TH}>Lifetime value</th>
                  <th className={TH}>Added date</th>
                  <th className={TH}>Last activity</th>
                  <th className={TH}>
                    <span className="sr-only">Options</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((p) => (
                  <ContactRow key={p.userId} person={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
