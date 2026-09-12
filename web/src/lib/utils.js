import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
  Ölçek sınıfları (text-micro … text-title) Tailwind'in varsayılan adları değil.
  Bildirilmezse tailwind-merge bunları renk sanıp `text-foreground` ile aynı
  gruba koyuyor ve boyutu düşürüyordu — font-size grubuna açıkça kaydediyoruz.
*/
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['micro', 'ui', 'body', 'figure', 'head', 'title'] }],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
