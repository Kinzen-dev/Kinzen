"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scanRoots, startGovernor } from "./governor";
import "./governor.css";

/** Mounted once in the root layout: wires the in-view and idle DOM contract (governor.ts), and
 *  finds the new page's sections after a client-side navigation. */
export function MotionGovernor() {
  const pathname = usePathname();
  useEffect(() => {
    startGovernor();
    scanRoots();
  }, [pathname]);
  return null;
}
