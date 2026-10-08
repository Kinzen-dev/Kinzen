import { WORDMARK } from "@/fx/baked/wordmark";
import { decodeMask } from "@/fx/targets/mask";

/** A 0/1 glyph bitmap. Its ink fills the bitmap edge to edge (cropped to the ink box). */
export type Bitmap = { w: number; h: number; bits: Uint8Array };

let wordmark: Bitmap | null = null;

/** The shipped KINZEN ink (the header and hero face and tracking), decoded from the baked mask. */
export function wordmarkBitmap(): Bitmap {
  wordmark ??= { w: WORDMARK.w, h: WORDMARK.h, bits: decodeMask(WORDMARK) };
  return wordmark;
}
