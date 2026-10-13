"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function InterestPicker({
  interests,
  value,
  onChange,
}: {
  interests: { key: string; name: string; emoji: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {interests.map((i) => {
        const on = value.includes(i.key);
        return (
          <button
            key={i.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((k) => k !== i.key) : [...value, i.key])}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium ring-1 transition",
              on ? "bg-forest-700 text-white ring-forest-700" : "bg-white text-ink ring-forest-900/15 hover:bg-forest-50",
            )}
          >
            <span aria-hidden="true">{i.emoji}</span>
            {i.name}
            {on && <Check className="size-4" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
