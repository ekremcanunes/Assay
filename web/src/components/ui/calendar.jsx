import * as React from "react"
import { DayPicker } from "react-day-picker"
import { tr, enUS } from "react-day-picker/locale"
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"

function Chevron({ orientation = "left", size = 16, className }) {
  const Icon =
    orientation === "right" ? ChevronRight : orientation === "down" ? ChevronDown : ChevronLeft
  return <Icon className={className} style={{ width: size, height: size }} />
}

const navButton =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:pointer-events-none aria-disabled:opacity-30"

export function Calendar({ className, classNames, startMonth, endMonth, ...props }) {
  const { lang } = useLanguage()
  const now = new Date()

  return (
    <DayPicker
      locale={lang === "tr" ? tr : enUS}
      captionLayout="dropdown"
      showOutsideDays
      startMonth={startMonth ?? new Date(now.getFullYear() - 20, 0)}
      endMonth={endMonth ?? new Date(now.getFullYear(), 11)}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-3",
        month: "flex flex-col gap-3",

        nav: "absolute inset-x-0 top-0 z-20 flex h-8 items-center justify-between",
        button_previous: navButton,
        button_next: navButton,

        month_caption: "flex h-8 items-center justify-center",
        dropdowns: "flex items-center gap-1.5",
        dropdown_root: "relative inline-flex items-center",
        dropdown:
          "absolute inset-0 z-10 w-full cursor-pointer opacity-0 [&>option]:bg-card [&>option]:text-foreground",
        caption_label:
          "inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-ui font-medium text-foreground",

        month_grid: "w-full border-collapse",
        weekdays: "",
        weekday: "h-8 w-9 font-mono text-[0.7rem] font-normal uppercase text-muted-foreground",
        weeks: "",
        week: "",

        day: "h-9 w-9 p-0 text-center",
        day_button:
          "tabular h-9 w-9 rounded-md text-ui text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",

        today: "[&>button]:font-semibold [&>button]:text-brass",
        selected:
          "[&>button]:bg-foreground [&>button]:font-medium [&>button]:text-background [&>button]:hover:opacity-90",
        outside: "[&>button]:text-muted-foreground/50",
        disabled: "[&>button]:pointer-events-none [&>button]:text-muted-foreground/40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{ Chevron }}
      {...props}
    />
  )
}
