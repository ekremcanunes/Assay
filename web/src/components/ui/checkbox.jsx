import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function Checkbox({ checked, onCheckedChange, label, disabled, className, id }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 text-ui text-foreground",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-input bg-transparent transition-colors checked:border-foreground checked:bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
        />
        <Check className="pointer-events-none absolute h-3 w-3 text-background opacity-0 peer-checked:opacity-100" />
      </span>
      {label}
    </label>
  )
}
