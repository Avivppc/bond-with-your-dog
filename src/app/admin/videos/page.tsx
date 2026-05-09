import { createServiceClient } from "@/lib/supabase/admin";
import { approveVideo, unapproveVideo, deleteVideo } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const sb = createServiceClient();
  const { data: pending } = await sb
    .from("student_videos")
    .select("id, user_id, title, description, mux_playback_id, status, consent_public, is_public, approved, created_at")
    .eq("consent_public", true)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tighter">Member Spotlight moderation</h1>
        <p className="text-sm text-slate-500 mt-1">
          Videos submitted with public consent. Approve to feature them on /community.
        </p>
      </header>

      {!pending || pending.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-500 text-sm">
          No videos awaiting review.
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pending.map((v) => (
            <li key={v.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {v.mux_playback_id && (
                <div className="aspect-video bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://image.mux.com/${v.mux_playback_id}/thumbnail.jpg?width=640&fit_mode=preserve`}
                    alt={v.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{v.title}</h3>
                    <p className="text-xs text-slate-500">
                      {new Date(v.created_at).toLocaleDateString()} · {v.user_id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {v.is_public && v.approved ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-green-100 text-green-800">
                        Public
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                {v.description && (
                  <p className="text-sm text-slate-600 line-clamp-3">{v.description}</p>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {v.is_public && v.approved ? (
                    <form action={unapproveVideo}>
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        type="submit"
                        className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-amber-600 text-amber-700"
                      >
                        Unfeature
                      </button>
                    </form>
                  ) : (
                    <form action={approveVideo}>
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        type="submit"
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-600 text-white"
                      >
                        Approve & feature
                      </button>
                    </form>
                  )}
                  <form action={deleteVideo}>
                    <input type="hidden" name="id" value={v.id} />
                    <button
                      type="submit"
                      className="text-xs font-bold px-3 py-1.5 rounded-full text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
