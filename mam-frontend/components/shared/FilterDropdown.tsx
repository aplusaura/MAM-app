"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterOption {
  value: string;
  label: string;
  dot?: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  className?: string;
  accentColor?: string;
}

export function FilterDropdown({ value, onChange, options, placeholder, className = "", accentColor }: FilterDropdownProps) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
      <SelectTrigger className={`h-8 min-w-[120px] max-w-[200px] text-xs font-medium ${accentColor && value !== "all" ? accentColor : ""} ${className}`}>
        <SelectValue placeholder={placeholder}>{selected?.label ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="flex items-center gap-2">
              {o.dot && <span className={`h-2 w-2 rounded-full shrink-0 ${o.dot}`} />}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
