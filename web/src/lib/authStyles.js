// Login/Register ortak alan stilleri — Warm Editorial.
// Alan: beyaz yüzey, 1px hairline çerçeve, 10px köşe; odakta kobalt kenar (parlama yok).
// Buton: kobalt dolu, 10px köşe, 48px.
// Mobilde alan 52px ve yazı 16px: iOS Safari 16px altı alana odaklanınca sayfayı yakınlaştırır.
export const authLabelCls =
  'mt-4 mb-1.5 block label text-muted-foreground'

export const authInputCls =
  'h-[52px] w-full rounded-[10px] border border-border bg-card px-3.5 font-mono text-[16px] text-foreground ' +
  'md:h-12 md:text-body ' +
  'placeholder:text-muted-foreground/70 hover:border-input focus:border-primary focus:outline-none'

// Dış boşluk (margin) kullanan yerde verilir: mobilde buton alttaki sabit şeritte durur
export const authSubmitCls =
  'press flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-body font-semibold text-primary-foreground ' +
  'hover:opacity-90 disabled:opacity-50'

// Giriş/Kayıt iskeleti: mobilde ekranın tamamı form (kart yok); md+ hairline ızgara zemin üstünde kart.
export const authPageCls =
  'paper flex min-h-dvh md:items-center md:p-12'

export const authCardCls =
  'relative z-10 flex min-h-dvh w-full flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] ' +
  'md:min-h-0 md:max-w-[380px] md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-card md:p-7 md:shadow-card'

// Gönder düğmesi şeridi: mobilde ekranın altına yapışık, md+ formun akışında
export const authDockCls =
  'sticky bottom-0 -mx-5 mt-6 border-t border-border bg-background px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 ' +
  'md:static md:mx-0 md:border-0 md:bg-transparent md:p-0'
