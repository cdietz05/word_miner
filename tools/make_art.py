# Draws the game's pixel art: the 16 x 16 block textures (one per world, the
# letter blocks, the cracks that spread as a block is tapped) and the app
# icons. Everything is generated here from a fixed seed, so it's all
# original and can be redrawn by re-running this.
#
#   python3 tools/make_art.py      (needs Pillow)

import os
import random

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ART = os.path.join(ROOT, 'art')
ICONS = os.path.join(ROOT, 'icons')


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def noise_block(seed, colors, weights, size=16):
    # Every pixel one of [colors], picked by [weights] - the speckled look
    # of a pixel block.
    rng = random.Random(seed)
    img = Image.new('RGBA', (size, size))
    palette = [hex_rgb(c) + (255,) for c in colors]
    for y in range(size):
        for x in range(size):
            img.putpixel((x, y), rng.choices(palette, weights)[0])
    return img


def grass_block(seed):
    # Grass on top, dirt below, with the grass hanging a little over the edge.
    rng = random.Random(seed)
    img = noise_block(seed, ['#866043', '#6f4e37', '#9b7653', '#5c4130'], [5, 3, 2, 1])
    greens = [hex_rgb(c) + (255,) for c in ['#5d9c3a', '#4b8a2c', '#72b84a', '#3f7a24']]
    for x in range(16):
        depth = 3 + rng.choice([0, 0, 1, 1, 2])
        for y in range(depth):
            img.putpixel((x, y), rng.choice(greens))
    return img


def cracks(stage):
    # Dark crack lines on a transparent square, more of them each stage.
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    lines = [
        [(7, 7), (6, 6), (5, 6), (4, 5), (8, 8), (9, 9), (9, 10), (10, 11)],
        [(8, 6), (9, 5), (10, 5), (11, 4), (6, 8), (5, 9), (4, 10), (4, 11), (3, 12)],
        [(7, 4), (7, 3), (6, 2), (10, 8), (11, 8), (12, 9), (13, 9), (6, 10), (6, 11), (7, 12), (2, 7), (1, 7)],
    ]
    for points in lines[:stage]:
        for x, y in points:
            img.putpixel((x, y), (20, 20, 24, 235))
    return img


def pickaxe_icon(size):
    # The app icon: a grass block with a pickaxe over it, drawn at 32 x 32
    # with no smoothing and scaled up, outlined so it reads at home-screen
    # size.
    from PIL import ImageDraw

    canvas = Image.new('RGBA', (32, 32), hex_rgb('#6db3f2') + (255,))
    block = grass_block(7).resize((20, 20), Image.NEAREST)
    canvas.alpha_composite(block, (6, 10))

    tool = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tool)
    outline = hex_rgb('#1a1a1a') + (255,)
    # Outline first, then the colours inside it.
    draw.line([(6, 28), (21, 13)], fill=outline, width=5)
    draw.arc([7, 1, 31, 25], start=195, end=345, fill=outline, width=6)
    draw.line([(6, 28), (21, 13)], fill=hex_rgb('#8a5a2b') + (255,), width=3)
    draw.line([(7, 28), (21, 14)], fill=hex_rgb('#5e3b18') + (255,), width=1)
    draw.arc([8, 2, 30, 24], start=198, end=342, fill=hex_rgb('#5ee0e0') + (255,), width=4)
    draw.arc([8, 3, 30, 25], start=205, end=335, fill=hex_rgb('#2aa7ab') + (255,), width=1)
    canvas.alpha_composite(tool)
    return canvas.resize((size, size), Image.NEAREST)


def main():
    os.makedirs(ART, exist_ok=True)
    os.makedirs(ICONS, exist_ok=True)

    blocks = {
        'grass': grass_block(1),
        'forest': noise_block(2, ['#d8d3c4', '#bfb9a8', '#2e2e2e', '#e9e5da'], [6, 3, 1, 2]),
        'sand': noise_block(3, ['#dccb8a', '#cdb971', '#e8da9f', '#bda864'], [5, 3, 2, 1]),
        'snow': noise_block(4, ['#f4f8fb', '#e3ecf2', '#ffffff', '#cfdbe4'], [5, 3, 3, 1]),
        'stone': noise_block(5, ['#8a8a8a', '#7a7a7a', '#9b9b9b', '#686868'], [5, 3, 2, 1]),
        'jungle': noise_block(6, ['#2f7d32', '#276a2a', '#3f9a3f', '#1d4f20', '#6b4f2a'], [5, 3, 2, 2, 1]),
        'lava': noise_block(8, ['#7a2626', '#652020', '#8f3030', '#e8641c', '#ffb02e'], [6, 4, 3, 1, 1]),
        'sky': noise_block(9, ['#bcd9f5', '#d6e8fa', '#a8cdf0', '#ffffff'], [5, 3, 2, 2]),
        # The letter blocks: plain stone, and gold-flecked once tapped.
        'tile': noise_block(10, ['#9a9a9a', '#8c8c8c', '#a9a9a9', '#7d7d7d'], [5, 3, 2, 1]),
        'tile_lit': noise_block(11, ['#9a9a9a', '#8c8c8c', '#f2c94c', '#e0a82e', '#fff1a8'], [5, 3, 2, 1, 1]),
        'dirt': noise_block(12, ['#866043', '#6f4e37', '#9b7653', '#5c4130'], [5, 3, 2, 1]),
    }
    for name, img in blocks.items():
        img.save(os.path.join(ART, f'{name}.png'))
    for stage in (1, 2, 3):
        cracks(stage).save(os.path.join(ART, f'crack{stage}.png'))

    for size, name in [(180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
        pickaxe_icon(size).convert('RGB').save(os.path.join(ICONS, name))
    print('art and icons written')


if __name__ == '__main__':
    main()
