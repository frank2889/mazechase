#!/usr/bin/env python3
"""
Generate Kurzgesagt-style sprites for MazeChase using DALL-E
Based on Yuki's expert sprite design recommendations

NOW WITH VISION AI VALIDATION! 🔍
- After DALL-E generates an image, GPT-4 Vision validates it
- Checks for Kurzgesagt style compliance
- Auto-regenerates if score < 7/10
"""

import os
import sys
import json
import base64
import requests
from pathlib import Path
from datetime import datetime
from typing import Tuple, Optional

# Load environment
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OUTPUT_DIR = Path(__file__).parent.parent / 'ui-web' / 'public' / 'sprites'

# Validation settings
ENABLE_VISION_VALIDATION = True
MIN_VALIDATION_SCORE = 7  # Minimum score to accept (1-10)
MAX_REGENERATION_ATTEMPTS = 3

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Kurzgesagt official color palette for validation
KURZGESAGT_COLORS = {
    "runner_yellow": "#FFD93D",
    "chaser_coral": "#FF6B6B", 
    "chaser_cyan": "#4ECDC4",
    "chaser_pink": "#F8A5C2",
    "pellet_gold": "#FFE66D",
    "background_navy": "#1A1A2E",
    "accent_purple": "#667EEA",
}

# Kurzgesagt style base prompt
KURZGESAGT_STYLE = """
Kurzgesagt flat design style, simple geometric shapes, bold solid colors, 
no outlines, smooth gradients, minimalist, vector art look, 
clean shapes, professional game asset, transparent background PNG,
centered composition, 512x512 pixels
"""

# Sprite definitions based on Yuki's recommendations
SPRITES = {
    # Runner Character
    "runner": {
        "prompt": f"""
        A cute heroic character for a maze game, {KURZGESAGT_STYLE}
        - Bright yellow (#FFD700) sphere/circle shape
        - Large friendly expressive eyes (40% of face)
        - Small happy smile
        - Slight orange gradient at bottom for depth
        - Subtle glow effect around edges
        - Cheerful, heroic appearance
        Game character sprite, front view
        """,
        "filename": "runner.png"
    },
    
    # Chaser 1 - Aggressive
    "chaser_1": {
        "prompt": f"""
        A cute enemy chaser character for a maze game, {KURZGESAGT_STYLE}
        - Cyan/turquoise (#00FFFF) triangular blob shape with rounded corners
        - Angry furrowed eyebrows
        - Determined expression
        - Neon glow effect
        - Wavy bottom edge, menacing but cute
        Game enemy sprite, front view
        """,
        "filename": "chaser_cyan.png"
    },
    
    # Chaser 2 - Sneaky
    "chaser_2": {
        "prompt": f"""
        A cute enemy chaser character for a maze game, {KURZGESAGT_STYLE}
        - Magenta/pink (#FF00FF) rounded blob shape
        - Small pointed ears on top
        - Mischievous grin with one raised eyebrow
        - Pulsing glow effect
        - Playful sneaky appearance
        Game enemy sprite, front view
        """,
        "filename": "chaser_magenta.png"
    },
    
    # Chaser 3 - Surprised
    "chaser_3": {
        "prompt": f"""
        A cute enemy chaser character for a maze game, {KURZGESAGT_STYLE}
        - Lime green (#32CD32) rectangular blob with rounded edges
        - Wide surprised eyes (O_O expression)
        - Open mouth showing surprise
        - Subtle gradient to darker green
        - Goofy cute appearance
        Game enemy sprite, front view
        """,
        "filename": "chaser_green.png"
    },
    
    # Power-up: Classic
    "powerup_classic": {
        "prompt": f"""
        A glowing power pellet for a game, {KURZGESAGT_STYLE}
        - White (#FFFFFF) perfect circle
        - Bright white glow/halo effect
        - Sparkle accents
        - Clean minimal design
        Game collectible icon, centered
        """,
        "filename": "powerup_classic.png"
    },
    
    # Power-up: Speed
    "powerup_speed": {
        "prompt": f"""
        A speed boost power-up icon for a game, {KURZGESAGT_STYLE}
        - Golden yellow (#FFD700) lightning bolt or arrow shape
        - Motion lines behind it
        - Dynamic energy effect
        - Speed/velocity feeling
        Game power-up icon, centered
        """,
        "filename": "powerup_speed.png"
    },
    
    # Power-up: Invisible
    "powerup_invisible": {
        "prompt": f"""
        An invisibility power-up icon for a game, {KURZGESAGT_STYLE}
        - Blue (#0066FF) semi-transparent circle
        - Fade/shimmer effect at edges
        - Fading transparency effect
        - Magical disappearing look
        Game power-up icon, centered
        """,
        "filename": "powerup_invisible.png"
    },
    
    # Power-up: Magnet
    "powerup_magnet": {
        "prompt": f"""
        A magnet power-up icon for a game, {KURZGESAGT_STYLE}
        - Purple (#800080) horseshoe magnet shape
        - Magnetic field rings around it
        - Glowing purple aura
        - Attraction energy effect
        Game power-up icon, centered
        """,
        "filename": "powerup_magnet.png"
    },
    
    # Power-up: Freeze
    "powerup_freeze": {
        "prompt": f"""
        A freeze power-up icon for a game, {KURZGESAGT_STYLE}
        - Ice blue (#00CED1) crystal/snowflake shape
        - Frost particles around it
        - Cold icy glow effect
        - Sharp geometric ice crystal
        Game power-up icon, centered
        """,
        "filename": "powerup_freeze.png"
    },
    
    # Power-up: Teleport
    "powerup_teleport": {
        "prompt": f"""
        A teleport power-up icon for a game, {KURZGESAGT_STYLE}
        - Pink/magenta (#FF69B4) swirling portal
        - Spiral vortex effect
        - Space warp distortion
        - Magical portal energy
        Game power-up icon, centered
        """,
        "filename": "powerup_teleport.png"
    },
    
    # Pellet (small collectible)
    "pellet": {
        "prompt": f"""
        A small collectible dot/pellet for a game, {KURZGESAGT_STYLE}
        - Soft white/cream colored small circle
        - Subtle glow
        - Simple and clean
        - Energy orb collectible
        Game collectible, very simple, centered
        """,
        "filename": "pellet.png"
    },
    
    # Wall tile
    "wall_tile": {
        "prompt": f"""
        A futuristic wall tile for a maze game, {KURZGESAGT_STYLE}
        - Dark gray (#333333) base
        - Neon cyan accent lines on edges
        - Sleek metallic look
        - Sci-fi corridor wall segment
        Seamless tile texture, top-down view
        """,
        "filename": "wall_tile.png"
    },
    
    # Floor tile
    "floor_tile": {
        "prompt": f"""
        A futuristic floor tile for a maze game, {KURZGESAGT_STYLE}
        - Dark navy/black (#0a0a0a) base
        - Subtle grid pattern
        - Faint neon line accents
        - Clean minimal design
        Seamless tile texture, top-down view
        """,
        "filename": "floor_tile.png"
    }
}


def validate_with_vision(image_b64: str, sprite_name: str) -> Tuple[int, str, list]:
    """
    Validate a generated sprite using GPT-4 Vision
    Returns: (score 1-10, feedback string, list of issues)
    """
    print(f"  🔍 Validating with Vision AI...")
    
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    validation_prompt = f"""You are Yuki, an expert visual artist specializing in the Kurzgesagt animation style.

Analyze this game sprite "{sprite_name}" for Kurzgesagt style compliance.

KURZGESAGT STYLE REQUIREMENTS:
1. FLAT DESIGN - No 3D effects, shadows should be minimal/geometric
2. BOLD SOLID COLORS - From this palette: {json.dumps(KURZGESAGT_COLORS)}
3. NO OUTLINES - Shapes defined by color contrast, not black lines
4. SIMPLE GEOMETRIC SHAPES - Circles, rounded rectangles, smooth curves
5. MINIMALIST - No unnecessary details or textures
6. VECTOR ART LOOK - Clean edges, not painterly or realistic
7. TRANSPARENT BACKGROUND - Should be usable as game sprite

Score each criterion 1-10, then give an OVERALL score.

Respond in this exact JSON format:
{{
    "flat_design": 8,
    "bold_colors": 7,
    "no_outlines": 9,
    "geometric_shapes": 8,
    "minimalist": 7,
    "vector_look": 8,
    "transparent_bg": 10,
    "overall_score": 8,
    "feedback": "Brief feedback here",
    "issues": ["issue 1", "issue 2"],
    "improvement_suggestions": "How to improve the prompt"
}}"""

    payload = {
        "model": "gpt-4o",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": validation_prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{image_b64}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 500
    }
    
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        
        content = response.json()["choices"][0]["message"]["content"]
        
        # Parse JSON from response (handle markdown code blocks)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        result = json.loads(content.strip())
        
        score = result.get("overall_score", 5)
        feedback = result.get("feedback", "No feedback")
        issues = result.get("issues", [])
        improvement = result.get("improvement_suggestions", "")
        
        print(f"  📊 Validation Score: {score}/10")
        if issues:
            print(f"  ⚠️  Issues: {', '.join(issues[:3])}")
        
        return score, feedback, issues, improvement
        
    except Exception as e:
        print(f"  ⚠️  Vision validation failed: {e}")
        return 5, "Validation failed", [], ""


def generate_sprite(name: str, config: dict) -> bool:
    """Generate a single sprite using DALL-E 3 with Vision AI validation"""
    
    attempt = 0
    current_prompt = config["prompt"].strip()
    
    while attempt < MAX_REGENERATION_ATTEMPTS:
        attempt += 1
        print(f"🎨 Generating {name}... (attempt {attempt}/{MAX_REGENERATION_ATTEMPTS})")
        
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "dall-e-3",
            "prompt": current_prompt,
            "n": 1,
            "size": "1024x1024",
            "quality": "standard",
            "response_format": "b64_json"
        }
        
        try:
            response = requests.post(
                "https://api.openai.com/v1/images/generations",
                headers=headers,
                json=payload,
                timeout=120
            )
            response.raise_for_status()
            
            data = response.json()
            image_data = data["data"][0]["b64_json"]
            
            # === VISION AI VALIDATION ===
            if ENABLE_VISION_VALIDATION:
                score, feedback, issues, improvement = validate_with_vision(image_data, name)
                
                if score >= MIN_VALIDATION_SCORE:
                    print(f"  ✅ Validation PASSED ({score}/10)")
                else:
                    print(f"  ❌ Validation FAILED ({score}/10) - {feedback}")
                    
                    if attempt < MAX_REGENERATION_ATTEMPTS and improvement:
                        # Enhance prompt with improvement suggestions
                        current_prompt = f"{config['prompt'].strip()}\n\nIMPORTANT FIXES: {improvement}\nAVOID: {', '.join(issues[:3]) if issues else 'previous issues'}"
                        print(f"  🔄 Regenerating with improved prompt...")
                        continue
                    elif attempt >= MAX_REGENERATION_ATTEMPTS:
                        print(f"  ⚠️  Max attempts reached, saving anyway with score {score}/10")
            
            # Save the image
            output_path = OUTPUT_DIR / config["filename"]
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(image_data))
            
            # Save validation report
            if ENABLE_VISION_VALIDATION:
                report_path = OUTPUT_DIR / f"{name}_validation.json"
                with open(report_path, "w") as f:
                    json.dump({
                        "sprite": name,
                        "score": score,
                        "feedback": feedback,
                        "issues": issues,
                        "attempts": attempt,
                        "validated_at": datetime.now().isoformat()
                    }, f, indent=2)
            
            print(f"  ✅ Saved: {output_path}")
            return True
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            return False
    
    return False


def main():
    print("=" * 60)
    print("🎮 MazeChase Kurzgesagt Sprite Generator")
    print("   WITH VISION AI VALIDATION 🔍")
    print("=" * 60)
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Sprites to generate: {len(SPRITES)}")
    print(f"Vision validation: {'✅ ENABLED' if ENABLE_VISION_VALIDATION else '❌ DISABLED'}")
    print(f"Min score threshold: {MIN_VALIDATION_SCORE}/10")
    print(f"Max regeneration attempts: {MAX_REGENERATION_ATTEMPTS}")
    print()
    
    if not OPENAI_API_KEY:
        print("❌ Error: OPENAI_API_KEY not found in environment")
        sys.exit(1)
    
    results = {"success": [], "failed": [], "validation_scores": {}}
    
    for name, config in SPRITES.items():
        if generate_sprite(name, config):
            results["success"].append(name)
            # Load validation score if exists
            report_path = OUTPUT_DIR / f"{name}_validation.json"
            if report_path.exists():
                with open(report_path) as f:
                    report = json.load(f)
                    results["validation_scores"][name] = report.get("score", "N/A")
        else:
            results["failed"].append(name)
    
    print()
    print("=" * 60)
    print("📊 RESULTS")
    print("=" * 60)
    print(f"✅ Success: {len(results['success'])}/{len(SPRITES)}")
    print(f"❌ Failed: {len(results['failed'])}/{len(SPRITES)}")
    
    if results["validation_scores"]:
        print("\n🔍 VALIDATION SCORES:")
        for sprite, score in results["validation_scores"].items():
            emoji = "✅" if score >= MIN_VALIDATION_SCORE else "⚠️"
            print(f"   {emoji} {sprite}: {score}/10")
        avg_score = sum(s for s in results["validation_scores"].values() if isinstance(s, (int, float))) / len(results["validation_scores"])
        print(f"\n   📈 Average: {avg_score:.1f}/10")
    
    if results["failed"]:
        print(f"\nFailed sprites: {', '.join(results['failed'])}")
    
    # Save manifest
    manifest = {
        "generated": datetime.now().isoformat(),
        "sprites": {name: str(OUTPUT_DIR / config["filename"]) for name, config in SPRITES.items()},
        "results": results
    }
    
    manifest_path = OUTPUT_DIR / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\n📄 Manifest saved: {manifest_path}")
    
    return len(results["failed"]) == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
