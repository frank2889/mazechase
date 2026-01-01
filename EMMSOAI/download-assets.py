#!/usr/bin/env python3
"""
EMMSOAI Asset Downloader
========================
Downloads free CC0 assets from OpenGameArt, Quaternius, Kenney, etc.

USAGE:
    python download-assets.py ball          # Download ball/character assets
    python download-assets.py particles     # Download particle effects
    python download-assets.py audio         # Download sound effects
    python download-assets.py all           # Download all curated assets

All assets are CC0 (Public Domain) - no attribution required.
"""

import os
import sys
import urllib.request
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
MODELS_DIR = PROJECT_ROOT / "ui-web" / "public" / "models"
SPRITES_DIR = PROJECT_ROOT / "ui-web" / "public" / "sprites"
AUDIO_DIR = PROJECT_ROOT / "ui-web" / "public" / "audio"
DOWNLOADS_DIR = MODELS_DIR / "downloads"

# ═══════════════════════════════════════════════════════════════════════════════
# CURATED FREE ASSETS (CC0)
# ═══════════════════════════════════════════════════════════════════════════════

ASSETS = {
    "ball": {
        "name": "Ultimate Animated Balls Pack",
        "author": "Quaternius",
        "license": "CC0",
        "url": "https://quaternius.com/packs/ultimateballs.html",
        "direct_url": None,  # Manual download required (Gumroad)
        "type": "glb",
        "target": MODELS_DIR / "characters",
        "description": "Animated bouncing ball characters - perfect for Runner!"
    },
    "particles": {
        "name": "OpenGameArt Particle Effects",
        "author": "Various (CC0)",
        "license": "CC0",
        "url": "https://opengameart.org/content/particle-pack-80-sprites",
        "direct_url": None,  # Manual download - visit page
        "type": "png",
        "target": SPRITES_DIR / "particles",
        "description": "80 particle sprites for effects"
    },
    "game_icons": {
        "name": "Game Icons (Sbed)",
        "author": "Sbed",
        "license": "CC0",
        "url": "https://opengameart.org/content/game-icons",
        "direct_url": None,  # Manual download
        "type": "png",
        "target": SPRITES_DIR / "icons",
        "description": "400+ game icons including power-ups"
    },
    "impact_sounds": {
        "name": "8-bit Sound Effects (512)",
        "author": "SubspaceAudio",
        "license": "CC0",
        "url": "https://opengameart.org/content/512-sound-effects-8-bit-style",
        "direct_url": "https://opengameart.org/sites/default/files/The%20Essential%20Retro%20Video%20Game%20Sound%20Effects%20Collection%20%5B512%20sounds%5D.zip",
        "type": "wav",
        "target": AUDIO_DIR / "sfx",
        "description": "512 retro sound effects including bounces!"
    },
    "bounce_sounds": {
        "name": "Bounce & Jump Sounds",
        "author": "rubberduck",
        "license": "CC0",
        "url": "https://opengameart.org/content/platformer-jumping-sounds",
        "direct_url": "https://opengameart.org/sites/default/files/Jump%20Pack.zip",
        "type": "wav",
        "target": AUDIO_DIR / "bounce",
        "description": "Perfect bounce/jump sounds for the stuiterbal!"
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# DOWNLOAD FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def download_file(url: str, target: Path) -> bool:
    """Download a file with progress indication."""
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"  📥 Downloading from {url[:50]}...")
        
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (EMMSOAI Asset Downloader)'
        })
        
        with urllib.request.urlopen(req, timeout=120) as response:
            total_size = response.headers.get('content-length')
            if total_size:
                total_size = int(total_size)
                print(f"     Size: {total_size / 1024 / 1024:.1f} MB")
            
            with open(target, 'wb') as f:
                f.write(response.read())
        
        print(f"  ✅ Saved to: {target}")
        return True
        
    except Exception as e:
        print(f"  ❌ Download failed: {e}")
        return False


def extract_zip(zip_path: Path, target_dir: Path) -> bool:
    """Extract a zip file."""
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(target_dir)
        
        print(f"  📦 Extracted to: {target_dir}")
        return True
        
    except Exception as e:
        print(f"  ❌ Extract failed: {e}")
        return False


def download_asset(asset_key: str) -> bool:
    """Download and extract a curated asset."""
    if asset_key not in ASSETS:
        print(f"❌ Unknown asset: {asset_key}")
        print(f"   Available: {', '.join(ASSETS.keys())}")
        return False
    
    asset = ASSETS[asset_key]
    
    print(f"\n{'='*60}")
    print(f"📦 {asset['name']}")
    print(f"   Author: {asset['author']} | License: {asset['license']}")
    print(f"   {asset['description']}")
    print(f"{'='*60}")
    
    if not asset['direct_url']:
        print(f"\n  ⚠️  Manual download required!")
        print(f"  🔗 Visit: {asset['url']}")
        print(f"  📁 Save to: {asset['target']}")
        return False
    
    # Download
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    zip_name = asset['direct_url'].split('/')[-1]
    zip_path = DOWNLOADS_DIR / zip_name
    
    if zip_path.exists():
        print(f"  ℹ️  Already downloaded: {zip_name}")
    else:
        if not download_file(asset['direct_url'], zip_path):
            return False
    
    # Extract
    if zip_path.suffix == '.zip':
        return extract_zip(zip_path, asset['target'])
    
    return True


def show_ball_instructions():
    """Show instructions for downloading the ball model."""
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                        🏀 STUITERBAL / BOUNCING BALL                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  De stuiterbal is nog NIET geïmplementeerd in het spel!                       ║
║  Het spel gebruikt momenteel een procedurele Babylon.js sphere.              ║
║                                                                              ║
║  AANBEVOLEN FREE ASSETS (CC0):                                               ║
║                                                                              ║
║  1. Quaternius Ultimate Balls Pack                                           ║
║     🔗 https://quaternius.com/packs/ultimateballs.html                       ║
║     📁 Bevat: Geanimeerde 3D ballen in GLB formaat                           ║
║     💰 Gratis (CC0)                                                          ║
║                                                                              ║
║  2. Poly.pizza Bouncy Ball                                                   ║
║     🔗 https://poly.pizza/m/nCMdSNF2wV                                       ║
║     📁 Bevat: Low-poly ball character                                        ║
║     💰 Gratis (CC0)                                                          ║
║                                                                              ║
║  3. Kenney Platformer Characters                                             ║
║     🔗 https://kenney.nl/assets/platformer-characters                        ║
║     📁 Bevat: Blob characters (2D)                                           ║
║     💰 Gratis (CC0)                                                          ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  IMPLEMENTATIE STAPPEN:                                                       ║
║                                                                              ║
║  1. Download GLB model van Quaternius                                        ║
║  2. Plaats in: ui-web/public/models/characters/runner.glb                    ║
║  3. Update: ui-web/src/lib/game3d/player.ts                                  ║
║     - Vervang CreateSphere() door SceneLoader.ImportMesh()                   ║
║     - Voeg bounce animatie toe                                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nBeschikbare assets:")
        for key, asset in ASSETS.items():
            auto = "✅ Auto" if asset['direct_url'] else "⚠️ Manual"
            print(f"  {key:15} - {asset['name']} [{auto}]")
        return
    
    asset_key = sys.argv[1].lower()
    
    if asset_key == 'all':
        for key in ASSETS:
            download_asset(key)
    elif asset_key == 'ball':
        show_ball_instructions()
        download_asset('ball')
    else:
        download_asset(asset_key)


if __name__ == '__main__':
    main()
