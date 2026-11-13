import * as TooltipPrimitive from "@radix-ui/react-tooltip"

// Kısa ipucu: kesilen metnin tamamı gibi. Tek çocuk alır (asChild); içerik portal ile köke çizilir (MB-07).
export function Tooltip({ content, children, side = "top" }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-50 max-w-xs rounded-lg border border-border bg-popover px-2.5 py-1.5 text-ui text-foreground shadow-float"
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
