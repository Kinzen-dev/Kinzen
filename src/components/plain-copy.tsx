"use client";

import { useEffect } from "react";

/** Copied Thai text should not carry the invisible line-break joiners. Renders nothing. */
export function PlainCopy() {
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      const text = window.getSelection()?.toString() ?? "";
      if (!text.includes("⁠") || !e.clipboardData) return;
      e.clipboardData.setData("text/plain", text.replaceAll("⁠", ""));
      e.preventDefault();
    };
    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, []);
  return null;
}
