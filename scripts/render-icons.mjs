// Renders resources/icon.svg into the PNG sources @capacitor/assets expects,
// then: npx capacitor-assets generate --ios
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const svg = await readFile(new URL('../resources/icon.svg', import.meta.url))
const out = p => new URL(`../resources/${p}`, import.meta.url).pathname

await sharp(svg, { density: 300 }).resize(1024, 1024).flatten({ background: '#3e5577' }).png().toFile(out('icon.png'))

// Splash: the icon centred on black, matching the app's background.
const icon = await sharp(svg, { density: 300 }).resize(600, 600).png().toBuffer()
for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: '#000000' } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(out(name))
}
console.log('Wrote resources/icon.png, splash.png, splash-dark.png')
