import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberShell from "@/components/member/MemberShell";
import StudentVideoCard from "@/components/member/StudentVideoCard";
import UploadModal from "@/components/member/UploadModal";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const [profileRes, achievementsRes, videosRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("achievements").select("code").eq("user_id", user.id),
    supabase
      .from("student_videos")
      .select("id, title, description, mux_playback_id, status, created_at, duration_seconds, is_public, approved")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const profile = profileRes.data ?? {};
  const badgeCount = (achievementsRes.data ?? []).length;
  const videos = videosRes.data ?? [];

  return (
    <MemberShell>
      <div className="px-4 md:px-8 lg:px-12 py-10 max-w-7xl mx-auto">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-start">
          <div className="lg:col-span-4 relative group">
            <div
              className="relative w-full aspect-square rounded-[2rem] overflow-hidden shadow-2xl rotate-2 group-hover:rotate-0 transition-transform duration-500 flex items-center justify-center text-7xl font-black"
              style={{
                backgroundColor: "#a6eff3",
                color: "#005b5f",
                fontFamily: "var(--font-headline)",
              }}
            >
              {(profile.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div
              className="absolute -bottom-4 -left-4 bg-white p-4 rounded-[1rem] shadow-xl -rotate-3 group-hover:rotate-0 transition-transform duration-500"
            >
              <p
                className="font-extrabold leading-none"
                style={{ fontFamily: "var(--font-headline)", color: "#8b4b00" }}
              >
                KETA TOV
              </p>
              <p className="text-xs font-bold uppercase tracking-tighter" style={{ color: "#515d64" }}>
                Member
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full"
                style={{ backgroundColor: "#fdd400", color: "#594a00" }}
              >
                Member
              </span>
              <span
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full"
                style={{ backgroundColor: "#a6eff3", color: "#005b5f" }}
              >
                {badgeCount} Badge{badgeCount === 1 ? "" : "s"}
              </span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-black tracking-tight mb-4"
              style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
            >
              {profile.tagline || "Dance like no one is watching, but everyone is applauding."}
            </h1>
            <p className="text-lg leading-relaxed mb-6 max-w-2xl" style={{ color: "#515d64" }}>
              {profile.bio ||
                "Tell us about yourself and your dog. Add your story below to personalize your member profile."}
            </p>
            <div className="flex flex-wrap gap-4">
              {profile.dog_name && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                  <span
                    className="material-symbols-outlined"
                    style={{ color: "#8b4b00", fontVariationSettings: "'FILL' 1" }}
                  >
                    pets
                  </span>
                  <span className="font-bold text-sm">
                    {profile.dog_name}
                    {profile.dog_age ? ` · ${profile.dog_age}y` : ""}
                    {profile.dog_breed ? ` · ${profile.dog_breed}` : ""}
                  </span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                  <span
                    className="material-symbols-outlined"
                    style={{ color: "#0e666a", fontVariationSettings: "'FILL' 1" }}
                  >
                    location_on
                  </span>
                  <span className="font-bold text-sm">{profile.location}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bento: plan + notifications */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div
            className="md:col-span-2 rounded-[2rem] p-8 relative overflow-hidden flex flex-col justify-between min-h-[300px]"
            style={{ backgroundColor: "rgba(166,239,243,0.4)" }}
          >
            <div className="relative z-10">
              <h2
                className="text-2xl font-extrabold mb-2"
                style={{ fontFamily: "var(--font-headline)", color: "#005b5f" }}
              >
                Free Member
              </h2>
              <p style={{ color: "rgba(0,91,95,0.8)" }} className="max-w-sm">
                You currently have access to all free preview lessons. Paid memberships are coming soon.
              </p>
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "rgba(0,91,95,0.6)" }}
                >
                  Plan
                </p>
                <p className="text-xl font-bold" style={{ fontFamily: "var(--font-headline)", color: "#005b5f" }}>
                  Free · $0.00
                </p>
              </div>
              <button
                disabled
                className="font-bold px-8 py-3 rounded-full shadow-lg cursor-not-allowed opacity-70"
                style={{ backgroundColor: "#0e666a", color: "#c8fcff", fontFamily: "var(--font-headline)" }}
              >
                Upgrade (coming soon)
              </button>
            </div>
            <span
              className="material-symbols-outlined absolute -top-10 -right-10 text-[15rem] rotate-12 pointer-events-none"
              style={{ color: "rgba(14,102,106,0.05)" }}
            >
              music_note
            </span>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-sm flex flex-col">
            <h3
              className="text-xl font-extrabold mb-6"
              style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
            >
              Notifications
            </h3>
            <NotifToggle label="New courses" desc="Weekly training drops" on />
            <NotifToggle label="Live sessions" desc="Alerts for Q&As" on />
            <NotifToggle label="Community" desc="Replies and likes" on={false} />
            <p className="mt-6 text-xs" style={{ color: "#515d64" }}>
              Granular preferences coming soon.
            </p>
          </div>
        </section>

        {/* Edit form */}
        <section className="bg-white rounded-[2rem] p-8 shadow-sm mb-16">
          <h2
            className="text-2xl font-extrabold mb-6"
            style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
          >
            Edit your profile
          </h2>
          {saved && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">Saved.</div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {decodeURIComponent(error)}
            </div>
          )}
          <form action={updateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Your name" name="full_name" defaultValue={profile.full_name} />
            <Field label="Tagline" name="tagline" defaultValue={profile.tagline} />
            <Field
              label="Bio"
              name="bio"
              textarea
              defaultValue={profile.bio}
              className="md:col-span-2"
            />
            <Field label="Dog's name" name="dog_name" defaultValue={profile.dog_name} />
            <Field label="Dog's breed" name="dog_breed" defaultValue={profile.dog_breed} />
            <Field
              label="Dog's age (years)"
              name="dog_age"
              type="number"
              defaultValue={profile.dog_age}
            />
            <Field label="Location" name="location" defaultValue={profile.location} />
            <div className="md:col-span-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-full font-bold text-sm kinetic-gradient"
                style={{ color: "#fff0e6" }}
              >
                Save changes
              </button>
            </div>
          </form>
        </section>

        <div className="flex justify-end">
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full font-bold text-sm border-2"
              style={{ borderColor: "#8b4b00", color: "#8b4b00" }}
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Personal video gallery */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2
                className="text-3xl font-black tracking-tight"
                style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
              >
                My video gallery
              </h2>
              <p style={{ color: "#515d64" }}>Routines and practice sessions you&apos;ve uploaded.</p>
            </div>
            <UploadModal buttonLabel="Upload new" />
          </div>
          {videos.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center shadow-sm">
              <span
                className="material-symbols-outlined text-5xl block mb-3"
                style={{ color: "#a2afb6" }}
              >
                videocam
              </span>
              <p className="font-bold mb-2" style={{ color: "#243036" }}>
                No videos yet
              </p>
              <p className="text-sm" style={{ color: "#515d64" }}>
                Upload your first routine to start your private gallery.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((v) => (
                <div key={v.id} className="space-y-2">
                  <StudentVideoCard video={v} />
                  {v.is_public && v.approved && (
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#0e666a" }}>
                      ★ Featured in spotlight
                    </p>
                  )}
                  {v.is_public === false && v.status === "ready" && (
                    <p className="text-xs" style={{ color: "#515d64" }}>
                      Private to your gallery
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs" style={{ color: "#a2afb6" }}>
          <Link href="/dashboard" className="font-bold" style={{ color: "#0e666a" }}>
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </MemberShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  textarea = false,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  textarea?: boolean;
  className?: string;
}) {
  const baseInput =
    "px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-orange-300 focus:outline-none";
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue ?? ""} rows={3} className={`${baseInput} resize-none`} />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          className={baseInput}
        />
      )}
    </label>
  );
}

function NotifToggle({ label, desc, on }: { label: string; desc: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <p className="font-bold text-sm">{label}</p>
        <p className="text-xs" style={{ color: "#515d64" }}>
          {desc}
        </p>
      </div>
      <div
        className="w-12 h-6 rounded-full relative"
        style={{ backgroundColor: on ? "#8b4b00" : "#cde0ea" }}
      >
        <div
          className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
          style={{ left: on ? "auto" : "0.25rem", right: on ? "0.25rem" : "auto" }}
        />
      </div>
    </div>
  );
}
