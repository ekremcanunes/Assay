// Login/Register ortak alan stilleri — VOLTAJ sistemi.
// Alan: yüzey dolgusu + yalnızca alt kenarlık (çerçeveli input yok).
// Buton: ink dolu, radius 8px. Voltaj rengi burada görünmez.
// Mobilde alan 52px ve yazı 16px: iOS Safari 16px altı alana odaklanınca sayfayı yakınlaştırır.
export const authLabelCls =
  'mt-4 mb-1.5 block label text-muted-foreground'

export const authInputCls =
  'h-[52px] w-full rounded-none border-0 border-b border-input bg-secondary px-3 font-mono text-[16px] text-foreground ' +
  'md:h-auto md:py-2.5 md:text-ui ' +
  'placeholder:text-muted-foreground/70 focus:border-foreground focus:outline-none ' +
  'focus:shadow-[inset_0_0_0_2px_hsl(var(--foreground))]'

// Dış boşluk (margin) kullanan yerde verilir: mobilde buton alttaki sabit şeritte durur
export const authSubmitCls =
  'w-full rounded-md bg-foreground py-3.5 text-body font-semibold text-background md:py-3 md:text-ui ' +
  'hover:opacity-90 disabled:opacity-50'

// Giriş/Kayıt iskeleti: mobilde ekranın tamamı form (kart yok); md+ ortada voltaj kenarlı kart.
// (`paper` ve `edge-accent` düz CSS sınıfı olduğu için md: önekini almaz → kart kenarı burada Tailwind ile.)
export const authPageCls =
  'paper flex min-h-dvh bg-card md:items-center md:bg-background md:p-12'

export const authCardCls =
  'relative z-10 flex min-h-dvh w-full flex-col bg-card px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] ' +
  'md:min-h-0 md:max-w-[360px] md:overflow-hidden md:rounded-r-lg md:border md:border-l-[3px] md:border-border md:border-l-voltage! md:p-7'

// Gönder düğmesi şeridi: mobilde ekranın altına yapışık, md+ formun akışında
export const authDockCls =
  'sticky bottom-0 -mx-5 mt-6 border-t border-border bg-card px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 ' +
  'md:static md:mx-0 md:border-0 md:bg-transparent md:p-0'
