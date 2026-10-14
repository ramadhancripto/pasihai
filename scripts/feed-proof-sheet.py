"""PASIHAI — proof sheet ya kabla/baada (media + engagement rail).

Hutengeneza docs/shots/media-after/PROOF-muonekano-mpya.png
"""
from PIL import Image, ImageDraw
from pathlib import Path

B = Path('docs/shots/media-before')
A = Path('docs/shots/media-after')
OUT = A / 'PROOF-muonekano-mpya.png'

BG = (238, 243, 241)
INK = (15, 122, 97)
GREY = (118, 126, 122)
DARK = (17, 28, 45)

PAD = 26
GAP = 24
HEAD = 70


def scaled(im, w):
    r = w / im.width
    return im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)


def build():
    rows = [
        ('REEL · simu 390px · LIGHT', 'mobile-390-light-reel.png', 320),
        ('REEL · simu 390px · DARK', 'mobile-390-dark-reel.png', 320),
        ('REEL · desktop 1440px · LIGHT', 'desktop-1440-light-reel.png', 560),
        ('VIDEO · simu 390px · LIGHT', 'mobile-390-light-video.png', 320),
        ('VIDEO · simu 390px · DARK', 'mobile-390-dark-video.png', 320),
    ]
    rail = []
    for theme in ('light', 'dark'):
        rail.append(
            (
                f'ENGAGEMENT · simu 390px · {theme.upper()}',
                f'mobile-390-{theme}-image-rail.png',
                f'mobile-390-{theme}-image-rail-liked.png',
            )
        )

    tiles = []
    for title, name, w in rows:
        ib, ia = Image.open(B / name).convert('RGB'), Image.open(A / name).convert('RGB')
        pb, pa = scaled(ib, w), scaled(ia, w)
        tiles.append((title, pb, pa, ('KABLA', 'BAADA')))
    for title, before, after in rail:
        rb = scaled(Image.open(B / before).convert('RGB'), 300)
        ra = scaled(Image.open(A / after).convert('RGB'), 300)
        tiles.append((title, rb, ra, ('KABLA', 'BAADA (liked)')))

    col_w = max(t[1].width + GAP + t[2].width for t in tiles)
    width = PAD * 2 + col_w
    height = HEAD + sum(30 + max(t[1].height, t[2].height) + 30 for t in tiles) + PAD
    canvas = Image.new('RGB', (width, height), BG)
    d = ImageDraw.Draw(canvas)

    d.text((PAD, 20), 'PASIHAI · HOME FEED — VIDEO/REEL + ENGAGEMENT RAIL', fill=DARK)
    d.text((PAD, 38), 'styling pekee · hakuna maudhui yaliyoongezwa au kubadilishwa', fill=GREY)

    y = HEAD
    for title, ib, ia, (lb, la) in tiles:
        d.text((PAD, y), title, fill=INK)
        y += 24
        canvas.paste(ib, (PAD, y))
        x2 = PAD + ib.width + GAP
        canvas.paste(ia, (x2, y))
        h = max(ib.height, ia.height)
        d.text((PAD + 2, y + h + 6), lb, fill=GREY)
        d.text((x2 + 2, y + h + 6), la, fill=INK)
        y += h + 34
    canvas.save(OUT)
    print('imeandaliwa:', OUT, canvas.size)


build()
