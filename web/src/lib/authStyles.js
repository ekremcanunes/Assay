// Login/Register ortak alan stilleri — VOLTAJ sistemi.
// Alan: yüzey dolgusu + yalnızca alt kenarlık (çerçeveli input yok).
// Buton: ink dolu, radius 8px. Voltaj rengi burada görünmez.
export const authLabelCls =
  'mt-4 mb-1.5 block label text-muted-foreground'

export const authInputCls =
  'w-full rounded-none border-0 border-b border-input bg-secondary px-3 py-2.5 font-mono text-ui text-foreground ' +
  'placeholder:text-muted-foreground/70 focus:border-foreground focus:outline-none ' +
  'focus:shadow-[inset_0_0_0_2px_hsl(var(--foreground))]'

export const authSubmitCls =
  'mt-6 w-full rounded-md bg-foreground py-3 text-ui font-semibold text-background ' +
  'hover:opacity-90 disabled:opacity-50'
