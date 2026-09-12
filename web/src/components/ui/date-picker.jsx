import * as React from "react"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { fromDateString, toDateString, todayString, formatDisplayDate } from "@/lib/date"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

/**
 * Tarih seçici. Değer her zaman "YYYY-MM-DD" string'idir.
 * onChange(nextValue) — temizlenirse '' döner.
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  disabledDates,
  clearable = true,
  className,
  id,
  ...calendarProps
}) {
  const { t, lang } = useLanguage()
  const [open, setOpen] = React.useState(false)
  const selected = fromDateString(value)

  const handleSelect = (date) => {
    if (!date) return
    onChange?.(toDateString(date))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-ui shadow-sm transition-colors",
            "hover:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
          <span className="flex-1 truncate">
            {value ? formatDisplayDate(value, lang) : (placeholder ?? t("common.selectDate"))}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          disabled={disabledDates}
          autoFocus
          {...calendarProps}
        />
        <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
          <button
            type="button"
            onClick={() => { onChange?.(todayString()); setOpen(false) }}
            className="rounded px-2 py-1 text-micro font-medium text-brass transition-colors hover:bg-brass/10"
          >
            {t("common.today")}
          </button>
          {clearable && value && (
            <button
              type="button"
              onClick={() => { onChange?.(''); setOpen(false) }}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-micro text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3 w-3" />
              {t("common.clear")}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
