# MazeChase Game Design Document

> **Last Updated:** January 2026  
> **Core Concept:** Third-person bouncing ball physics game

---

## 🎮 Core Gameplay Loop

### You ARE a Bouncing Ball!

MazeChase is NOT a traditional maze game with WASD movement. The player IS a bouncing ball that moves through the world using **physics-based bounce controls**.

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE MECHANIC                             │
│                                                              │
│   SPACE / TAP  →  BOUNCE  →  TIMING  →  MOMENTUM  →  SKILL  │
│                                                              │
│   Well-timed bounces chain together for speed boosts!        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📹 Camera System

### Third-Person Following Camera

The camera is positioned **BEHIND and ABOVE** the player's ball, following it through the arena.

| Property | Value | Description |
|----------|-------|-------------|
| Position | Behind ball | ~5-8 units behind, ~3-5 units above |
| Tracking | Smooth follow | Slight lag for fluid feel |
| Speed adjust | Dynamic | Camera pulls back at high speeds |
| Look-at | Ball position | Always centered on the player |

**NOT used:**
- ❌ Top-down view
- ❌ Isometric camera
- ❌ Fixed camera positions

---

## 🎯 Controls

### Desktop Controls

| Input | Action | Details |
|-------|--------|---------|
| **Space** | Bounce | Tap for standard bounce |
| **Hold Space** | Charge bounce | Higher/longer jump |
| **WASD / Arrows** | Direction influence | Lean during bounce |
| **Mouse** | Camera look (optional) | Free look around |

### Mobile Controls

| Input | Action | Details |
|-------|--------|---------|
| **Tap anywhere** | Bounce | Core mechanic |
| **Hold tap** | Charge bounce | For bigger jumps |
| **Swipe** | Direction influence | Tilt direction |
| **Two-finger** | Camera control | Look around |

### Physics Behavior

```
Normal Bounce:     ●→ ⌒ → ●
                   (tap)

Charged Bounce:    ●→ ⌒⌒⌒ → ●  
                   (hold then release)

Wall Bounce:       ●→ █ →●
                   (strategic rebounds)

Chain Bounce:      ●→⌒→⌒→⌒→ SPEED BOOST!
                   (timing mastery)
```

---

## 🟡 Pellet System

### Fewer Pellets, Random Locations

Unlike classic maze games that fill every walkable tile with pellets, MazeChase uses:

| Property | Value | Reasoning |
|----------|-------|-----------|
| Count | 30-50 pellets | Less grinding, more strategic |
| Placement | Random | Not grid-based |
| Visibility | Glowing neon | Easy to spot from distance |
| Collection | Bounce through | Collected on contact |

### Why Fewer Pellets?

1. **Reduces grind** - Focus on fun, not tedious collection
2. **Strategic routing** - Plan your bounce path
3. **Faster games** - 2-3 minute matches
4. **Visual clarity** - Less visual noise

---

## 👥 Players & Roles

| Role | Visual | Behavior |
|------|--------|----------|
| **Runner** | Yellow glowing ball | Collects pellets, avoids chasers |
| **Chaser 1** | Red ball | Hunts the runner |
| **Chaser 2** | Purple ball | Hunts the runner |
| **Chaser 3** | Green ball | Hunts the runner |

All players use the same bounce mechanics - skill determines who wins!

---

## ⚡ Power-Ups

| Power-Up | Effect | Duration |
|----------|--------|----------|
| **Power Mode** 🟡 | Runner can catch Chasers | 8 seconds |
| **Super Bounce** 🟠 | Higher, faster bounces | 6 seconds |
| **Magnet** 🟣 | Attract pellets while bouncing | 7 seconds |

---

## 🏟️ Arena Design

### Unified Neon Arena

- **Shape:** Circular arena
- **Theme:** Purple/cyan neon aesthetic
- **Walls:** Glowing barriers (bouncing off them is strategic)
- **Floor:** Reflective neon surface
- **Lighting:** Dynamic glow effects

### Layout Considerations for Bounce Gameplay

- Open areas for building momentum
- Wall sections for strategic bouncing
- Elevated areas reachable with charged bounces
- Corridors that reward precise timing

---

## 🎨 Visual Identity

### Ball Design

```
     ╭───────╮
    │  ✧    │     ← Glow effect
   │    ●    │    ← Core ball
    │      ✧│     ← Shine highlight
     ╰───────╯
        │
        ▼ 
   ═══════════    ← Shadow/reflection
```

### Animation States

| State | Animation |
|-------|-----------|
| Idle | Gentle float/bob |
| Bouncing | Squash on land, stretch on rise |
| Charging | Compress down, glow intensifies |
| Power-up | Aura effect, particle trail |
| Fast | Motion blur, stretched trail |

---

## 📱 Platform Support

| Platform | Controls | Notes |
|----------|----------|-------|
| Desktop | Space + WASD | Full experience |
| Mobile | Tap + Swipe | Touch-optimized |
| Tablet | Tap + Swipe | Larger touch targets |

---

## 🔊 Audio Design

### Bounce Sounds

- **Normal bounce:** Satisfying "boing" 
- **Charged bounce:** Power-up whoosh
- **Wall bounce:** Impact thud + spring
- **Chain bonus:** Ascending chime sequence

### Music

- Upbeat electronic/chiptune
- Tempo syncs with gameplay intensity
- Victory/defeat stingers

---

## 📊 Win Conditions

| Winner | Condition |
|--------|-----------|
| Runner | All pellets collected |
| Runner | Caught all 3 Chasers (during Power Mode) |
| Chasers | Runner caught |
| Draw | Time runs out (3 minutes) |

---

## 🎯 Design Pillars

1. **Simple to learn** - Tap to bounce, that's it
2. **Skill ceiling** - Timing mastery rewards practice
3. **Physics fun** - Satisfying ball physics
4. **Quick matches** - 2-3 minutes per game
5. **Visual clarity** - Clean neon aesthetic, easy to read

---

## ⚠️ What This Game Is NOT

- ❌ NOT a WASD movement game
- ❌ NOT a top-down view game  
- ❌ NOT a grid-based pellet collector
- ❌ NOT a complex RPG with stats
- ❌ NOT a platformer with precise jumping

**It IS:**
- ✅ A bouncing ball game
- ✅ Third-person camera
- ✅ Physics-based movement
- ✅ Timing-skill focused
- ✅ Quick multiplayer fun
