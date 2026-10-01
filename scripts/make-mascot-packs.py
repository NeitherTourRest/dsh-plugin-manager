"""Generate the mascot packs shipped with dsh-client-ui-ball.

Run from the repository root:
    python scripts/make-mascot-packs.py <source-dir>

The source directory holds the upstream artwork (improved-1.png for the restored
version, whale-girl-transparent.png for the original). The colourways are
derived here: they rotate hue and leave the line art and alpha alone.
"""

import json
import os
import sys

from PIL import Image

EDGE = 320
AUTHOR = '上善无形 / ZipZipPipe / QYQCAMIAO'
LICENSE = 'CC BY-NC-SA 4.0'

PACKS = [
    ('whale-girl-night', {'zh': '鲸鱼娘·夜', 'en': 'Whale girl · Night'}, 'improved', 0, 1.15, 0.78),
    ('whale-girl-sakura', {'zh': '鲸鱼娘·樱', 'en': 'Whale girl · Sakura'}, 'improved', 58, 0.85, 1.02),
    ('whale-girl-mint', {'zh': '鲸鱼娘·薄荷', 'en': 'Whale girl · Mint'}, 'improved', 200, 0.90, 1.00),
    ('whale-girl-violet', {'zh': '鲸鱼娘·紫', 'en': 'Whale girl · Violet'}, 'improved', 40, 0.95, 0.98),
    ('whale-girl-original', {'zh': '鲸鱼娘·原图', 'en': 'Whale girl · Original'}, 'original', 0, 1.0, 1.0),
]


def colorway(src, hue_shift, sat, val):
    """Rotate hue and scale saturation and value, preserving the alpha channel."""
    r, g, b, a = src.split()
    h, s, v = Image.merge('RGB', (r, g, b)).convert('HSV').split()
    h = h.point(lambda p: (p + hue_shift) % 256)
    s = s.point(lambda p: min(255, int(p * sat)))
    v = v.point(lambda p: min(255, int(p * val)))
    out = Image.merge('HSV', (h, s, v)).convert('RGBA')
    out.putalpha(a)
    return out


def fit(image):
    """Scale to fit the pack edge, preserving aspect ratio."""
    out = image.copy()
    out.thumbnail((EDGE, EDGE), Image.LANCZOS)
    return out


def main():
    if len(sys.argv) < 3:
        raise SystemExit('usage: make-mascot-packs.py <source-dir> <dest-dir>')
    source = sys.argv[1]
    dest = sys.argv[2]
    improved = Image.open(os.path.join(source, 'improved-1.png')).convert('RGBA')
    original = Image.open(os.path.join(source, 'whale-girl-transparent.png')).convert('RGBA')
    base = {'improved': improved, 'original': original}

    for pack_id, title, which, hue, sat, val in PACKS:
        image = base[which] if (hue, sat, val) == (0, 1.0, 1.0) else colorway(base[which], hue, sat, val)
        image = fit(image)
        folder = os.path.join(dest, pack_id)
        os.makedirs(folder, exist_ok=True)
        art = os.path.join(folder, 'idle.webp')
        image.save(art, 'WEBP', quality=88, method=6)
        manifest = {
            'title': title,
            'author': AUTHOR,
            'license': LICENSE,
            'states': {'idle': 'idle.webp'},
        }
        with open(os.path.join(folder, 'pack.json'), 'w', encoding='utf-8') as handle:
            json.dump(manifest, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        print('  %-22s %6db  %dx%d' % (pack_id, os.path.getsize(art), image.width, image.height))


if __name__ == '__main__':
    main()
