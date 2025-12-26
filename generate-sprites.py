#!/usr/bin/env python3
"""
MazeChase Sprite Generator
Generates cyberpunk-themed sprites for the game.
"""

from PIL import Image, ImageDraw
import os

# MazeChase color palette
COLORS = {
    'runner': '#22D3EE',        # Cyan
    'chaser1': '#EC4899',       # Magenta
    'chaser2': '#8B5CF6',       # Purple
    'chaser3': '#F97316',       # Orange
    'wall_primary': '#1A1A2E',  # Dark purple surface
    'wall_border': '#8B5CF6',   # Purple border
    'pellet': '#22D3EE',        # Cyan
    'powerup': '#EC4899',       # Magenta
    'background': '#0F0F1A',    # Very dark
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_runner_sprite_sheet():
    """Create a 50x50 sprite sheet for the runner (4 directions x 3 frames + 1 default)."""
    # 13 frames total: default + 3 frames for each direction (right, up, down, left)
    # Layout: 3 per direction = 12 + 1 default in first position
    sprite_size = 50
    total_frames = 13
    sheet = Image.new('RGBA', (sprite_size * total_frames, sprite_size), (0, 0, 0, 0))
    
    runner_color = hex_to_rgb(COLORS['runner'])
    glow_color = (*runner_color, 100)
    
    for i in range(total_frames):
        frame = Image.new('RGBA', (sprite_size, sprite_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        
        # Calculate animation state
        if i == 0:
            # Default/closed mouth
            mouth_angle = 0
        else:
            # Cycling through open mouth animations
            frame_in_cycle = (i - 1) % 3
            mouth_angle = [15, 30, 15][frame_in_cycle]
        
        # Determine direction for mouth position
        direction = 0 if i == 0 else ((i - 1) // 3)  # 0=right, 1=up, 2=down, 3=left
        
        center = sprite_size // 2
        radius = 20
        
        # Draw glow effect
        for r in range(radius + 8, radius, -2):
            alpha = int(50 * (1 - (r - radius) / 8))
            glow = (*runner_color, alpha)
            draw.ellipse([center-r, center-r, center+r, center+r], fill=glow)
        
        # Draw main body
        draw.ellipse([center-radius, center-radius, center+radius, center+radius], 
                     fill=(*runner_color, 255))
        
        # Draw mouth (wedge cutout) - triangular for "eating" animation
        if mouth_angle > 0:
            # Calculate mouth points based on direction
            if direction == 0:  # Right
                points = [
                    (center, center),
                    (center + radius + 5, center - int(radius * 0.6)),
                    (center + radius + 5, center + int(radius * 0.6))
                ]
            elif direction == 1:  # Up
                points = [
                    (center, center),
                    (center - int(radius * 0.6), center - radius - 5),
                    (center + int(radius * 0.6), center - radius - 5)
                ]
            elif direction == 2:  # Down
                points = [
                    (center, center),
                    (center - int(radius * 0.6), center + radius + 5),
                    (center + int(radius * 0.6), center + radius + 5)
                ]
            else:  # Left
                points = [
                    (center, center),
                    (center - radius - 5, center - int(radius * 0.6)),
                    (center - radius - 5, center + int(radius * 0.6))
                ]
            
            # Size mouth based on animation frame
            scale = mouth_angle / 30
            scaled_points = []
            for px, py in points:
                dx = (px - center) * scale
                dy = (py - center) * scale
                scaled_points.append((center + dx, center + dy))
            
            draw.polygon(scaled_points, fill=(0, 0, 0, 0))
        
        # Add eye
        eye_offset_x = 5 if direction in [0, 1, 2] else -5
        eye_offset_y = -5
        draw.ellipse([center + eye_offset_x - 3, center + eye_offset_y - 3,
                      center + eye_offset_x + 3, center + eye_offset_y + 3],
                     fill=(255, 255, 255, 255))
        draw.ellipse([center + eye_offset_x - 1, center + eye_offset_y - 1,
                      center + eye_offset_x + 1, center + eye_offset_y + 1],
                     fill=(0, 0, 0, 255))
        
        sheet.paste(frame, (i * sprite_size, 0))
    
    return sheet

def create_chaser_sprite_sheet():
    """Create sprite sheet for chasers (3 colors x 4 directions)."""
    sprite_size = 50
    chaser_colors = [
        hex_to_rgb(COLORS['chaser1']),  # Magenta
        hex_to_rgb(COLORS['chaser2']),  # Purple
        hex_to_rgb(COLORS['chaser3']),  # Orange
    ]
    
    # 4 directions per color, 3 colors = 12 frames
    # Order: right, up, down, left for each color
    sheet = Image.new('RGBA', (sprite_size * 12, sprite_size), (0, 0, 0, 0))
    
    frame_idx = 0
    for color in chaser_colors:
        for direction in range(4):  # right, up, down, left
            frame = Image.new('RGBA', (sprite_size, sprite_size), (0, 0, 0, 0))
            draw = ImageDraw.Draw(frame)
            
            center = sprite_size // 2
            radius = 18
            
            # Draw glow
            for r in range(radius + 6, radius, -2):
                alpha = int(40 * (1 - (r - radius) / 6))
                draw.ellipse([center-r, center-r-3, center+r, center+r-3], 
                            fill=(*color, alpha))
            
            # Draw ghost body (rounded top, wavy bottom)
            # Top half - semicircle
            draw.ellipse([center-radius, center-radius-3, center+radius, center+radius-3], 
                        fill=(*color, 255))
            
            # Bottom rectangle
            draw.rectangle([center-radius, center-3, center+radius, center+radius+5], 
                          fill=(*color, 255))
            
            # Wavy bottom
            wave_y = center + radius + 2
            for i in range(4):
                wave_x = center - radius + 5 + i * 10
                draw.ellipse([wave_x-5, wave_y, wave_x+5, wave_y+8], 
                            fill=(0, 0, 0, 0))
            
            # Eyes - look in direction of movement
            eye_offset = 4
            left_eye_x = center - 7
            right_eye_x = center + 7
            eye_y = center - 5
            
            # White part of eyes
            draw.ellipse([left_eye_x-5, eye_y-5, left_eye_x+5, eye_y+5], 
                        fill=(255, 255, 255, 255))
            draw.ellipse([right_eye_x-5, eye_y-5, right_eye_x+5, eye_y+5], 
                        fill=(255, 255, 255, 255))
            
            # Pupils - position based on direction
            pupil_offset_x = 0
            pupil_offset_y = 0
            if direction == 0:  # right
                pupil_offset_x = 2
            elif direction == 1:  # up
                pupil_offset_y = -2
            elif direction == 2:  # down
                pupil_offset_y = 2
            else:  # left
                pupil_offset_x = -2
            
            draw.ellipse([left_eye_x + pupil_offset_x - 2, eye_y + pupil_offset_y - 2,
                         left_eye_x + pupil_offset_x + 2, eye_y + pupil_offset_y + 2],
                        fill=(0, 0, 0, 255))
            draw.ellipse([right_eye_x + pupil_offset_x - 2, eye_y + pupil_offset_y - 2,
                         right_eye_x + pupil_offset_x + 2, eye_y + pupil_offset_y + 2],
                        fill=(0, 0, 0, 255))
            
            sheet.paste(frame, (frame_idx * sprite_size, 0))
            frame_idx += 1
    
    return sheet

def create_tile_image(name, color_key, size=50):
    """Create a single tile image."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    if name == 'wall':
        # Create a cyberpunk wall tile
        bg_color = hex_to_rgb(COLORS['wall_primary'])
        border_color = hex_to_rgb(COLORS['wall_border'])
        
        # Fill background
        draw.rectangle([0, 0, size, size], fill=(*bg_color, 255))
        
        # Add glowing border
        draw.rectangle([0, 0, size-1, size-1], outline=(*border_color, 200), width=2)
        
        # Add inner glow lines
        draw.line([3, 3, size-4, 3], fill=(*border_color, 100), width=1)
        draw.line([3, 3, 3, size-4], fill=(*border_color, 100), width=1)
        
    elif name == 'pellet':
        # Small glowing dot
        pellet_color = hex_to_rgb(COLORS['pellet'])
        center = size // 2
        
        # Glow
        for r in range(8, 3, -1):
            alpha = int(60 * (1 - (r - 3) / 5))
            draw.ellipse([center-r, center-r, center+r, center+r], 
                        fill=(*pellet_color, alpha))
        
        # Core
        draw.ellipse([center-4, center-4, center+4, center+4], 
                    fill=(*pellet_color, 255))
        
    elif name == 'powerup':
        # Large glowing power pellet
        powerup_color = hex_to_rgb(COLORS['powerup'])
        center = size // 2
        
        # Outer glow
        for r in range(18, 10, -2):
            alpha = int(80 * (1 - (r - 10) / 8))
            draw.ellipse([center-r, center-r, center+r, center+r], 
                        fill=(*powerup_color, alpha))
        
        # Core with pulsing effect (static for now)
        draw.ellipse([center-10, center-10, center+10, center+10], 
                    fill=(*powerup_color, 255))
        
        # Inner highlight
        draw.ellipse([center-6, center-8, center+2, center-2], 
                    fill=(255, 255, 255, 100))
    
    return img

def create_wall_tile():
    """Create the wall tile (secondTile.png and forthTile.png)."""
    size = 50
    
    # Primary wall tile (purple theme)
    img1 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw1 = ImageDraw.Draw(img1)
    
    bg = hex_to_rgb('#1A1A2E')
    border = hex_to_rgb('#8B5CF6')
    
    draw1.rectangle([0, 0, size, size], fill=(*bg, 255))
    draw1.rectangle([1, 1, size-2, size-2], outline=(*border, 180), width=2)
    
    # Add subtle grid pattern
    for i in range(0, size, 10):
        draw1.line([i, 0, i, size], fill=(*border, 30), width=1)
        draw1.line([0, i, size, i], fill=(*border, 30), width=1)
    
    # Secondary wall tile (cyan accent)
    img2 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw2 = ImageDraw.Draw(img2)
    
    border2 = hex_to_rgb('#22D3EE')
    
    draw2.rectangle([0, 0, size, size], fill=(*bg, 255))
    draw2.rectangle([1, 1, size-2, size-2], outline=(*border2, 180), width=2)
    
    # Add diagonal pattern for variety
    for i in range(-size, size*2, 8):
        draw2.line([i, 0, i+size, size], fill=(*border2, 20), width=1)
    
    return img1, img2

def main():
    output_dir = '/Users/Frank/pacman/ui-web/public/gassets'
    
    print("Generating MazeChase sprites...")
    
    # Generate runner sprite sheet
    runner_sheet = create_runner_sprite_sheet()
    runner_sheet.save(os.path.join(output_dir, 'pacmanSpriteSheet.png'))
    print("✓ Created runner sprite sheet (pacmanSpriteSheet.png)")
    
    # Generate chaser sprite sheet
    chaser_sheet = create_chaser_sprite_sheet()
    chaser_sheet.save(os.path.join(output_dir, 'ghosts.png'))
    print("✓ Created chaser sprite sheet (ghosts.png)")
    
    # Generate pellet
    pellet = create_tile_image('pellet', 'pellet')
    pellet.save(os.path.join(output_dir, 'centrepoint.png'))
    print("✓ Created pellet (centrepoint.png)")
    
    # Generate power-up
    powerup = create_tile_image('powerup', 'powerup')
    powerup.save(os.path.join(output_dir, 'powercent.png'))
    print("✓ Created power-up (powercent.png)")
    
    # Generate wall tiles
    wall1, wall2 = create_wall_tile()
    wall1.save(os.path.join(output_dir, 'secondTile.png'))
    wall2.save(os.path.join(output_dir, 'forthTile.png'))
    print("✓ Created wall tiles (secondTile.png, forthTile.png)")
    
    print("\n✅ All MazeChase sprites generated successfully!")
    print("The game now uses a cyberpunk purple/cyan/magenta color scheme.")

if __name__ == '__main__':
    main()
