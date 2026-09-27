"use client";

import { useEffect } from "react";
import { track, type EventName, type EventProps } from "@/lib/analytics";

interface TrackOnMountProps {
  event: EventName;
  props?: EventProps;
}

/** Fires one event when rendered, so server components can report a view. */
export default function TrackOnMount({ event, props }: TrackOnMountProps) {
  const propsKey = JSON.stringify(props ?? {});

  useEffect(() => {
    track(event, JSON.parse(propsKey) as EventProps);
  }, [event, propsKey]);

  return null;
}
