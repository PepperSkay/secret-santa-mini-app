"""Build the local webfont, completing the Russian alphabet without changing existing outlines."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "assets" / "fonts"
font = TTFont(FONTS / "yermak.ttf")
cmap = font.getBestCmap()

def add(name, glyph, advance, codepoints):
    order = [g for g in font.getGlyphOrder() if g != name]
    font["glyf"][name] = glyph
    font["hmtx"][name] = (advance, 30)
    font.setGlyphOrder(order + [name])
    for table in font["cmap"].tables:
        if table.isUnicode():
            for codepoint in codepoints:
                table.cmap[codepoint] = name

pen = TTGlyphPen(font.getGlyphSet())
pen.addComponent(cmap[0x42C], (1, 0, 0, 1, 0, 0))
pen.addComponent(cmap[ord("I")], (1, 0, 0, 1, 560, 0))
add("SkazkaYery", pen.glyph(), 892, [0x42B, 0x44B])
pen = TTGlyphPen(font.getGlyphSet())
pen.addComponent(cmap[0x415], (1, 0, 0, 1, 0, 0))
for x in (210, 380):
    y, r = 816, 29
    pen.moveTo((x + r, y))
    pen.qCurveTo((x + r, y + r), (x, y + r))
    pen.qCurveTo((x - r, y + r), (x - r, y))
    pen.qCurveTo((x - r, y - r), (x, y - r))
    pen.qCurveTo((x + r, y - r), (x + r, y))
    pen.closePath()
add("SkazkaYo", pen.glyph(), 586, [0x401, 0x451])
font.flavor = "woff2"
font.save(FONTS / "yermak-ui.woff2")
verified = TTFont(FONTS / "yermak-ui.woff2")
assert all(c in verified.getBestCmap() for c in list(range(0x410, 0x450)) + [0x401, 0x451])
print("Russian alphabet complete; WOFF2:", (FONTS / "yermak-ui.woff2").stat().st_size, "bytes")
