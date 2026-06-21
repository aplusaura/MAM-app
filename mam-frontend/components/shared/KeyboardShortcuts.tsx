"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS = [
  { key: "/", description: "Focus search" },
  { key: "Escape", description: "Close modal" },
  { key: "?", description: "Show shortcuts" },
];

export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // "/" focuses global search (always allowed — but skip if already in an input)
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Search"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // "?" toggles the help modal (skip if typing)
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      // "Escape" closes any open dialog (Radix dialogs handle their own Escape,
      // but this handles any additional open overlays)
      if (e.key === "Escape") {
        // If the help modal is open, let the dialog handle it via onOpenChange
        if (helpOpen) return;

        // Otherwise find and try to close any open dialog via a close button
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        if (dialog) {
          const closeBtn = dialog.querySelector<HTMLButtonElement>(
            'button[aria-label="Close"]'
          );
          if (closeBtn) closeBtn.click();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [helpOpen]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody>
            {SHORTCUTS.map(({ key, description }) => (
              <tr key={key} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 pr-6">
                  <kbd className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs font-semibold text-gray-700">
                    {key}
                  </kbd>
                </td>
                <td className="py-2.5 text-gray-600">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
