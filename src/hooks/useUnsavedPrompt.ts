import { useEffect } from "react";

/**
 * Warn the user before they close/reload the tab while there are unsaved
 * (open, uncommitted) row edits.
 */
export function useUnsavedPrompt(hasUnsaved: boolean): void {
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for the prompt to show in some browsers.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);
}
