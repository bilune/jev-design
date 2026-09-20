/**
 * The typeface library.
 *
 * A style engine that can only reach two faces can only make two styles look
 * different in shape, never in voice. These are the faces the generator is
 * allowed to choose from; it never names a font that is not loaded here.
 *
 * Each entry publishes a CSS variable. `catalog.ts` maps the same keys to
 * descriptions the model reads, so adding a face here is one edit away from
 * being selectable.
 */
import {
  Archivo,
  Bebas_Neue,
  Courier_Prime,
  DM_Sans,
  EB_Garamond,
  IM_Fell_English,
  Pinyon_Script,
  Fraunces,
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Libre_Baskerville,
  Lora,
  Outfit,
  Playfair_Display,
  Space_Grotesk,
  Syne,
  Abril_Fatface,
  Fredoka,
  Pixelify_Sans,
  Press_Start_2P,
  VT323,
  Work_Sans,
} from "next/font/google"

// next/font requires every loader call to be its own module-scope const, so
// the faces are declared one by one and collected afterwards.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" })
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" })
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })
const syne = Syne({ subsets: ["latin"], variable: "--font-syne" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" })
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" })
const ebGaramond = EB_Garamond({ subsets: ["latin"], variable: "--font-eb-garamond" })
const imFell = IM_Fell_English({ subsets: ["latin"], weight: "400", variable: "--font-im-fell" })
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-pinyon" })
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" })
const baskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-baskerville" })
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-mono" })
const courier = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-courier" })
const vt323 = VT323({ subsets: ["latin"], weight: "400", variable: "--font-vt323" })
/* Two pixel faces, because one pixel face is two different things. `pressStart`
   is the arcade cabinet: enormous, square, unusable below a headline. `pixelify`
   is a bitmap sans that still reads as running text, so a style can be made of
   pixels without becoming unreadable. */
/* Two general-purpose display faces. The category had four and three of them
   were specialists — a copperplate script, an arcade face and a fashion display
   — so anything wanting a heading voice that was not a certificate, a coin-op
   cabinet or a gallery got the condensed poster face by elimination. */
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka" })
const abril = Abril_Fatface({ subsets: ["latin"], weight: "400", variable: "--font-abril" })
const pixelify = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixelify" })
const pressStart = Press_Start_2P({ subsets: ["latin"], weight: "400", variable: "--font-press-start" })

export const fonts = {
  geist,
  geistMono,
  inter,
  dmSans,
  workSans,
  spaceGrotesk,
  archivo,
  outfit,
  syne,
  playfair,
  fraunces,
  lora,
  ebGaramond,
  imFell,
  pinyon,
  instrumentSerif,
  baskerville,
  bebas,
  jetbrainsMono,
  plexMono,
  courier,
  vt323,
  pixelify,
  fredoka,
  abril,
  pressStart,
} as const

/** Every variable class, for the <html> element. */
export const fontClassNames = Object.values(fonts)
  .map((f) => f.variable)
  .join(" ")
