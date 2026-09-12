import * as React from "react"
import { cn } from "@/lib/utils"

const SYMBOLS = { TRY: "₺", USD: "$", EUR: "€", GBP: "£" }

/**
 * Para/sayı girişi. type="text" + inputMode="decimal" kullanır:
 * ok tuşu/fare tekerleğiyle değerin kazara değişmesini ve tarayıcı
 * spinner'larını önler. Virgül otomatik noktaya çevrilir.
 * onChange(nextValue) — ham string döner.
 */
export const MoneyInput = React.forwardRef(
  ({ className, currency, value, onChange, allowDecimals = true, ...props }, ref) => {
    const symbol = currency ? SYMBOLS[currency] ?? currency : null
    const pattern = allowDecimals ? /^\d*[.]?\d*$/ : /^\d*$/

    const handleChange = (e) => {
      const next = e.target.value.replace(",", ".")
      if (next === "" || pattern.test(next)) onChange?.(next)
    }

    return (
      <div className="relative">
        {symbol && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui text-muted-foreground">
            {symbol}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value ?? ""}
          onChange={handleChange}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent py-1 pr-3 text-right text-ui tabular-nums shadow-sm transition-colors",
            "placeholder:text-muted-foreground hover:border-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            symbol ? "pl-8" : "pl-3",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
MoneyInput.displayName = "MoneyInput"
