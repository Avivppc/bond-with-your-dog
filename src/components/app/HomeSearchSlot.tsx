"use client";

import { usePathname } from "next/navigation";
import { HomeSearch } from "./AccountMenu";

/** Search on Home for phones (CSS hides it on wide screens, where the top bar keeps its search). */
export function HomeSearchSlot() {
  return usePathname() === "/home" ? <HomeSearch /> : null;
}
