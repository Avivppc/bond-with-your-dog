import { describe, expect, it } from "vitest";
import {
  activeBlockIndex,
  addBlock,
  defaultBlockSeconds,
  findFreeSlot,
  fitToDuration,
  formatTimecode,
  moveBlock,
  parseRoutineItems,
  pixelsToSeconds,
  plannedSeconds,
  removeBlock,
  resizeBlock,
  tickLabels,
  type RoutineItem,
} from "./timeline";
import { isOwnMusicPath, musicDisplayName, routineMusicPath, validateMusicFile } from "./music";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const item = (start: number, end: number, lane = 0, move_id = A): RoutineItem => ({ move_id, start, end, lane });

describe("timeline placement", () => {
  it("keeps only valid stored items", () => {
    expect(parseRoutineItems([item(0, 8), { move_id: "x", start: 0, end: 5, lane: 0 }, item(3, 4), item(0, 4, 5)])).toEqual([item(0, 8)]);
    expect(parseRoutineItems("nope")).toEqual([]);
  });

  it("sizes new blocks from the BPM (two bars) or a default", () => {
    expect(defaultBlockSeconds(null)).toBe(8);
    expect(defaultBlockSeconds(120)).toBe(4);
    expect(defaultBlockSeconds(92)).toBe(5);
    expect(defaultBlockSeconds(20)).toBe(20);
  });

  it("finds the first gap that fits", () => {
    const items = [item(0, 8), item(10, 20)];
    expect(findFreeSlot(items, 0, 2, 60)).toBe(8);
    expect(findFreeSlot(items, 0, 5, 60)).toBe(20);
    expect(findFreeSlot(items, 1, 5, 60)).toBe(0);
    expect(findFreeSlot([item(0, 58)], 0, 5, 60)).toBeNull();
  });

  it("adds after the last block, then uses the second lane, then refuses", () => {
    const first = addBlock([], A, 20, null);
    expect(first.items).toEqual([item(0, 8)]);
    const second = addBlock(first.items, B, 20, null);
    expect(second.items[1]).toEqual(item(8, 16, 0, B));
    const third = addBlock(second.items, A, 20, null);
    expect(third.items.find((i) => i.lane === 1)).toEqual(item(0, 8, 1));
    const full = addBlock([item(0, 20), item(0, 20, 1)], A, 20, null);
    expect(full.ok).toBe(false);
  });

  it("moves blocks within the song and refuses overlaps", () => {
    const items = [item(0, 8), item(10, 18)];
    const moved = moveBlock(items, 0, 30, 0, 40);
    // The moved block keeps its index (selection stays on it); saving sorts.
    expect(moved.ok && moved.items.map((i) => i.start)).toEqual([30, 10]);
    const clamped = moveBlock(items, 1, 100, 0, 40);
    expect(clamped.items.find((i) => i.end === 40)).toBeDefined();
    expect(moveBlock(items, 0, 12, 0, 40).ok).toBe(false);
    expect(moveBlock(items, 0, 12, 1, 40).ok).toBe(true);
  });

  it("resizes up to the next block or the end of the song, never below the minimum", () => {
    const items = [item(0, 8), item(10, 18)];
    expect(resizeBlock(items, 0, 15, 40)[0].end).toBe(10);
    expect(resizeBlock(items, 0, 1, 40)[0].end).toBe(2);
    expect(resizeBlock(items, 1, 99, 40)[1].end).toBe(40);
    expect(removeBlock(items, 0)).toEqual([item(10, 18)]);
  });

  it("trims blocks when the song gets shorter", () => {
    expect(fitToDuration([item(0, 8), item(8, 16), item(15, 20)], 12)).toEqual([item(0, 8), item(8, 12)]);
  });

  it("measures planned time and finds the block playing now", () => {
    const items = [item(0, 8), item(4, 10, 1), item(20, 30)];
    expect(plannedSeconds(items)).toBe(20);
    expect(activeBlockIndex(items, 5)).toBe(0);
    expect(activeBlockIndex(items, 9)).toBe(1);
    expect(activeBlockIndex(items, 15)).toBe(-1);
  });

  it("labels ticks and converts drags", () => {
    expect(tickLabels(168)).toEqual(["0:00", "0:21", "0:42", "1:03", "1:24", "1:45", "2:06", "2:27", "2:48"]);
    expect(tickLabels(0)).toEqual([]);
    expect(formatTimecode(65)).toBe("1:05");
    expect(pixelsToSeconds(160, 640, 160)).toBe(40);
    expect(pixelsToSeconds(10, 0, 160)).toBe(0);
  });
});

describe("music uploads", () => {
  const uid = "280c929b-c7d6-419e-a445-910fe3f88c4f";
  it("accepts audio up to 20 MB", () => {
    expect(validateMusicFile({ name: "waltz.mp3", size: 1000 })).toBeNull();
    expect(validateMusicFile({ name: "waltz.exe", size: 1000 })).toMatch(/audio/);
    expect(validateMusicFile({ name: "waltz.mp3", size: 21 * 1024 * 1024 })).toMatch(/20 MB/);
  });

  it("stores files in the member's own folder", () => {
    const path = routineMusicPath(uid, "Sunday Waltz.M4A", "0b5c8a4e-3a38-4c55-9d7a-2c1f5b4f0c11");
    expect(path).toBe(`${uid}/0b5c8a4e-3a38-4c55-9d7a-2c1f5b4f0c11.m4a`);
    expect(isOwnMusicPath(path, uid)).toBe(true);
    expect(isOwnMusicPath(path, "7ef74000-2d6e-45d4-a772-5c19927835e4")).toBe(false);
    expect(isOwnMusicPath(`${uid}/../x.mp3`, uid)).toBe(false);
    expect(musicDisplayName("Sunday Waltz.mp3")).toBe("Sunday Waltz");
  });
});
