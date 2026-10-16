import { test } from '@playwright/test'

// Mevcut durum taraması: her sayfa için tam ekran görüntüsü + yatay taşma ölçümü.
// Kalıcı test değil; tasarım öncesi fotoğraf çekmek için.
// Panel sayfaları için önce: npx playwright codegen --save-storage=auth.json http://localhost/login
const OUT = 'audit-shots'

async function audit(page, info, path, waitApi) {
  // Piyasa sayfaları dış API'ye bağlı, ilk yanıt 1 dakikayı bulabiliyor → veri gelene kadar bekle
  const data = waitApi && page.waitForResponse((r) => r.url().includes(waitApi) && r.ok(), { timeout: 150_000 })
  await page.goto(path)
  if (data) await data
  await page.waitForLoadState('load')
  await page.waitForTimeout(Number(process.env.AUDIT_WAIT ?? 1500))
  const name = `${info.project.name}${path.replaceAll('/', '_')}`
  // Panelde kaydırmayı <main> yapıyor; tam görüntü için yalnızca bu tarayıcı oturumunda kutuyu aç
  await page.evaluate(() => {
    const main = document.querySelector('main')
    if (!main) return
    main.parentElement.style.height = 'auto'
    main.style.overflow = 'visible'
  })
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true, scale: 'css' })

  // Ekran genişliğini aşan elemanlar (yatay kaydırmanın sebebi)
  const overflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const offenders = [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > vw + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.getAttribute('class')).slice(0, 60)}`)
    return { vw, scrollW: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, offenders }
  })
  console.log(`[${name}] ${JSON.stringify(overflow)}`)
}

test.describe('girişsiz', () => {
  for (const path of ['/landing', '/login', '/register']) {
    test(`audit ${path}`, ({ page }, info) => audit(page, info, path))
  }
})

test.describe('panel', () => {
  test.use({ storageState: 'auth.json' })
  for (const path of ['/overview', '/assets', '/assets/gold', '/assets/buy', '/analytics']) {
    test(`audit ${path}`, ({ page }, info) => audit(page, info, path))
  }
})

test.describe('piyasa', () => {
  test.use({ storageState: 'auth.json' })
  test.setTimeout(180_000)
  for (const path of ['/market', '/market/stocks', '/market/gold-fx']) {
    test(`audit ${path}`, ({ page }, info) => audit(page, info, path, '/api/market/overview'))
  }
})
