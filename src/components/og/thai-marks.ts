/*
 * Satori draws Thai marks unshaped: a tone after an upper vowel (ที่) lands inside the vowel and a
 * mark over ป ฝ ฟ ฬ sinks into the ascender. The OG fonts carry pre-placed glyphs for both on
 * private-use code points (scripts/build-og-fonts.py); swap the sequences for them.
 */
const UPPER = "\u0E31\u0E34\u0E35\u0E36\u0E37";
const TONES = "\u0E48\u0E49\u0E4A\u0E4B\u0E4C";
const MARKS = "\u0E31\u0E34\u0E35\u0E36\u0E37\u0E47\u0E48\u0E49\u0E4A\u0E4B\u0E4C\u0E4D";
const STACKED = /([\u0E31\u0E34-\u0E37])([\u0E48-\u0E4C])/g;
const TALL = /([\u0E1B\u0E1D\u0E1F\u0E2C][\u0E38-\u0E3A]?)(?:([\u0E31\u0E34-\u0E37])([\u0E48-\u0E4C])|([\u0E31\u0E34-\u0E37\u0E47-\u0E4D]))/g;
const pua = (base: number, i: number) => String.fromCharCode(base + i);
const pair = (v: string, t: string) => UPPER.indexOf(v) * 5 + TONES.indexOf(t);

export function placeThaiMarks(text: string): string {
  return text
    .replace(TALL, (_, head: string, v?: string, t?: string, m?: string) =>
      head + (v && t ? pua(0xf750, pair(v, t)) : pua(0xf730, MARKS.indexOf(m!))),
    )
    .replace(STACKED, (_, v: string, t: string) => pua(0xf710, pair(v, t)));
}
