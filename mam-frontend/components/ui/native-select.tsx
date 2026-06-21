"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

// A styled native <select> for use inside Dialogs/Modals.
// Avoids the @base-ui/react Portal clash that causes Select to hang inside Dialog.
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          // layout
          "w-full h-9 appearance-none rounded-lg border bg-white",
          // border & text
          "border-gray-200 px-3 pr-8 text-sm text-gray-800 font-medium",
          // focus
          "outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-150",
          // dark mode
          "dark:bg-gray-800/80 dark:border-gray-700 dark:text-gray-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/20",
          // disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // option styling (limited browser support)
          "[&>option]:bg-white [&>option]:text-gray-800 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-200",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {/* custom chevron arrow */}
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
        </svg>
      </div>
    </div>
  )
);
NativeSelect.displayName = "NativeSelect";
