"use client";

import { useState } from "react";
import VideoUploader from "./VideoUploader";

export default function UploadModal({
  buttonClassName,
  buttonStyle,
  buttonLabel = "Upload routine",
  defaultCourseId,
  defaultLessonId,
}: {
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  buttonLabel?: string;
  defaultCourseId?: string | null;
  defaultLessonId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          buttonClassName ??
          "kinetic-gradient px-5 py-2.5 rounded-full font-bold text-sm shadow-md"
        }
        style={buttonStyle ?? { color: "#fff0e6" }}
      >
        {buttonLabel}
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
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3
                  className="text-2xl font-extrabold"
                  style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
                >
                  Upload your routine
                </h3>
                <p className="text-sm" style={{ color: "#515d64" }}>
                  Share a video for your private gallery — or opt in to be featured publicly.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="material-symbols-outlined text-slate-400 hover:text-slate-700"
              >
                close
              </button>
            </div>
            <VideoUploader
              onClose={() => setOpen(false)}
              defaultCourseId={defaultCourseId}
              defaultLessonId={defaultLessonId}
            />
          </div>
        </div>
      )}
    </>
  );
}
