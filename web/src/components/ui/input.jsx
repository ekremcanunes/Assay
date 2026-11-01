import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-12 w-full rounded-[10px] border border-border bg-card px-3.5 py-1 text-body transition-colors file:border-0 file:bg-transparent file:text-ui file:font-medium placeholder:text-muted-foreground hover:border-input focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = "Input"

export { Input }
