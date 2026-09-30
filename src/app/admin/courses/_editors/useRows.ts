"use client";

import { useRef, useState } from "react";
import { moveItem } from "@/lib/content/lists";

export interface Row<T> {
  key: number;
  value: T;
}

export interface RowsApi<T> {
  rows: readonly Row<T>[];
  add: (value: T) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  update: (index: number, value: T) => void;
}

/** Ordered, keyed rows for the list editors (every change returns a new array). */
export function useRows<T>(initial: readonly T[]): RowsApi<T> {
  const nextKey = useRef(initial.length);
  const [rows, setRows] = useState<Row<T>[]>(() => initial.map((value, key) => ({ key, value })));
  return {
    rows,
    add: (value) => setRows((prev) => [...prev, { key: nextKey.current++, value }]),
    remove: (index) => setRows((prev) => prev.filter((_, i) => i !== index)),
    move: (from, to) => setRows((prev) => moveItem(prev, from, to)),
    update: (index, value) => setRows((prev) => prev.map((row, i) => (i === index ? { ...row, value } : row))),
  };
}
