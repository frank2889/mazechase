#!/usr/bin/env python3
"""
EMMSOAI Auto-Implementer v2.0
================================
Automatisch implementeren van AI-gesuggereerde code changes.

Dit script leest de evaluation JSON bestanden en voert de suggesties uit
met de juiste tools, APIs en dependencies.

FEATURES v2.0:
- OpenAI GPT-4 code generatie
- Freesound.org audio integratie
- Babylon.js component templates
- Automatische dependency installatie

USAGE:
    python auto-implementer.py                      # Interactief menu
    python auto-implementer.py --latest             # Laatste evaluation
    python auto-implementer.py --file <path>        # Specifiek bestand
    python auto-implementer.py --dry-run            # Alleen tonen, niet uitvoeren
    python auto-implementer.py --auto               # Automatisch alle auto-implementable
    python auto-implementer.py --rank 1-5           # Alleen rank 1-5 implementeren
    python auto-implementer.py --use-openai         # Gebruik OpenAI voor code generatie

AUTHOR: EMMSOAI System
DATE: 2026-01-01
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
import argparse
import shutil
import urllib.request
import urllib.parse

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

EMMSOAI_DIR = Path(__file__).parent
PROJECT_ROOT = EMMSOAI_DIR.parent
OUT_DIR = EMMSOAI_DIR / "out"
IN_DIR = EMMSOAI_DIR / "in"
TOOLS_DIR = PROJECT_ROOT / "tools"

# Load .env file
ENV_FILE = PROJECT_ROOT / ".env"
if ENV_FILE.exists():
    with open(ENV_FILE) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value.strip('"').strip("'")

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
FREESOUND_API_KEY = os.environ.get('FREESOUND_API_KEY', '')

# Tool mappings
TOOL_COMMANDS = {
    "python:audio_generator": f"python3 {TOOLS_DIR}/generate-audio.py",
    "python:sprite_generator": f"python3 {TOOLS_DIR}/sprite_generator.py",
    "typescript:component": "npx ts-node",
    "typescript:manual": None,  # Requires manual implementation
    "golang:manual": None,  # Requires manual implementation
    "openai:gpt-4": "openai_generate",  # Special handler
    "openai:dalle-3": "openai_image",   # Special handler
    "api:freesound": "freesound_search", # Special handler
}

# Gratis APIs die we mogen gebruiken
FREE_APIS = {
    "openai": {"name": "OpenAI", "env_key": "OPENAI_API_KEY", "free_tier": True},
    "freesound": {"name": "Freesound.org", "env_key": "FREESOUND_API_KEY", "free_tier": True},
    "babylon": {"name": "Babylon.js", "env_key": None, "free_tier": True},
    "web-audio": {"name": "Web Audio API", "env_key": None, "free_tier": True},
}

# ANSI Colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def color(text: str, c: str) -> str:
    return f"{c}{text}{Colors.ENDC}"

# ═══════════════════════════════════════════════════════════════════════════════
# OPENAI CODE GENERATION (FREE API)
# ═══════════════════════════════════════════════════════════════════════════════

def openai_generate_code(prompt: str, file_type: str = "typescript", context: str = "") -> Optional[str]:
    """
    Generate code using OpenAI GPT-4 API.
    Returns the generated code or None if failed.
    """
    if not OPENAI_API_KEY:
        print(color("⚠️  OPENAI_API_KEY not set in .env", Colors.YELLOW))
        return None
    
    system_prompt = f"""You are an expert {file_type} developer for MazeChase game.
Generate clean, well-documented code following these guidelines:
- Use TypeScript with proper types
- Follow Babylon.js best practices for 3D graphics
- Include JSDoc comments
- Export functions and classes properly
- Handle errors gracefully

Project context: MazeChase is a 3D multiplayer maze game using Babylon.js."""
    
    user_prompt = f"""Generate {file_type} code for the following requirement:

{prompt}

{f'Additional context: {context}' if context else ''}

Return ONLY the code, no explanations."""

    try:
        data = json.dumps({
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        }).encode('utf-8')
        
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            }
        )
        
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
            code = result['choices'][0]['message']['content']
            
            # Strip markdown code blocks if present
            if code.startswith('```'):
                lines = code.split('\n')
                code = '\n'.join(lines[1:-1] if lines[-1] == '```' else lines[1:])
            
            print(color("✅ OpenAI code generated successfully", Colors.GREEN))
            return code
            
    except urllib.error.HTTPError as e:
        print(color(f"❌ OpenAI API error: {e.code} - {e.reason}", Colors.RED))
        return None
    except Exception as e:
        print(color(f"❌ OpenAI error: {e}", Colors.RED))
        return None


def openai_generate_image(prompt: str, size: str = "1024x1024") -> Optional[str]:
    """
    Generate image using OpenAI DALL-E 3 API.
    Returns the image URL or None if failed.
    """
    if not OPENAI_API_KEY:
        print(color("⚠️  OPENAI_API_KEY not set in .env", Colors.YELLOW))
        return None
    
    try:
        data = json.dumps({
            "model": "dall-e-3",
            "prompt": f"Game sprite for MazeChase maze game: {prompt}. Pixel art style, vibrant colors, transparent background.",
            "n": 1,
            "size": size
        }).encode('utf-8')
        
        req = urllib.request.Request(
            "https://api.openai.com/v1/images/generations",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            }
        )
        
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode('utf-8'))
            image_url = result['data'][0]['url']
            print(color("✅ DALL-E image generated", Colors.GREEN))
            return image_url
            
    except Exception as e:
        print(color(f"❌ DALL-E error: {e}", Colors.RED))
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# OPENGAMEART & FREE ASSET SEARCH (Search before generate!)
# ═══════════════════════════════════════════════════════════════════════════════

# Curated free asset sources (CC0/public domain)
FREE_ASSET_SOURCES = {
    "opengameart": "https://opengameart.org/art-search-advanced?keys=",
    "kenney": "https://kenney.nl/assets?q=",
    "quaternius": "https://quaternius.com/packs/",
    "polypizza": "https://poly.pizza/search/",
}

# Pre-curated assets we know exist (saves API calls)
CURATED_ASSETS = {
    "ball": [
        {"name": "Ultimate Balls Pack (Quaternius)", "url": "https://quaternius.com/packs/ultimateballs.html", "type": "glb", "license": "CC0", "direct_download": "https://quaternius.com/assets/Ultimate_Animated_Balls_Pack.zip"},
        {"name": "Bouncing Ball Sprites", "url": "https://opengameart.org/content/bouncing-ball-sprites", "type": "png", "license": "CC0"},
        {"name": "3D Sphere Characters", "url": "https://poly.pizza/bundle/Stylized-Balls-Pack-xJRlNbP7oV", "type": "glb", "license": "CC0"},
        {"name": "Blob Character (Kenney)", "url": "https://kenney.nl/assets/platformer-characters", "type": "png", "license": "CC0"},
    ],
    "bounce": [
        {"name": "Bouncing Ball Animation", "url": "https://opengameart.org/content/bouncing-ball", "type": "gif", "license": "CC0"},
    ],
    "sphere": [
        {"name": "Glowing Orb", "url": "https://opengameart.org/content/glowing-orb", "type": "png", "license": "CC0"},
        {"name": "Energy Spheres", "url": "https://opengameart.org/content/energy-sphere", "type": "png", "license": "CC0"},
    ],
    "stuiterbal": [  # Dutch keyword support
        {"name": "Ultimate Balls Pack (Quaternius)", "url": "https://quaternius.com/packs/ultimateballs.html", "type": "glb", "license": "CC0", "direct_download": "https://quaternius.com/assets/Ultimate_Animated_Balls_Pack.zip"},
        {"name": "Bouncy Ball Character", "url": "https://poly.pizza/m/nCMdSNF2wV", "type": "glb", "license": "CC0"},
    ],
    "particle": [
        {"name": "Particle Effects Pack", "url": "https://opengameart.org/content/particle-effects", "type": "png", "license": "CC0"},
        {"name": "Kenney Particle Pack", "url": "https://kenney.nl/assets/particle-pack", "type": "png", "license": "CC0"},
        {"name": "Magic Particles", "url": "https://opengameart.org/content/magic-particle-fx", "type": "png", "license": "CC0"},
    ],
    "powerup": [
        {"name": "Power-up Icons", "url": "https://opengameart.org/content/powerup-icons", "type": "png", "license": "CC0"},
        {"name": "Kenney Game Icons", "url": "https://kenney.nl/assets/game-icons", "type": "png", "license": "CC0"},
    ],
    "audio": [
        {"name": "512 Sound Effects 8-bit", "url": "https://opengameart.org/content/512-sound-effects-8-bit-style", "type": "wav", "license": "CC0"},
        {"name": "Kenney Game Audio", "url": "https://kenney.nl/assets/category:Audio", "type": "ogg", "license": "CC0"},
        {"name": "Bounce Sound", "url": "https://freesound.org/search/?q=bounce", "type": "mp3", "license": "CC0"},
    ],
    "wall": [
        {"name": "Dungeon Tiles 32x32", "url": "https://opengameart.org/content/dungeon-crawl-32x32-tiles", "type": "png", "license": "CC0"},
        {"name": "Neon Wall Tiles", "url": "https://opengameart.org/content/neon-tiles", "type": "png", "license": "CC0"},
    ],
    "character": [
        {"name": "Animated Characters Pack", "url": "https://quaternius.com/packs/animatedcharacterpack.html", "type": "glb", "license": "CC0"},
        {"name": "Ultimate Animated Characters", "url": "https://quaternius.com/packs/ultimatecharacters.html", "type": "glb", "license": "CC0"},
    ],
    "runner": [
        {"name": "Blob Runner Character", "url": "https://kenney.nl/assets/platformer-characters", "type": "png", "license": "CC0"},
        {"name": "Ultimate Balls (Runner)", "url": "https://quaternius.com/packs/ultimateballs.html", "type": "glb", "license": "CC0"},
    ],
    "chaser": [
        {"name": "Animated Enemy Pack", "url": "https://quaternius.com/packs/animatedmonsters.html", "type": "glb", "license": "CC0"},
    ],
    "neon": [
        {"name": "Neon Textures", "url": "https://opengameart.org/content/neon-glow-textures", "type": "png", "license": "CC0"},
    ],
},


def search_existing_assets(keywords: List[str], asset_type: str = "all") -> List[Dict]:
    """
    Search for existing free assets before generating new ones.
    Returns list of matching curated assets.
    
    This implements the "search before generate" philosophy:
    - First check curated assets we know exist
    - Provide download URLs for free CC0 assets
    - Only generate with AI if nothing suitable exists
    """
    results = []
    
    print(color(f"🔍 Searching existing assets for: {', '.join(keywords)}", Colors.CYAN))
    
    for keyword in keywords:
        keyword_lower = keyword.lower()
        
        # Check curated assets
        for asset_key, assets in CURATED_ASSETS.items():
            if keyword_lower in asset_key or asset_key in keyword_lower:
                for asset in assets:
                    # Filter by type if specified
                    if asset_type != "all" and asset['type'] != asset_type:
                        continue
                    if asset not in results:
                        results.append(asset)
    
    if results:
        print(color(f"✅ Found {len(results)} existing free assets!", Colors.GREEN))
        for asset in results[:5]:  # Show first 5
            print(f"   📦 {asset['name']} ({asset['type']}) - {asset['license']}")
            print(f"      {asset['url']}")
    else:
        print(color(f"⚠️  No curated assets found for '{', '.join(keywords)}'", Colors.YELLOW))
        print(f"   💡 Try searching manually:")
        for source, url in FREE_ASSET_SOURCES.items():
            print(f"      {source}: {url}{keywords[0]}")
    
    return results


def download_asset(url: str, output_path: Path) -> bool:
    """Download a free asset to local path."""
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Add headers to avoid blocking
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 EMMSOAI-AssetDownloader/1.0'
        })
        
        with urllib.request.urlopen(req, timeout=60) as response:
            with open(output_path, 'wb') as f:
                f.write(response.read())
        
        print(color(f"✅ Downloaded: {output_path.name}", Colors.GREEN))
        return True
    except Exception as e:
        print(color(f"❌ Download failed: {e}", Colors.RED))
        return False


def search_or_generate_asset(change: Dict, use_ai: bool = True) -> Optional[str]:
    """
    Main asset acquisition function - SEARCH FIRST, then generate.
    
    Returns path to asset or URL if found/generated.
    """
    file_path = change.get('file', '')
    description = change.get('change', '')
    
    # Extract keywords from description
    keywords = []
    for word in ['ball', 'sphere', 'particle', 'powerup', 'power-up', 'audio', 
                 'sound', 'wall', 'floor', 'character', 'sprite', 'effect']:
        if word in description.lower() or word in file_path.lower():
            keywords.append(word)
    
    if not keywords:
        keywords = [file_path.split('/')[-1].replace('.ts', '').replace('.png', '')]
    
    # Determine asset type from file extension
    if '.png' in file_path or '.jpg' in file_path:
        asset_type = 'png'
    elif '.glb' in file_path or '.gltf' in file_path:
        asset_type = 'glb'
    elif '.mp3' in file_path or '.ogg' in file_path or '.wav' in file_path:
        asset_type = 'audio'
    else:
        asset_type = 'all'
    
    # 1. SEARCH EXISTING ASSETS FIRST
    existing = search_existing_assets(keywords, asset_type)
    
    if existing:
        print(color("💡 Found existing asset! Consider downloading instead of generating.", Colors.GREEN))
        return existing[0]['url']
    
    # 2. FALLBACK: Generate with AI if enabled
    if use_ai and OPENAI_API_KEY:
        if asset_type in ['png', 'all']:
            print(color("🎨 No existing asset found, generating with DALL-E...", Colors.YELLOW))
            return openai_generate_image(description)
    
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# FREESOUND AUDIO API (FREE)
# ═══════════════════════════════════════════════════════════════════════════════

def freesound_search(query: str, max_results: int = 5) -> List[Dict]:
    """
    Search Freesound.org for audio files.
    Returns list of sound metadata.
    """
    if not FREESOUND_API_KEY:
        print(color("⚠️  FREESOUND_API_KEY not set in .env", Colors.YELLOW))
        return []
    
    try:
        params = urllib.parse.urlencode({
            "query": query,
            "token": FREESOUND_API_KEY,
            "fields": "id,name,url,previews,duration,license",
            "page_size": max_results,
            "filter": "duration:[0 TO 10]"  # Max 10 seconds for game sounds
        })
        
        url = f"https://freesound.org/apiv2/search/text/?{params}"
        
        with urllib.request.urlopen(url, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            sounds = result.get('results', [])
            print(color(f"✅ Found {len(sounds)} sounds on Freesound", Colors.GREEN))
            return sounds
            
    except Exception as e:
        print(color(f"❌ Freesound error: {e}", Colors.RED))
        return []


def freesound_download(sound_id: int, output_path: Path) -> bool:
    """
    Download a sound from Freesound.org (preview quality - free).
    """
    if not FREESOUND_API_KEY:
        return False
    
    try:
        # Get sound details
        url = f"https://freesound.org/apiv2/sounds/{sound_id}/?token={FREESOUND_API_KEY}"
        
        with urllib.request.urlopen(url, timeout=30) as response:
            sound = json.loads(response.read().decode('utf-8'))
            preview_url = sound.get('previews', {}).get('preview-hq-mp3')
            
            if not preview_url:
                return False
            
            # Download preview
            output_path.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(preview_url, output_path)
            print(color(f"✅ Downloaded: {output_path.name}", Colors.GREEN))
            return True
            
    except Exception as e:
        print(color(f"❌ Download error: {e}", Colors.RED))
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# EVALUATION LOADER
# ═══════════════════════════════════════════════════════════════════════════════

def get_latest_evaluation() -> Optional[Path]:
    """Get the most recent evaluation file."""
    if not OUT_DIR.exists():
        return None
    
    eval_files = sorted(OUT_DIR.glob("evaluation-*.json"), reverse=True)
    return eval_files[0] if eval_files else None


def load_evaluation(file_path: Path) -> Dict[str, Any]:
    """Load and parse an evaluation JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def display_changes(changes: List[Dict], show_executor: bool = True):
    """Display code changes in a formatted table."""
    print(f"\n{color('═' * 80, Colors.CYAN)}")
    print(color("  CONCRETE CODE CHANGES", Colors.BOLD))
    print(f"{color('═' * 80, Colors.CYAN)}\n")
    
    for change in changes:
        rank = change.get('rank', '?')
        priority = change.get('priority', 'medium')
        priority_color = {
            'high': Colors.RED,
            'medium': Colors.YELLOW,
            'low': Colors.GREEN
        }.get(priority, Colors.ENDC)
        
        print(f"{color(f'[{rank}]', Colors.BOLD)} {color(f'[{priority.upper()}]', priority_color)}")
        print(f"    📁 {color(change.get('file', 'unknown'), Colors.CYAN)}")
        print(f"    🔧 {change.get('function', 'N/A')}")
        print(f"    📝 {change.get('change', 'No description')}")
        print(f"    👤 Suggested by: {change.get('suggestedBy', 'Unknown')}")
        
        if show_executor and 'executor' in change:
            exec_info = change['executor']
            auto = "✅ AUTO" if exec_info.get('autoImplementable') else "⚠️ MANUAL"
            print(f"    🛠️  Tool: {exec_info.get('tool', 'unknown')} | {auto}")
            if exec_info.get('dependencies'):
                print(f"    📦 Deps: {', '.join(exec_info['dependencies'])}")
            if exec_info.get('services'):
                print(f"    🔌 Services: {', '.join(exec_info['services'])}")
            print(f"    🧪 Test: {exec_info.get('testCommand', 'npm run build')}")
        
        print()


# ═══════════════════════════════════════════════════════════════════════════════
# IMPLEMENTATION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class ImplementationResult:
    def __init__(self, success: bool, message: str, output: str = ""):
        self.success = success
        self.message = message
        self.output = output


def check_dependencies(deps: List[str]) -> List[str]:
    """Check which dependencies are missing."""
    missing = []
    for dep in deps:
        # Check npm packages
        package_json = PROJECT_ROOT / "ui-web" / "package.json"
        if package_json.exists():
            with open(package_json) as f:
                pkg = json.load(f)
                all_deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                if dep not in all_deps:
                    missing.append(dep)
    return missing


def install_dependencies(deps: List[str]) -> bool:
    """Install missing npm dependencies."""
    if not deps:
        return True
    
    print(f"\n{color('📦 Installing dependencies:', Colors.YELLOW)} {', '.join(deps)}")
    try:
        subprocess.run(
            ["npm", "install", "--save"] + deps,
            cwd=PROJECT_ROOT / "ui-web",
            check=True,
            capture_output=True
        )
        print(color("✅ Dependencies installed", Colors.GREEN))
        return True
    except subprocess.CalledProcessError as e:
        print(color(f"❌ Failed to install: {e}", Colors.RED))
        return False


def create_typescript_file(change: Dict) -> ImplementationResult:
    """Create a new TypeScript file based on the change description."""
    file_path = PROJECT_ROOT / change.get('file', '')
    
    if file_path.exists():
        return ImplementationResult(False, f"File already exists: {file_path}")
    
    # Create directory if needed
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Generate template based on file type
    template = generate_typescript_template(change)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(template)
    
    return ImplementationResult(True, f"Created: {file_path}", template)


def generate_typescript_template(change: Dict) -> str:
    """Generate a TypeScript template based on the change metadata."""
    file_name = Path(change.get('file', 'unknown.ts')).stem
    function_name = change.get('function', 'main')
    description = change.get('change', 'TODO: Implement this feature')
    suggested_by = change.get('suggestedBy', 'EMMSOAI')
    expertise = change.get('expertise', 'Unknown')
    
    template = f'''/**
 * {file_name}
 * 
 * EMMSOAI Suggestion ({suggested_by} - {expertise}):
 * "{description}"
 * 
 * Generated by: EMMSOAI Auto-Implementer
 * Date: {datetime.now().strftime('%Y-%m-%d')}
 */

// TODO: Add proper imports based on dependencies
// import * as BABYLON from '@babylonjs/core';

export interface {file_name.title().replace('_', '')}Config {{
    // TODO: Define configuration options
    enabled: boolean;
}}

const DEFAULT_CONFIG: {file_name.title().replace('_', '')}Config = {{
    enabled: true
}};

/**
 * {function_name}
 * {description}
 */
export function {function_name}(config: Partial<{file_name.title().replace('_', '')}Config> = {{}}): void {{
    const finalConfig = {{ ...DEFAULT_CONFIG, ...config }};
    
    // TODO: Implement the functionality described above
    console.log('[{file_name}] {function_name} called with:', finalConfig);
    
    throw new Error('Not implemented yet - needs manual implementation');
}}

/**
 * Main class for {file_name}
 */
export class {file_name.title().replace('_', '')}Manager {{
    private config: {file_name.title().replace('_', '')}Config;
    
    constructor(config: Partial<{file_name.title().replace('_', '')}Config> = {{}}) {{
        this.config = {{ ...DEFAULT_CONFIG, ...config }};
    }}
    
    /**
     * Initialize the manager
     */
    initialize(): void {{
        console.log('[{file_name}] Initialized');
    }}
    
    /**
     * Dispose resources
     */
    dispose(): void {{
        console.log('[{file_name}] Disposed');
    }}
}}

// Export singleton instance
export const {file_name.replace('_', '')}Manager = new {file_name.title().replace('_', '')}Manager();
'''
    return template


def run_python_tool(tool: str, change: Dict) -> ImplementationResult:
    """Run a Python tool for asset generation."""
    tool_script = TOOL_COMMANDS.get(tool)
    if not tool_script:
        return ImplementationResult(False, f"Unknown tool: {tool}")
    
    try:
        result = subprocess.run(
            tool_script.split() + [json.dumps(change)],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            return ImplementationResult(True, "Tool executed successfully", result.stdout)
        else:
            return ImplementationResult(False, f"Tool failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        return ImplementationResult(False, "Tool timed out")
    except Exception as e:
        return ImplementationResult(False, str(e))


def implement_change(change: Dict, dry_run: bool = False, use_openai: bool = False) -> ImplementationResult:
    """Attempt to implement a single code change."""
    executor = change.get('executor', {})
    tool = executor.get('tool', 'typescript:manual')
    file_path = change.get('file', '')
    change_type = change.get('type', 'modify')
    implementation = change.get('implementation', {})
    
    print(f"\n{color('━' * 60, Colors.BLUE)}")
    print(f"Implementing: {color(file_path, Colors.CYAN)}")
    print(f"Tool: {tool} | Type: {change_type}")
    if implementation.get('api'):
        print(f"API: {implementation.get('api')} | Method: {implementation.get('method', 'N/A')}")
    print(f"{color('━' * 60, Colors.BLUE)}")
    
    if dry_run:
        print(color("  [DRY RUN] Would implement this change", Colors.YELLOW))
        if implementation.get('example'):
            print(color("  Example code:", Colors.CYAN))
            print(f"  {implementation.get('example')[:200]}...")
        return ImplementationResult(True, "Dry run - no changes made")
    
    # Check and install dependencies
    deps = executor.get('dependencies', [])
    missing = check_dependencies(deps)
    if missing:
        if not install_dependencies(missing):
            return ImplementationResult(False, f"Failed to install dependencies: {missing}")
    
    # Route to appropriate implementation method
    if tool == 'openai:gpt-4' or (use_openai and change_type == 'create'):
        # Use OpenAI to generate code
        prompt = f"""
File: {file_path}
Function: {change.get('function', 'main')}
Description: {change.get('change', '')}
Suggested by: {change.get('suggestedBy', 'EMMSOAI')} ({change.get('expertise', '')})

{f"Implementation hint: {implementation.get('method', '')}" if implementation.get('method') else ''}
{f"Example: {implementation.get('example', '')}" if implementation.get('example') else ''}
"""
        code = openai_generate_code(prompt, "typescript", change.get('context', ''))
        if code:
            full_path = PROJECT_ROOT / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(code)
            return ImplementationResult(True, f"Created with OpenAI: {file_path}", code)
        else:
            return ImplementationResult(False, "OpenAI generation failed")
    
    elif tool == 'openai:dalle-3':
        # SEARCH EXISTING ASSETS FIRST before generating!
        existing_asset = search_or_generate_asset(change, use_ai=False)
        if existing_asset:
            return ImplementationResult(
                True, 
                f"Found existing free asset! Download from: {existing_asset}",
                existing_asset
            )
        
        # No existing asset found - generate with DALL-E
        prompt = change.get('change', 'game sprite')
        image_url = openai_generate_image(prompt)
        if image_url:
            return ImplementationResult(True, f"Image generated: {image_url}", image_url)
        else:
            return ImplementationResult(False, "DALL-E generation failed")
    
    elif tool == 'api:freesound':
        # Search and download from Freesound
        query = change.get('change', 'game sound effect')
        sounds = freesound_search(query, max_results=3)
        if sounds and len(sounds) > 0:
            # Download first matching sound
            sound = sounds[0]
            output_path = PROJECT_ROOT / "ui-web" / "public" / "audio" / f"{sound['id']}.mp3"
            if freesound_download(sound['id'], output_path):
                return ImplementationResult(True, f"Audio downloaded: {output_path}", json.dumps(sound))
        return ImplementationResult(False, "No suitable sounds found on Freesound")
    
    elif change_type == 'create':
        if tool.startswith('python:'):
            return run_python_tool(tool, change)
        else:
            return create_typescript_file(change)
    elif change_type == 'modify':
        # Modifications require more context - mark as manual for now
        return ImplementationResult(
            False, 
            "Modification requires manual implementation. Use Copilot to help.",
            f"File: {file_path}\nChange: {change.get('change', '')}"
        )
    else:
        return ImplementationResult(False, f"Unknown change type: {change_type}")


def run_test(change: Dict) -> bool:
    """Run the test command for a change."""
    executor = change.get('executor', {})
    test_cmd = executor.get('testCommand', 'npm run build')
    
    print(f"\n{color('🧪 Running test:', Colors.CYAN)} {test_cmd}")
    
    try:
        result = subprocess.run(
            test_cmd,
            shell=True,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            print(color("✅ Test passed", Colors.GREEN))
            return True
        else:
            print(color(f"❌ Test failed: {result.stderr[:200]}", Colors.RED))
            return False
    except Exception as e:
        print(color(f"❌ Test error: {e}", Colors.RED))
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# IMPLEMENTATION LOG
# ═══════════════════════════════════════════════════════════════════════════════

def save_implementation_log(
    evaluation_file: str,
    implemented: List[Dict],
    skipped: List[Dict],
    failed: List[Dict]
) -> Path:
    """Save implementation results to in/ directory."""
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
    log_file = IN_DIR / f"implementation-{timestamp}.json"
    
    IN_DIR.mkdir(exist_ok=True)
    
    log_data = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "sourceEvaluation": str(evaluation_file),
            "implementedCount": len(implemented),
            "skippedCount": len(skipped),
            "failedCount": len(failed)
        },
        "implemented": implemented,
        "skipped": skipped,
        "failed": failed,
        "summary": {
            "successRate": len(implemented) / max(1, len(implemented) + len(failed)) * 100,
            "nextSteps": [
                "Review implemented changes",
                "Manually implement skipped items",
                "Fix failed implementations",
                "Run full test suite",
                "Deploy if all tests pass"
            ]
        }
    }
    
    with open(log_file, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n{color('📄 Implementation log saved:', Colors.GREEN)} {log_file}")
    return log_file


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="EMMSOAI Auto-Implementer - Execute AI-suggested code changes"
    )
    parser.add_argument('--latest', action='store_true', help='Use latest evaluation file')
    parser.add_argument('--file', type=str, help='Specific evaluation file to use')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--auto', action='store_true', help='Only implement auto-implementable changes')
    parser.add_argument('--rank', type=str, help='Rank range to implement (e.g., 1-5)')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')
    parser.add_argument('--use-openai', action='store_true', help='Use OpenAI GPT-4 for code generation')
    parser.add_argument('--use-freesound', action='store_true', help='Use Freesound.org for audio')
    
    args = parser.parse_args()
    
    # Banner
    print(f"""
{color('═' * 60, Colors.CYAN)}
{color('  EMMSOAI Auto-Implementer v2.0', Colors.BOLD)}
{color('  Automated Code Change Implementation', Colors.BLUE)}
{color('  FREE APIs: OpenAI GPT-4, DALL-E, Freesound.org', Colors.GREEN)}
{color('═' * 60, Colors.CYAN)}
""")
    
    # Show API status
    print(f"{color('API Status:', Colors.BOLD)}")
    print(f"  OpenAI:    {'✅ Configured' if OPENAI_API_KEY else '❌ Not configured (set OPENAI_API_KEY in .env)'}")
    print(f"  Freesound: {'✅ Configured' if FREESOUND_API_KEY else '❌ Not configured (set FREESOUND_API_KEY in .env)'}")
    print()
    
    # Load evaluation file
    if args.file:
        eval_file = Path(args.file)
    else:
        eval_file = get_latest_evaluation()
    
    if not eval_file or not eval_file.exists():
        print(color("❌ No evaluation file found!", Colors.RED))
        print(f"   Run 'node ai-game-testers.js' first to generate an evaluation.")
        sys.exit(1)
    
    print(f"{color('📂 Loading:', Colors.CYAN)} {eval_file.name}")
    
    try:
        evaluation = load_evaluation(eval_file)
    except Exception as e:
        print(color(f"❌ Failed to load evaluation: {e}", Colors.RED))
        sys.exit(1)
    
    changes = evaluation.get('concreteCodeChanges', [])
    if not changes:
        print(color("⚠️ No concrete code changes found in evaluation", Colors.YELLOW))
        sys.exit(0)
    
    print(f"\n{color(f'Found {len(changes)} code changes', Colors.GREEN)}")
    
    # Filter by rank if specified
    if args.rank:
        try:
            if '-' in args.rank:
                start, end = map(int, args.rank.split('-'))
            else:
                start = end = int(args.rank)
            changes = [c for c in changes if start <= c.get('rank', 0) <= end]
            print(f"{color(f'Filtered to ranks {start}-{end}: {len(changes)} changes', Colors.YELLOW)}")
        except ValueError:
            print(color(f"Invalid rank format: {args.rank}", Colors.RED))
            sys.exit(1)
    
    # Filter auto-implementable if specified
    if args.auto:
        changes = [c for c in changes if c.get('executor', {}).get('autoImplementable', False)]
        print(f"{color(f'Auto-implementable only: {len(changes)} changes', Colors.YELLOW)}")
    
    # Display changes
    display_changes(changes, show_executor=True)
    
    if args.dry_run:
        print(color("\n[DRY RUN MODE] No changes will be made\n", Colors.YELLOW))
    
    # Interactive confirmation
    if args.interactive or (not args.auto and not args.dry_run):
        response = input(f"\n{color('Implement these changes? [y/N/select]: ', Colors.BOLD)}").strip().lower()
        if response == 'n' or response == '':
            print("Aborted.")
            sys.exit(0)
        elif response.startswith('s'):
            # Select specific ranks
            ranks = input("Enter ranks to implement (e.g., 1,3,5): ").strip()
            selected = [int(r.strip()) for r in ranks.split(',')]
            changes = [c for c in changes if c.get('rank') in selected]
    
    # Implement changes
    implemented = []
    skipped = []
    failed = []
    
    for change in changes:
        rank = change.get('rank', '?')
        executor = change.get('executor', {})
        
        if not executor.get('autoImplementable') and not args.dry_run:
            print(f"\n{color(f'[{rank}] Skipping (manual required):', Colors.YELLOW)} {change.get('file')}")
            skipped.append({
                "rank": rank,
                "file": change.get('file'),
                "reason": "Requires manual implementation",
                "change": change.get('change')
            })
            continue
        
        result = implement_change(change, dry_run=args.dry_run, use_openai=args.use_openai)
        
        if result.success:
            print(color(f"  ✅ {result.message}", Colors.GREEN))
            implemented.append({
                "rank": rank,
                "file": change.get('file'),
                "result": result.message
            })
            
            # Run test
            if not args.dry_run:
                run_test(change)
        else:
            print(color(f"  ❌ {result.message}", Colors.RED))
            failed.append({
                "rank": rank,
                "file": change.get('file'),
                "error": result.message
            })
    
    # Summary
    print(f"\n{color('═' * 60, Colors.CYAN)}")
    print(color("  SUMMARY", Colors.BOLD))
    print(f"{color('═' * 60, Colors.CYAN)}")
    print(f"  ✅ Implemented: {len(implemented)}")
    print(f"  ⏭️  Skipped:     {len(skipped)}")
    print(f"  ❌ Failed:      {len(failed)}")
    
    # Save log
    if not args.dry_run and (implemented or skipped or failed):
        save_implementation_log(str(eval_file), implemented, skipped, failed)
    
    print(f"\n{color('Done!', Colors.GREEN)}\n")


if __name__ == '__main__':
    main()
