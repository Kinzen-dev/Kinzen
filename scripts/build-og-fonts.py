"""
Builds the share-card fonts in assets/fonts/ (Satori, src/components/og/og.tsx).

Satori reads static TTF only, and does no Thai shaping: a tone mark after an upper vowel (ที่,
ปั้น) is drawn at its low default height, inside the vowel, and vanishes; a mark over a tall
consonant (ป ฝ ฟ ฬ) sinks into its ascender (ปุ่น). So the font also carries ready-made glyphs on
private-use code points, and og.tsx swaps the sequences for them before rendering:
  U+F710 + 5 * vowel + tone   upper vowel + tone, stacked (UPPER and TONES order below)
  U+F730 + i                  MARKS[i], moved left of a tall consonant's ascender
  U+F750 + 5 * vowel + tone   the stacked pair, moved left the same way

Steps per face: subset to Latin + Thai, unwrap extension lookups (Satori's opentype.js rejects
GSUB type 7), add the stacked glyphs.

Usage (fontTools in a venv; the source TTFs are Google Fonts' static instances, fetched from
https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;600;700&family=Google+Sans+Code):
  python3 -m venv /tmp/ft && /tmp/ft/bin/pip install fonttools
  /tmp/ft/bin/python scripts/build-og-fonts.py <GoogleSans-400.ttf> <-600.ttf> <-700.ttf> <GoogleSansCode-400.ttf>
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

OUT = Path(__file__).resolve().parent.parent / "assets" / "fonts"
TEXT = "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212"
THAI = "U+0E00-0E7F,U+25CC"
UPPER = [0x0E31, 0x0E34, 0x0E35, 0x0E36, 0x0E37]  # ั ิ ี ึ ื
TONES = [0x0E48, 0x0E49, 0x0E4A, 0x0E4B, 0x0E4C]  # ่ ้ ๊ ๋ ์
MARKS = [0x0E31, 0x0E34, 0x0E35, 0x0E36, 0x0E37, 0x0E47, 0x0E48, 0x0E49, 0x0E4A, 0x0E4B, 0x0E4C, 0x0E4D]
TALL = [0x0E1B, 0x0E1D, 0x0E1F, 0x0E2C]  # ป ฝ ฟ ฬ
STACK, SHIFT, SHIFT_STACK = 0xF710, 0xF730, 0xF750
GAP = 40  # font units between the vowel's top and the raised tone mark


def unwrap_extensions(font):
    for tag, ext in (("GSUB", 7), ("GPOS", 9)):
        if tag not in font:
            continue
        for lookup in font[tag].table.LookupList.Lookup:
            if lookup.LookupType == ext:
                lookup.SubTable = [st.ExtSubTable for st in lookup.SubTable]
                lookup.LookupType = lookup.SubTable[0].LookupType


def composite(font, order, name, parts, advance_of):
    glyf, hmtx = font["glyf"], font["hmtx"]
    glyph = Glyph()
    glyph.numberOfContours = -1
    glyph.components = []
    for base, x, y in parts:
        c = GlyphComponent()
        c.glyphName, c.x, c.y, c.flags = base, x, y, 0
        glyph.components.append(c)
    order.append(name)
    glyf.glyphOrder = order
    glyf.glyphs[name] = glyph
    hmtx[name] = (0, hmtx[advance_of][1])


def map_code(font, code, name):
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[code] = name


def tall_shift(font, marks):
    """How far left a mark must move to clear the ascender of every tall consonant."""
    cmap, glyf, hmtx = font.getBestCmap(), font["glyf"], font["hmtx"]
    top = glyf[cmap[0x0E01]]  # ก: the height of a plain consonant
    top.recalcBounds(glyf)
    right = 0
    for m in marks:
        glyf[cmap[m]].recalcBounds(glyf)
        right = max(right, glyf[cmap[m]].xMax)
    dx = 0
    for c in TALL:
        g = cmap[c]
        coords, _, _ = glyf[g].getCoordinates(glyf)
        stem = min(x for x, y in coords if y > top.yMax + 20)
        dx = min(dx, stem - GAP - hmtx[g][0] - right)
    return dx


def add_thai_marks(font):
    cmap, glyf = font.getBestCmap(), font["glyf"]
    order = list(font.getGlyphOrder())
    dx = tall_shift(font, MARKS)
    for i, m in enumerate(MARKS):
        composite(font, order, f"{cmap[m]}.tall", [(cmap[m], dx, 0)], cmap[m])
        map_code(font, SHIFT + i, f"{cmap[m]}.tall")
    for vi, v in enumerate(UPPER):
        vowel = cmap[v]
        glyf[vowel].recalcBounds(glyf)
        for ti, t in enumerate(TONES):
            tone = cmap[t]
            glyf[tone].recalcBounds(glyf)
            dy = max(0, glyf[vowel].yMax + GAP - glyf[tone].yMin)
            for base, x in ((STACK, 0), (SHIFT_STACK, dx)):
                name = f"{vowel}_{tone}.stack{'.tall' if x else ''}"
                composite(font, order, name, [(vowel, x, 0), (tone, x, dy)], vowel)
                map_code(font, base + vi * 5 + ti, name)
    font.setGlyphOrder(order)


def build(src, out, thai):
    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    font = TTFont(src)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(TEXT + ("," + THAI if thai else "")))
    sub.subset(font)
    unwrap_extensions(font)
    if thai:
        add_thai_marks(font)
    font.save(out)
    print(out.name, out.stat().st_size, "bytes")


if __name__ == "__main__":
    regular, semibold, bold, code = map(Path, sys.argv[1:5])
    build(regular, OUT / "GoogleSans-Regular.ttf", True)
    build(semibold, OUT / "GoogleSans-SemiBold.ttf", True)
    build(bold, OUT / "GoogleSans-Bold.ttf", True)
    build(code, OUT / "GoogleSansCode-Regular.ttf", False)
