import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-none border-0 border-b border-input bg-secondary px-3 py-1 text-ui transition-colors file:border-0 file:bg-transparent file:text-ui file:font-medium placeholder:text-muted-foreground hover:border-foreground focus-visible:border-foreground focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = "Input"

export { Input }
