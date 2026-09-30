"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** "Good morning, Roni" by the viewer's own clock (a neutral "Hello" on the server render). */
export function Greeting({ name }: { name: string }) {
  const hour = useSyncExternalStore(subscribe, () => new Date().getHours(), () => -1);
  const part = hour < 0 ? "Hello" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <>
      {part}, {name}
    </>
  );
}
