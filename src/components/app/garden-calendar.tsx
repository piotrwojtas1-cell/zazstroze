"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { MONTHS } from "@/lib/dates";
import { cn } from "@/lib/cn";

interface Task {
  id: string;
  month: number;
  title: string;
  description: string;
  articleSlug: string | null;
  interest: { name: string; emoji: string } | null;
}

export function GardenCalendar({ tasks, initialMonth }: { tasks: Task[]; initialMonth: number }) {
  const [month, setMonth] = useState(initialMonth);
  const list = tasks.filter((t) => t.month === month);
  const name = MONTHS[month - 1]!;
  const go = (d: number) => setMonth((m) => ((m - 1 + d + 12) % 12) + 1);

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between p-2">
        <button type="button" onClick={() => go(-1)} className="flex size-11 items-center justify-center rounded-xl hover:bg-forest-50" aria-label="Poprzedni miesiąc">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 className="text-xl font-semibold capitalize" aria-live="polite">
          {name}
          {month === initialMonth && <span className="ml-2 align-middle text-xs font-sans font-medium text-clay-700">teraz</span>}
        </h2>
        <button type="button" onClick={() => go(1)} className="flex size-11 items-center justify-center rounded-xl hover:bg-forest-50" aria-label="Następny miesiąc">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1" role="group" aria-label="Wybierz miesiąc">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonth(i + 1)}
            aria-pressed={month === i + 1}
            className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize ring-1", month === i + 1 ? "bg-forest-700 text-white ring-forest-700" : "bg-white ring-forest-900/10")}
          >
            {m.slice(0, 3)}
          </button>
        ))}
      </div>
      <ol className="relative space-y-3 border-l-2 border-forest-200 pl-5">
        {list.map((t) => (
          <li key={t.id} className="card relative p-4">
            <span className="absolute -left-[29px] top-5 size-3.5 rounded-full bg-forest-600 ring-4 ring-cream" aria-hidden />
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-sans text-[15px] font-semibold text-ink">{t.title}</h3>
              {t.interest && <span className="chip shrink-0 bg-forest-50 text-forest-800"><span aria-hidden>{t.interest.emoji}</span>{t.interest.name}</span>}
            </div>
            <p className="mt-1 text-sm text-muted">{t.description}</p>
            {t.articleSlug && (
              <Link href={`/porady/${t.articleSlug}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:underline">
                <BookOpen className="size-4" aria-hidden /> Przeczytaj poradę
              </Link>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-muted">Brak zaplanowanych prac w tym miesiącu.</li>}
      </ol>
    </div>
  );
}
