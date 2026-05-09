"use client";

import { useState } from "react";

export default function AskCoachFab() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        body: JSON.stringify({
          subject: fd.get("subject"),
          message: fd.get("message"),
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-8 hidden lg:flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-[60]"
        style={{ backgroundColor: "#0e666a", color: "#c8fcff" }}
      >
        <div className="relative">
          <span className="material-symbols-outlined text-2xl">chat_bubble</span>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0e666a]" style={{ backgroundColor: "#8b4b00" }} />
        </div>
        <span className="font-bold">Ask the team</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(36,48,54,0.5)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center py-8">
                <span
                  className="material-symbols-outlined text-5xl mb-3 block"
                  style={{ color: "#0e666a", fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <h3 className="text-2xl font-extrabold mb-2" style={{ fontFamily: "var(--font-headline)" }}>
                  Thanks!
                </h3>
                <p className="text-sm mb-6" style={{ color: "#515d64" }}>
                  Roni&apos;s team will get back to you shortly.
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    setDone(false);
                  }}
                  className="px-6 py-2.5 rounded-full font-bold text-sm kinetic-gradient"
                  style={{ color: "#fff0e6" }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3
                      className="text-2xl font-extrabold"
                      style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
                    >
                      Ask the team
                    </h3>
                    <p className="text-sm" style={{ color: "#515d64" }}>
                      Stuck on a step? Send Roni a question.
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="material-symbols-outlined text-slate-400 hover:text-slate-700"
                  >
                    close
                  </button>
                </div>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
                )}
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                  <input
                    name="subject"
                    type="text"
                    required
                    placeholder="What's it about?"
                    className="px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-300 focus:outline-none"
                  />
                  <textarea
                    name="message"
                    required
                    rows={5}
                    placeholder="Tell us what you're working on..."
                    className="px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-300 focus:outline-none resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="self-end px-6 py-2.5 rounded-full font-bold text-sm kinetic-gradient disabled:opacity-60"
                    style={{ color: "#fff0e6" }}
                  >
                    {sending ? "Sending..." : "Send question"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
