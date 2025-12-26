# 🎨 MazeChase Style Guide

## Kurzgesagt-Inspired Flat Vector Design

Deze stijlgids definieert de visuele identiteit van MazeChase, geïnspireerd door de Kurzgesagt-animatiestijl.

---

## 🎨 Kleurenpalet

### Primaire Kleuren

| Naam | Hex | Gebruik |
|------|-----|---------|
| **Outline** | `#0B0F2B` | Alle contouren, tekst |
| **Background** | `#1A1A2E` | Donkere achtergrond |

### Character Kleuren

| Character | Kleur | Hex |
|-----------|-------|-----|
| **Runner** | Warm Geel | `#FFD93D` |
| **Chaser Red** | Koraal Rood | `#FF6B6B` |
| **Chaser Pink** | Zacht Roze | `#F8A5C2` |
| **Chaser Cyan** | Turquoise | `#4ECDC4` |
| **Chaser Orange** | Warm Oranje | `#FF9F43` |

### Collectibles

| Item | Kleur | Hex |
|------|-------|-----|
| **Pellet** | Lichtgeel | `#FFE66D` |
| **Power-up** | Koraal Rood | `#FF6B6B` |
| **Power-up Glow** | Geel | `#FFE66D` |

### World Themes

| Theme | Primary | Secondary |
|-------|---------|-----------|
| **Neon Night** | `#00F5FF` Cyaan | `#FF00FF` Magenta |
| **Sunset Maze** | `#FF6B35` Oranje | `#F7C59F` Perzik |
| **Ghost Forest** | `#2D5A27` Donkergroen | `#6B8E23` Olijf |
| **Cyber Arcade** | `#7B2CBF` Paars | `#E040FB` Lichtpaars |

---

## ✏️ Design Regels

### 1. Flat Vector Look
- **Geen gradients** - Alleen egale kleurvlakken
- **Subtiele schaduwen** - Alleen waar nodig voor diepte
- **Clean edges** - Scherpe, duidelijke vormen

### 2. Contouren
- **Dikte**: 3px voor grote elementen, 2px voor kleine
- **Kleur**: Altijd `#0B0F2B` (donkerblauw)
- **Stijl**: Solid, geen dashes of dots

### 3. Geometrische Vormen
- **Cirkels**: Characters, pellets, power-ups
- **Rechthoeken/Pillen**: Platforms, UI elementen
- **Driehoeken**: Pijlen, accenten

### 4. Typography
- **Font**: Sans-serif, bold
- **Aanbevolen**: Inter, Poppins, of Nunito
- **Grootte**: Minimaal 16px voor leesbaarheid

---

## 🎭 Character Design

### Runner (Pac-Man Style)
```
┌──────────────┐
│   ●          │  ← Oog (donkerblauw)
│       ╲      │
│        ╲     │  ← Mond opening (35°-325°)
│       ╱      │
│   ●●●●       │  ← Gele body
└──────────────┘
```
- Pieslice vorm met mond
- Eén oog, rechtsboven
- Gele vulling `#FFD93D`

### Chaser (Ghost Style)
```
┌──────────────┐
│  ╭──────╮    │  ← Ronde bovenkant
│  │ ◯  ◯ │    │  ← Twee ogen met pupillen
│  │      │    │
│  ╰╮ ╭╮ ╭╯    │  ← Golvende onderkant
└──────────────┘
```
- Halve cirkel bovenkant
- Twee witte ogen met pupillen
- Drie "voeten" onderkant
- Kleur varieert per variant

---

## 📦 Sprite Specificaties

| Sprite | Maten | Format |
|--------|-------|--------|
| Runner | 32, 64, 128 px | PNG, transparant |
| Chasers | 32, 64, 128 px | PNG, transparant |
| Pellet | 8, 16, 32 px | PNG, transparant |
| Power-up | 16, 32, 64 px | PNG, transparant |
| Wall | 16, 32, 64 px | PNG, transparant |

---

## 🖼️ UI Components

### Buttons
```css
.button-primary {
    background: #FFD93D;
    border: 3px solid #0B0F2B;
    border-radius: 12px;
    color: #0B0F2B;
    font-weight: bold;
    padding: 12px 24px;
}

.button-secondary {
    background: #4ECDC4;
    border: 3px solid #0B0F2B;
}
```

### Cards
```css
.card {
    background: #2C3E50;
    border: 3px solid #0B0F2B;
    border-radius: 16px;
    box-shadow: 4px 4px 0 #0B0F2B;
}
```

### Score Display
```css
.score {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 24px;
    color: #FFE66D;
    text-shadow: 2px 2px 0 #0B0F2B;
}
```

---

## 🎬 Animaties

### Idle Animations
- **Runner**: Subtiele "ademhaling" (scale 1.0 → 1.05)
- **Chasers**: Lichte float (y ±2px)
- **Power-ups**: Pulseren (scale 0.9 → 1.1)

### Movement
- **Smooth interpolation**: 200ms ease-out
- **Direction change**: Instant (geen rotation)

### Collectie
- **Pellet eaten**: Scale up → fade out (150ms)
- **Power-up**: Flash + scale burst (300ms)

---

## 📐 Grid & Spacing

- **Tile size**: 32x32 pixels (base unit)
- **Character size**: 2x tile (64x64)
- **Padding**: 8px (quarter tile)
- **Margin**: 16px (half tile)

---

## ✅ Do's and Don'ts

### ✅ DO
- Gebruik dikke, duidelijke contouren
- Houd kleuren helder en verzadigd
- Maak vormen geometrisch en simpel
- Test op verschillende schermgrootten
- Zorg voor hoog contrast

### ❌ DON'T
- Geen gradients gebruiken
- Geen dunne lijnen (< 2px)
- Geen complexe texturen
- Geen realistische schaduwen
- Geen meer dan 5 kleuren per scene

---

## 🔧 Tools

### Sprite Generator
```bash
cd tools/
python3 sprite_generator.py --type all --output ./sprites
python3 sprite_generator.py --preview --output ./sprites
```

### Kleuren Exporteren
```javascript
const COLORS = {
    outline: '#0B0F2B',
    runner: '#FFD93D',
    chaserRed: '#FF6B6B',
    chaserPink: '#F8A5C2',
    chaserCyan: '#4ECDC4',
    chaserOrange: '#FF9F43',
    pellet: '#FFE66D',
    powerup: '#FF6B6B',
};
```

---

*Stijlgids v1.0 - MazeChase*
