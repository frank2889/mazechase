#!/usr/bin/env python3
"""
AI Asset Tools v1.0 - Python tools voor MazeChase AI Testers

Dit bestand bevat tools die de AI testers kunnen gebruiken:
- Yuki: Sprite generatie en image processing
- Kenji: Audio processing en normalisatie
- Elena: Performance benchmarking en metrics
- Alex: Screenshot comparison en visual diffing

Vereisten:
    pip install pillow numpy requests librosa soundfile
"""

import os
import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

ASSETS_DIR = Path(__file__).parent.parent / "ui-web" / "public" / "generated-assets"
SPRITES_DIR = ASSETS_DIR / "sprites"
AUDIO_DIR = ASSETS_DIR / "audio"
SCREENSHOTS_DIR = ASSETS_DIR / "screenshots"
REPORTS_DIR = ASSETS_DIR / "reports"

# Ensure directories exist
for dir_path in [SPRITES_DIR, AUDIO_DIR, SCREENSHOTS_DIR, REPORTS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# ═══════════════════════════════════════════════════════════════════════════════
# YUKI'S TOOLS - Visual Artist & Sprite Designer
# ═══════════════════════════════════════════════════════════════════════════════

def create_color_palette(colors: list, name: str = "palette") -> str:
    """
    Maak een kleurenpalet PNG voor Yuki's design work.
    
    Args:
        colors: Lijst van HEX kleuren (bijv. ["#FF6B6B", "#4ECDC4", "#45B7D1"])
        name: Naam van het palet
    
    Returns:
        Pad naar het gegenereerde PNG bestand
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return "Error: pip install pillow required"
    
    width = 100 * len(colors)
    height = 150
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    
    for i, color in enumerate(colors):
        x = i * 100
        # Draw color swatch
        draw.rectangle([x, 0, x + 100, 100], fill=color)
        # Draw hex code
        draw.text((x + 10, 110), color, fill='black')
    
    output_path = SPRITES_DIR / f"{name}_palette.png"
    img.save(output_path)
    return str(output_path)


def generate_sprite_sheet_template(
    sprite_size: int = 64,
    cols: int = 8,
    rows: int = 4,
    name: str = "sprite_sheet"
) -> str:
    """
    Maak een lege sprite sheet template met grid.
    
    Args:
        sprite_size: Grootte van elke sprite in pixels
        cols: Aantal kolommen
        rows: Aantal rijen
        name: Naam van de template
    
    Returns:
        Pad naar het gegenereerde PNG bestand
    """
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return "Error: pip install pillow required"
    
    width = sprite_size * cols
    height = sprite_size * rows
    
    # Create transparent image
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw grid
    for i in range(cols + 1):
        x = i * sprite_size
        draw.line([(x, 0), (x, height)], fill=(100, 100, 100, 128), width=1)
    
    for i in range(rows + 1):
        y = i * sprite_size
        draw.line([(0, y), (width, y)], fill=(100, 100, 100, 128), width=1)
    
    output_path = SPRITES_DIR / f"{name}_template.png"
    img.save(output_path)
    return str(output_path)


def analyze_image_colors(image_path: str) -> dict:
    """
    Analyseer de kleuren in een afbeelding (voor Yuki's kleuranalyse).
    
    Returns:
        Dict met dominante kleuren en statistieken
    """
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        return {"error": "pip install pillow numpy required"}
    
    img = Image.open(image_path).convert('RGB')
    pixels = np.array(img).reshape(-1, 3)
    
    # Get unique colors and counts
    unique, counts = np.unique(pixels, axis=0, return_counts=True)
    sorted_idx = np.argsort(-counts)
    
    # Top 10 colors
    top_colors = []
    for i in range(min(10, len(sorted_idx))):
        idx = sorted_idx[i]
        r, g, b = unique[idx]
        hex_color = f"#{r:02x}{g:02x}{b:02x}"
        percentage = (counts[idx] / len(pixels)) * 100
        top_colors.append({
            "hex": hex_color,
            "rgb": [int(r), int(g), int(b)],
            "percentage": round(percentage, 2)
        })
    
    return {
        "total_pixels": len(pixels),
        "unique_colors": len(unique),
        "top_colors": top_colors
    }


# ═══════════════════════════════════════════════════════════════════════════════
# KENJI'S TOOLS - Sound Designer & Audio Engineer
# ═══════════════════════════════════════════════════════════════════════════════

def normalize_audio(input_path: str, output_path: str = None, target_db: float = -3.0) -> str:
    """
    Normaliseer audio naar een target dB niveau.
    
    Args:
        input_path: Pad naar input audio bestand
        output_path: Pad naar output (optioneel, default: _normalized suffix)
        target_db: Target loudness in dB (default: -3.0)
    
    Returns:
        Pad naar genormaliseerd bestand
    """
    try:
        import numpy as np
        import soundfile as sf
    except ImportError:
        return "Error: pip install soundfile numpy required"
    
    # Read audio
    data, samplerate = sf.read(input_path)
    
    # Calculate current peak
    peak = np.max(np.abs(data))
    if peak == 0:
        return "Error: Audio is silent"
    
    # Calculate gain
    target_linear = 10 ** (target_db / 20)
    gain = target_linear / peak
    
    # Apply gain
    normalized = data * gain
    
    # Output path
    if output_path is None:
        p = Path(input_path)
        output_path = str(p.parent / f"{p.stem}_normalized{p.suffix}")
    
    sf.write(output_path, normalized, samplerate)
    return output_path


def convert_audio_format(input_path: str, output_format: str = "ogg") -> str:
    """
    Converteer audio naar een ander formaat (ogg, wav, mp3).
    
    Args:
        input_path: Pad naar input bestand
        output_format: Gewenst output formaat (ogg, wav, mp3)
    
    Returns:
        Pad naar geconverteerd bestand
    """
    try:
        import soundfile as sf
    except ImportError:
        return "Error: pip install soundfile required"
    
    data, samplerate = sf.read(input_path)
    
    p = Path(input_path)
    output_path = str(AUDIO_DIR / f"{p.stem}.{output_format}")
    
    sf.write(output_path, data, samplerate)
    return output_path


def analyze_audio(audio_path: str) -> dict:
    """
    Analyseer audio eigenschappen (voor Kenji's audio review).
    
    Returns:
        Dict met audio statistieken
    """
    try:
        import numpy as np
        import soundfile as sf
    except ImportError:
        return {"error": "pip install soundfile numpy required"}
    
    data, samplerate = sf.read(audio_path)
    
    # Mono conversion for analysis
    if len(data.shape) > 1:
        mono = np.mean(data, axis=1)
    else:
        mono = data
    
    duration = len(mono) / samplerate
    peak = np.max(np.abs(mono))
    rms = np.sqrt(np.mean(mono ** 2))
    
    # Peak dB
    peak_db = 20 * np.log10(peak) if peak > 0 else -100
    rms_db = 20 * np.log10(rms) if rms > 0 else -100
    
    return {
        "filename": Path(audio_path).name,
        "duration_seconds": round(duration, 3),
        "sample_rate": samplerate,
        "channels": 1 if len(data.shape) == 1 else data.shape[1],
        "peak_db": round(peak_db, 2),
        "rms_db": round(rms_db, 2),
        "file_size_kb": round(os.path.getsize(audio_path) / 1024, 2)
    }


def create_audio_report(audio_dir: str = None) -> str:
    """
    Maak een rapport van alle audio bestanden.
    
    Returns:
        Pad naar het JSON rapport
    """
    if audio_dir is None:
        audio_dir = AUDIO_DIR
    
    audio_files = list(Path(audio_dir).glob("*.wav")) + \
                  list(Path(audio_dir).glob("*.ogg")) + \
                  list(Path(audio_dir).glob("*.mp3"))
    
    report = {
        "generated_at": datetime.now().isoformat(),
        "total_files": len(audio_files),
        "files": []
    }
    
    for audio_file in audio_files:
        try:
            analysis = analyze_audio(str(audio_file))
            report["files"].append(analysis)
        except Exception as e:
            report["files"].append({
                "filename": audio_file.name,
                "error": str(e)
            })
    
    output_path = REPORTS_DIR / "audio_report.json"
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return str(output_path)


# ═══════════════════════════════════════════════════════════════════════════════
# ELENA'S TOOLS - Performance Engineer
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_asset_sizes(assets_dir: str = None) -> dict:
    """
    Analyseer asset bestandsgroottes voor performance optimalisatie.
    
    Returns:
        Dict met size statistieken per categorie
    """
    if assets_dir is None:
        assets_dir = Path(__file__).parent.parent / "ui-web" / "public"
    
    assets_dir = Path(assets_dir)
    
    categories = {
        "images": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
        "audio": [".mp3", ".ogg", ".wav", ".m4a"],
        "fonts": [".woff", ".woff2", ".ttf", ".otf"],
        "scripts": [".js", ".mjs"],
        "styles": [".css"],
        "data": [".json"]
    }
    
    results = {}
    total_size = 0
    
    for category, extensions in categories.items():
        files = []
        cat_size = 0
        
        for ext in extensions:
            for file_path in assets_dir.rglob(f"*{ext}"):
                size = file_path.stat().st_size
                files.append({
                    "path": str(file_path.relative_to(assets_dir)),
                    "size_kb": round(size / 1024, 2)
                })
                cat_size += size
        
        # Sort by size descending
        files.sort(key=lambda x: x["size_kb"], reverse=True)
        
        results[category] = {
            "count": len(files),
            "total_kb": round(cat_size / 1024, 2),
            "files": files[:10]  # Top 10 largest
        }
        total_size += cat_size
    
    results["summary"] = {
        "total_size_kb": round(total_size / 1024, 2),
        "total_size_mb": round(total_size / (1024 * 1024), 2)
    }
    
    return results


def generate_performance_report() -> str:
    """
    Genereer een compleet performance rapport.
    
    Returns:
        Pad naar het JSON rapport
    """
    report = {
        "generated_at": datetime.now().isoformat(),
        "asset_analysis": analyze_asset_sizes(),
        "recommendations": []
    }
    
    # Generate recommendations
    assets = report["asset_analysis"]
    
    if assets.get("images", {}).get("total_kb", 0) > 2000:
        report["recommendations"].append({
            "priority": "high",
            "category": "images",
            "issue": "Total image size exceeds 2MB",
            "suggestion": "Consider using WebP format or further compression"
        })
    
    if assets.get("audio", {}).get("total_kb", 0) > 5000:
        report["recommendations"].append({
            "priority": "medium",
            "category": "audio",
            "issue": "Total audio size exceeds 5MB",
            "suggestion": "Use OGG format and reduce bitrate for web"
        })
    
    output_path = REPORTS_DIR / "performance_report.json"
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return str(output_path)


# ═══════════════════════════════════════════════════════════════════════════════
# ALEX'S TOOLS - Technical QA Engineer
# ═══════════════════════════════════════════════════════════════════════════════

def compare_screenshots(image1_path: str, image2_path: str, threshold: float = 0.05) -> dict:
    """
    Vergelijk twee screenshots en detecteer visuele verschillen.
    
    Args:
        image1_path: Pad naar eerste screenshot
        image2_path: Pad naar tweede screenshot
        threshold: Verschil threshold (0.0 - 1.0)
    
    Returns:
        Dict met vergelijkingsresultaten
    """
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        return {"error": "pip install pillow numpy required"}
    
    img1 = np.array(Image.open(image1_path).convert('RGB'))
    img2 = np.array(Image.open(image2_path).convert('RGB'))
    
    if img1.shape != img2.shape:
        return {
            "match": False,
            "error": "Images have different dimensions",
            "size1": img1.shape[:2],
            "size2": img2.shape[:2]
        }
    
    # Calculate difference
    diff = np.abs(img1.astype(float) - img2.astype(float))
    diff_percentage = np.mean(diff) / 255.0
    
    # Find regions with differences
    diff_mask = np.mean(diff, axis=2) > (threshold * 255)
    diff_pixels = np.sum(diff_mask)
    total_pixels = diff_mask.size
    
    result = {
        "match": diff_percentage < threshold,
        "difference_percentage": round(diff_percentage * 100, 4),
        "pixels_different": int(diff_pixels),
        "total_pixels": int(total_pixels),
        "threshold": threshold
    }
    
    # Generate diff image if there are differences
    if not result["match"]:
        diff_img = Image.new('RGB', (img1.shape[1], img1.shape[0]))
        diff_array = np.zeros_like(img1)
        diff_array[diff_mask] = [255, 0, 0]  # Red for differences
        diff_array[~diff_mask] = img1[~diff_mask] // 2  # Dim original
        diff_img = Image.fromarray(diff_array.astype(np.uint8))
        
        diff_path = SCREENSHOTS_DIR / f"diff_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        diff_img.save(diff_path)
        result["diff_image"] = str(diff_path)
    
    return result


def generate_test_report(test_results: list) -> str:
    """
    Genereer een QA test rapport.
    
    Args:
        test_results: Lijst van test resultaten
    
    Returns:
        Pad naar het JSON rapport
    """
    report = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total_tests": len(test_results),
            "passed": sum(1 for t in test_results if t.get("passed", False)),
            "failed": sum(1 for t in test_results if not t.get("passed", True)),
        },
        "tests": test_results
    }
    
    report["summary"]["pass_rate"] = round(
        report["summary"]["passed"] / max(report["summary"]["total_tests"], 1) * 100, 2
    )
    
    output_path = REPORTS_DIR / f"qa_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return str(output_path)


# ═══════════════════════════════════════════════════════════════════════════════
# AVA'S TOOLS - Market Analyst
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_steam_similar_games(tags: list = None) -> dict:
    """
    Zoek vergelijkbare games op Steam (simplified - zou SteamSpy API gebruiken).
    
    Args:
        tags: Lijst van Steam tags om te zoeken
    
    Returns:
        Dict met market data
    """
    # Note: In productie zou dit de SteamSpy API gebruiken
    # Voor nu retourneren we template data
    
    if tags is None:
        tags = ["arcade", "multiplayer", "casual", "indie"]
    
    return {
        "search_tags": tags,
        "note": "SteamSpy API integration needed for real data",
        "comparable_games": [
            {"name": "Fall Guys", "price": 19.99, "players": "high"},
            {"name": "Among Us", "price": 4.99, "players": "very_high"},
            {"name": "Vampire Survivors", "price": 4.99, "players": "high"},
            {"name": "Geometry Dash", "price": 3.99, "players": "high"}
        ],
        "market_insight": "Casual multiplayer games perform well at €4.99-€9.99 price point"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Command line interface voor AI Asset Tools."""
    if len(sys.argv) < 2:
        print("""
AI Asset Tools v1.0 - MazeChase Development Tools

Usage:
    python ai_asset_tools.py <command> [options]

Commands:
    palette <color1> <color2> ...   Create color palette PNG
    sprite-template [size] [cols] [rows]  Create sprite sheet template
    analyze-image <path>            Analyze image colors
    normalize-audio <path>          Normalize audio file
    analyze-audio <path>            Analyze audio properties
    audio-report                    Generate audio files report
    asset-sizes                     Analyze asset file sizes
    performance-report              Generate performance report
    compare-screenshots <img1> <img2>  Compare two screenshots

Examples:
    python ai_asset_tools.py palette "#FF6B6B" "#4ECDC4" "#45B7D1"
    python ai_asset_tools.py sprite-template 64 8 4
    python ai_asset_tools.py performance-report
        """)
        return
    
    command = sys.argv[1]
    
    if command == "palette" and len(sys.argv) > 2:
        colors = sys.argv[2:]
        result = create_color_palette(colors)
        print(f"Created: {result}")
    
    elif command == "sprite-template":
        size = int(sys.argv[2]) if len(sys.argv) > 2 else 64
        cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
        rows = int(sys.argv[4]) if len(sys.argv) > 4 else 4
        result = generate_sprite_sheet_template(size, cols, rows)
        print(f"Created: {result}")
    
    elif command == "analyze-image" and len(sys.argv) > 2:
        result = analyze_image_colors(sys.argv[2])
        print(json.dumps(result, indent=2))
    
    elif command == "normalize-audio" and len(sys.argv) > 2:
        result = normalize_audio(sys.argv[2])
        print(f"Normalized: {result}")
    
    elif command == "analyze-audio" and len(sys.argv) > 2:
        result = analyze_audio(sys.argv[2])
        print(json.dumps(result, indent=2))
    
    elif command == "audio-report":
        result = create_audio_report()
        print(f"Report saved: {result}")
    
    elif command == "asset-sizes":
        result = analyze_asset_sizes()
        print(json.dumps(result, indent=2))
    
    elif command == "performance-report":
        result = generate_performance_report()
        print(f"Report saved: {result}")
    
    elif command == "compare-screenshots" and len(sys.argv) > 3:
        result = compare_screenshots(sys.argv[2], sys.argv[3])
        print(json.dumps(result, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        print("Run without arguments for help.")


if __name__ == "__main__":
    main()
