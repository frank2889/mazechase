#!/usr/bin/env python3
"""
🎨 MazeChase Sprite Generator
Generert game sprites in Kurzgesagt-style flat vector design.

Stijlregels:
- Flat vector look: geen gradients, alleen egale vlakken
- Geometrische basisvormen: cirkels, rechthoeken, driehoeken
- Dikke contouren in donkerblauw (#0B0F2B)
- Transparante achtergrond
- Cartoonachtig, minimalistisch

Gebruik:
    python sprite_generator.py --type runner --output sprites/
    python sprite_generator.py --type chaser --variant red --output sprites/
    python sprite_generator.py --type pellet --output sprites/
    python sprite_generator.py --type powerup --output sprites/
    python sprite_generator.py --all --output sprites/
"""

import argparse
import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("PIL niet gevonden. Installeer met: pip install Pillow")
    exit(1)

# Kurzgesagt-style kleurenpalet
COLORS = {
    # Primaire kleuren
    'outline': '#0B0F2B',      # Donkerblauw voor contouren
    'background': (0, 0, 0, 0), # Transparant
    
    # Runner (Pac-Man style)
    'runner_body': '#FFD93D',   # Warm geel
    'runner_eye': '#0B0F2B',    # Donkerblauw
    'runner_mouth': '#0B0F2B',  # Donkerblauw
    
    # Chasers (Ghosts)
    'chaser_red': '#FF6B6B',    # Koraal rood
    'chaser_pink': '#F8A5C2',   # Zacht roze
    'chaser_cyan': '#4ECDC4',   # Turquoise
    'chaser_orange': '#FF9F43', # Warm oranje
    'chaser_eye_white': '#FFFFFF',
    'chaser_eye_pupil': '#0B0F2B',
    
    # Collectibles
    'pellet': '#FFE66D',        # Lichtgeel
    'powerup': '#FF6B6B',       # Koraal rood
    'powerup_glow': '#FFE66D',  # Gele gloed
    
    # UI/Environment
    'wall': '#2C3E50',          # Donker leisteen
    'wall_accent': '#34495E',   # Lichter leisteen
    'floor': '#1A1A2E',         # Zeer donkerblauw
    
    # World Themes
    'neon_primary': '#00F5FF',   # Cyaan neon
    'neon_secondary': '#FF00FF', # Magenta
    'sunset_primary': '#FF6B35', # Oranje
    'sunset_secondary': '#F7C59F', # Perzik
    'forest_primary': '#2D5A27',  # Donkergroen
    'forest_secondary': '#6B8E23', # Olijfgroen
    'cyber_primary': '#7B2CBF',   # Paars
    'cyber_secondary': '#E040FB', # Licht paars
}

# Sprite configuraties
SPRITE_CONFIGS = {
    'runner': {
        'size': (64, 64),
        'base_size': 56,
    },
    'chaser': {
        'size': (64, 64),
        'base_size': 56,
        'variants': ['red', 'pink', 'cyan', 'orange']
    },
    'pellet': {
        'size': (16, 16),
        'base_size': 10,
    },
    'powerup': {
        'size': (32, 32),
        'base_size': 24,
    },
    'wall': {
        'size': (32, 32),
    }
}


def hex_to_rgb(hex_color):
    """Converteer hex kleur naar RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_runner_sprite(size=64):
    """
    Creëer Runner sprite (Pac-Man style).
    Gele cirkel met mond, in flat vector stijl.
    """
    img = Image.new('RGBA', (size, size), COLORS['background'])
    draw = ImageDraw.Draw(img)
    
    margin = 4
    body_size = size - margin * 2
    
    # Body - gele cirkel
    body_color = hex_to_rgb(COLORS['runner_body'])
    outline_color = hex_to_rgb(COLORS['outline'])
    
    # Teken de body als een cirkel met een "mond" (pieslice)
    # De mond is een driehoekige opening
    draw.pieslice(
        [margin, margin, size - margin, size - margin],
        start=35,  # Mond opening
        end=325,
        fill=body_color,
        outline=outline_color,
        width=3
    )
    
    # Oog - klein donker cirkeltje
    eye_size = 8
    eye_x = size // 2 + 6
    eye_y = size // 3
    draw.ellipse(
        [eye_x - eye_size//2, eye_y - eye_size//2,
         eye_x + eye_size//2, eye_y + eye_size//2],
        fill=outline_color
    )
    
    return img


def create_chaser_sprite(size=64, variant='red'):
    """
    Creëer Chaser sprite (Ghost style).
    Ronde top met golvende onderkant, in flat vector stijl.
    """
    img = Image.new('RGBA', (size, size), COLORS['background'])
    draw = ImageDraw.Draw(img)
    
    margin = 4
    outline_color = hex_to_rgb(COLORS['outline'])
    
    # Bepaal body kleur op basis van variant
    color_key = f'chaser_{variant}'
    body_color = hex_to_rgb(COLORS.get(color_key, COLORS['chaser_red']))
    
    # Body - bovenste helft is een halve cirkel
    # Onderste helft is een rechthoek met golvende onderkant
    
    # Halve cirkel (boven)
    draw.pieslice(
        [margin, margin, size - margin, size - margin + 10],
        start=180,
        end=360,
        fill=body_color,
        outline=outline_color,
        width=3
    )
    
    # Rechthoekig lichaam
    body_top = size // 2
    body_bottom = size - margin - 8
    draw.rectangle(
        [margin, body_top, size - margin, body_bottom],
        fill=body_color,
        outline=None
    )
    
    # Golvende onderkant (3 "voeten")
    wave_width = (size - margin * 2) // 3
    for i in range(3):
        x_start = margin + i * wave_width
        x_end = x_start + wave_width
        x_center = x_start + wave_width // 2
        
        # Teken een halve cirkel voor elke golf
        draw.pieslice(
            [x_start, body_bottom - wave_width//2, 
             x_end, body_bottom + wave_width//2],
            start=0,
            end=180,
            fill=body_color,
            outline=outline_color,
            width=2
        )
    
    # Outline voor zijkanten
    draw.line([(margin, body_top), (margin, body_bottom)], 
              fill=outline_color, width=3)
    draw.line([(size - margin, body_top), (size - margin, body_bottom)], 
              fill=outline_color, width=3)
    
    # Ogen - twee witte cirkels met pupillen
    eye_white = hex_to_rgb(COLORS['chaser_eye_white'])
    eye_pupil = hex_to_rgb(COLORS['chaser_eye_pupil'])
    
    eye_size = 14
    eye_y = size // 3 + 4
    
    # Linker oog
    left_eye_x = size // 3
    draw.ellipse(
        [left_eye_x - eye_size//2, eye_y - eye_size//2,
         left_eye_x + eye_size//2, eye_y + eye_size//2],
        fill=eye_white,
        outline=outline_color,
        width=2
    )
    # Pupil
    pupil_size = 6
    draw.ellipse(
        [left_eye_x - pupil_size//2 + 2, eye_y - pupil_size//2,
         left_eye_x + pupil_size//2 + 2, eye_y + pupil_size//2],
        fill=eye_pupil
    )
    
    # Rechter oog
    right_eye_x = size * 2 // 3
    draw.ellipse(
        [right_eye_x - eye_size//2, eye_y - eye_size//2,
         right_eye_x + eye_size//2, eye_y + eye_size//2],
        fill=eye_white,
        outline=outline_color,
        width=2
    )
    # Pupil
    draw.ellipse(
        [right_eye_x - pupil_size//2 + 2, eye_y - pupil_size//2,
         right_eye_x + pupil_size//2 + 2, eye_y + pupil_size//2],
        fill=eye_pupil
    )
    
    return img


def create_pellet_sprite(size=16):
    """
    Creëer Pellet sprite.
    Simpele gele cirkel, klein en helder.
    """
    img = Image.new('RGBA', (size, size), COLORS['background'])
    draw = ImageDraw.Draw(img)
    
    margin = 3
    pellet_color = hex_to_rgb(COLORS['pellet'])
    outline_color = hex_to_rgb(COLORS['outline'])
    
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=pellet_color,
        outline=outline_color,
        width=2
    )
    
    return img


def create_powerup_sprite(size=32):
    """
    Creëer Power-up sprite.
    Grotere pulserende cirkel met glow effect.
    """
    img = Image.new('RGBA', (size, size), COLORS['background'])
    draw = ImageDraw.Draw(img)
    
    # Outer glow (subtiel)
    glow_color = (*hex_to_rgb(COLORS['powerup_glow']), 100)  # Semi-transparant
    margin_glow = 2
    
    # Inner circle
    margin = 6
    powerup_color = hex_to_rgb(COLORS['powerup'])
    outline_color = hex_to_rgb(COLORS['outline'])
    
    # Glow cirkel
    draw.ellipse(
        [margin_glow, margin_glow, size - margin_glow, size - margin_glow],
        fill=glow_color[:3],  # PIL outline doesn't support alpha
        outline=None
    )
    
    # Hoofd cirkel
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=powerup_color,
        outline=outline_color,
        width=2
    )
    
    # Ster highlight
    center = size // 2
    star_size = 4
    highlight_color = (255, 255, 255)
    
    # Kleine ster/glans
    draw.ellipse(
        [center - star_size - 4, center - star_size - 4,
         center - 2, center - 2],
        fill=highlight_color
    )
    
    return img


def create_wall_tile(size=32, theme='default'):
    """
    Creëer Wall tile sprite.
    Vierkant blok met subtiele 3D effect.
    """
    img = Image.new('RGBA', (size, size), COLORS['background'])
    draw = ImageDraw.Draw(img)
    
    wall_color = hex_to_rgb(COLORS['wall'])
    accent_color = hex_to_rgb(COLORS['wall_accent'])
    outline_color = hex_to_rgb(COLORS['outline'])
    
    # Basis blok
    margin = 1
    draw.rectangle(
        [margin, margin, size - margin, size - margin],
        fill=wall_color,
        outline=outline_color,
        width=2
    )
    
    # Subtiele bevel/accent
    bevel = 4
    # Top highlight
    draw.line([(margin + 2, margin + 2), (size - margin - 2, margin + 2)],
              fill=accent_color, width=2)
    # Left highlight
    draw.line([(margin + 2, margin + 2), (margin + 2, size - margin - 2)],
              fill=accent_color, width=2)
    
    return img


def create_sprite_sheet(output_dir, sprite_type, variants=None):
    """Genereer sprites en sla op als PNG bestanden."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    created_files = []
    
    if sprite_type == 'runner' or sprite_type == 'all':
        # Runner in meerdere maten
        for size in [32, 64, 128]:
            sprite = create_runner_sprite(size)
            filename = f'runner_{size}x{size}.png'
            filepath = output_path / filename
            sprite.save(filepath)
            created_files.append(filepath)
            print(f'✓ {filename}')
    
    if sprite_type == 'chaser' or sprite_type == 'all':
        # Chasers in alle varianten
        chaser_variants = variants or ['red', 'pink', 'cyan', 'orange']
        for variant in chaser_variants:
            for size in [32, 64, 128]:
                sprite = create_chaser_sprite(size, variant)
                filename = f'chaser_{variant}_{size}x{size}.png'
                filepath = output_path / filename
                sprite.save(filepath)
                created_files.append(filepath)
                print(f'✓ {filename}')
    
    if sprite_type == 'pellet' or sprite_type == 'all':
        for size in [8, 16, 32]:
            sprite = create_pellet_sprite(size)
            filename = f'pellet_{size}x{size}.png'
            filepath = output_path / filename
            sprite.save(filepath)
            created_files.append(filepath)
            print(f'✓ {filename}')
    
    if sprite_type == 'powerup' or sprite_type == 'all':
        for size in [16, 32, 64]:
            sprite = create_powerup_sprite(size)
            filename = f'powerup_{size}x{size}.png'
            filepath = output_path / filename
            sprite.save(filepath)
            created_files.append(filepath)
            print(f'✓ {filename}')
    
    if sprite_type == 'wall' or sprite_type == 'all':
        for size in [16, 32, 64]:
            sprite = create_wall_tile(size)
            filename = f'wall_{size}x{size}.png'
            filepath = output_path / filename
            sprite.save(filepath)
            created_files.append(filepath)
            print(f'✓ {filename}')
    
    return created_files


def preview_all_sprites():
    """Genereer een preview sheet met alle sprites."""
    # Canvas grootte
    width = 600
    height = 400
    
    img = Image.new('RGBA', (width, height), hex_to_rgb('#1A1A2E'))
    
    # Genereer sprites
    runner = create_runner_sprite(64)
    chasers = [create_chaser_sprite(64, v) for v in ['red', 'pink', 'cyan', 'orange']]
    pellet = create_pellet_sprite(16)
    powerup = create_powerup_sprite(32)
    wall = create_wall_tile(32)
    
    # Plaats op canvas
    y_offset = 20
    
    # Titel tekst (zou font nodig hebben, skip voor nu)
    
    # Runner
    img.paste(runner, (50, y_offset + 50), runner)
    
    # Chasers
    for i, chaser in enumerate(chasers):
        img.paste(chaser, (150 + i * 80, y_offset + 50), chaser)
    
    # Collectibles
    img.paste(pellet, (50, y_offset + 150), pellet)
    img.paste(powerup, (100, y_offset + 142), powerup)
    
    # Wall
    img.paste(wall, (50, y_offset + 220), wall)
    img.paste(wall, (82, y_offset + 220), wall)
    img.paste(wall, (114, y_offset + 220), wall)
    
    return img


def main():
    parser = argparse.ArgumentParser(
        description='🎨 MazeChase Sprite Generator - Kurzgesagt-style flat vector sprites'
    )
    
    parser.add_argument(
        '--type', '-t',
        choices=['runner', 'chaser', 'pellet', 'powerup', 'wall', 'all'],
        default='all',
        help='Type sprite om te genereren'
    )
    
    parser.add_argument(
        '--variant', '-v',
        choices=['red', 'pink', 'cyan', 'orange'],
        help='Kleurvariant voor chaser sprites'
    )
    
    parser.add_argument(
        '--output', '-o',
        default='./sprites',
        help='Output directory voor sprites'
    )
    
    parser.add_argument(
        '--preview', '-p',
        action='store_true',
        help='Genereer alleen een preview afbeelding'
    )
    
    args = parser.parse_args()
    
    print('🎨 MazeChase Sprite Generator')
    print('=' * 40)
    print(f'Stijl: Kurzgesagt flat vector')
    print(f'Output: {args.output}')
    print()
    
    if args.preview:
        print('Genereren preview sheet...')
        preview = preview_all_sprites()
        preview_path = Path(args.output) / 'preview_sheet.png'
        Path(args.output).mkdir(parents=True, exist_ok=True)
        preview.save(preview_path)
        print(f'✓ Preview opgeslagen: {preview_path}')
    else:
        variants = [args.variant] if args.variant else None
        files = create_sprite_sheet(args.output, args.type, variants)
        print()
        print(f'✅ {len(files)} sprites gegenereerd!')


if __name__ == '__main__':
    main()
