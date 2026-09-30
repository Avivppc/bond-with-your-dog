/** Checks for a clip sent to Roni: MP4 or MOV, up to two minutes. Shared by the browser and the API. */

export const MAX_VIDEO_SECONDS = 120;
/** A little slack for containers that report 2:00.4 on a two-minute clip. */
const DURATION_SLACK_SECONDS = 1;
/** Phones film 4K; two minutes of that is well under 1.5 GB. */
export const MAX_VIDEO_BYTES = 1.5 * 1024 * 1024 * 1024;

const TYPES = ["video/mp4", "video/quicktime", "video/x-m4v"];
const EXTENSIONS = [".mp4", ".mov", ".m4v"];
export const VIDEO_ACCEPT = [...TYPES, ...EXTENSIONS].join(",");

export interface VideoFileInfo {
  name: string;
  type: string;
  size: number;
}

/** null when the file can be sent, otherwise a message for the member. */
export function checkVideoFile(file: VideoFileInfo): string | null {
  const name = file.name.toLowerCase();
  const typeOk = TYPES.includes(file.type) || (!file.type && EXTENSIONS.some((e) => name.endsWith(e)));
  const extOk = EXTENSIONS.some((e) => name.endsWith(e));
  if (!typeOk && !extOk) return "Please choose an MP4 or MOV video.";
  if (file.size <= 0) return "That file is empty. Please choose another video.";
  if (file.size > MAX_VIDEO_BYTES) return "That file is too large. Please send a shorter clip (up to 2 minutes).";
  return null;
}

/** null when the clip is short enough, otherwise a message for the member. */
export function checkVideoDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return "We couldn't read this video's length. Please choose an MP4 or MOV clip.";
  }
  if (seconds > MAX_VIDEO_SECONDS + DURATION_SLACK_SECONDS) {
    const m = Math.floor(seconds / 60);
    const s = String(Math.round(seconds % 60)).padStart(2, "0");
    return `This clip is ${m}:${s} long. Please trim it to 2 minutes or less.`;
  }
  return null;
}

/** "12.4 MB" for the drop zone. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
