import { defineConfig, devices } from '@playwright/test'

// Mobil denetim: aynı testler üç cihazda koşar.
// Uygulama docker compose ile ayakta olmalı (nginx → http://localhost).
export default defineConfig({
  testDir: '.',
  use: {
    baseURL: 'http://localhost',
  },
  projects: [
    // En dar yaygın ekran, Android
    { name: 'android-360', use: { ...devices['Galaxy S24'] } },
    // Kısa ekran + Safari motoru
    { name: 'iphone-se', use: { ...devices['iPhone SE (3rd gen)'] } },
    // En yaygın iPhone boyutu
    { name: 'iphone-13', use: { ...devices['iPhone 13'] } },
  ],
})
