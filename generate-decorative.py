#!/usr/bin/env python3
"""
Generate decorative MazeChase character images for the UI.
"""

from PIL import Image, ImageDraw
import os

# MazeChase color palette
COLORS = {
    'runner': '#22D3EE',        # Cyan
    'chaser1': '#EC4899',       # Magenta (was red)
    'chaser2': '#8B5CF6',       # Purple (was blue)
    'chaser3': '#F97316',       # Orange
    'chaser4': '#84CC16',       # Lime (was pink)
}

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_runner_image(size=175):
    """Create a decorative runner character."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    color = hex_to_rgb(COLORS['runner'])
    center = size // 2
    radius = size // 2 - 15
    
    # Outer glow
    for r in range(radius + 20, radius, -3):
        alpha = int(60 * (1 - (r - radius) / 20))
        draw.ellipse([center-r, center-r, center+r, center+r], 
                    fill=(*color, alpha))
    
    # Main body
    draw.ellipse([center-radius, center-radius, center+radius, center+radius], 
                 fill=(*color, 255))
    
    # Mouth cutout (facing right)
    mouth_points = [
        (center, center),
        (center + radius + 10, center - int(radius * 0.5)),
        (center + radius + 10, center + int(radius * 0.5))
    ]
    draw.polygon(mouth_points, fill=(0, 0, 0, 0))
    
    # Eye
    eye_x = center + 10
    eye_y = center - 25
    draw.ellipse([eye_x-8, eye_y-8, eye_x+8, eye_y+8], fill=(255, 255, 255, 255))
    draw.ellipse([eye_x-3, eye_y-3, eye_x+3, eye_y+3], fill=(0, 0, 0, 255))
    
    return img

def create_chaser_image(color_key, size=150):
    """Create a decorative chaser character."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    color = hex_to_rgb(COLORS[color_key])
    center = size // 2
    radius = size // 2 - 15
    
    # Outer glow
    for r in range(radius + 15, radius, -3):
        alpha = int(50 * (1 - (r - radius) / 15))
        draw.ellipse([center-r, center-r-10, center+r, center+r-10], 
                    fill=(*color, alpha))
    
    # Ghost body - top semicircle
    draw.ellipse([center-radius, center-radius-10, center+radius, center+radius-10], 
                 fill=(*color, 255))
    
    # Ghost body - bottom rectangle
    draw.rectangle([center-radius, center-10, center+radius, center+radius+10], 
                  fill=(*color, 255))
    
    # Wavy bottom
    wave_y = center + radius + 5
    wave_width = radius * 2 // 4
    for i in range(4):
        wave_x = center - radius + wave_width//2 + i * wave_width
        draw.ellipse([wave_x-wave_width//2, wave_y-5, wave_x+wave_width//2, wave_y+10], 
                    fill=(0, 0, 0, 0))
    
    # Eyes
    left_eye_x = center - 20
    right_eye_x = center + 20
    eye_y = center - 15
    
    # White part
    draw.ellipse([left_eye_x-12, eye_y-12, left_eye_x+12, eye_y+12], 
                fill=(255, 255, 255, 255))
    draw.ellipse([right_eye_x-12, eye_y-12, right_eye_x+12, eye_y+12], 
                fill=(255, 255, 255, 255))
    
    # Pupils (looking right)
    draw.ellipse([left_eye_x+2, eye_y-5, left_eye_x+10, eye_y+5], 
                fill=(0, 0, 0, 255))
    draw.ellipse([right_eye_x+2, eye_y-5, right_eye_x+10, eye_y+5], 
                fill=(0, 0, 0, 255))
    
    return img

def main():
    output_dir = '/Users/Frank/pacman/ui-web/src/assets'
    
    print("Generating MazeChase decorative images...")
    
    # Generate runner
    runner = create_runner_image(175)
    runner.save(os.path.join(output_dir, 'runner.png'))
    # Also save as pacman.png for backward compatibility
    runner.save(os.path.join(output_dir, 'pacman.png'))
    print("✓ Created runner.png")
    
    # Generate chasers with new color scheme
    # Map old names to new colors for compatibility
    color_mapping = {
        'ghost-red.png': 'chaser1',      # Magenta
        'ghost-blue.png': 'chaser2',     # Purple
        'ghost-orange.png': 'chaser3',   # Orange
        'ghost-pink.png': 'chaser4',     # Lime
    }
    
    # Also create with new names
    new_names = {
        'chaser-magenta.png': 'chaser1',
        'chaser-purple.png': 'chaser2',
        'chaser-orange.png': 'chaser3',
        'chaser-lime.png': 'chaser4',
    }
    
    for filename, color_key in color_mapping.items():
        chaser = create_chaser_image(color_key, 150)
        chaser.save(os.path.join(output_dir, filename))
        print(f"✓ Created {filename}")
    
    for filename, color_key in new_names.items():
        chaser = create_chaser_image(color_key, 150)
        chaser.save(os.path.join(output_dir, filename))
        print(f"✓ Created {filename}")
    
    print("\n✅ All decorative images generated!")

if __name__ == '__main__':
    main()
