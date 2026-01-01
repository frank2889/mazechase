# 🧪 UX & Retention Research - Game Psychology 2024-2025

## Executive Summary
Dit document bevat voorgecompileerd onderzoek voor David (UX Researcher).
Gebruik deze data voor onderbouwde UX en retentie adviezen.

---

## 📊 Retention Benchmarks

### Industry Standards (Casual Games)
| Metric | Poor | Average | Good | Excellent |
|--------|------|---------|------|-----------|
| D1 | <30% | 35-40% | 45-55% | >60% |
| D7 | <8% | 12-18% | 20-28% | >35% |
| D30 | <2% | 4-6% | 8-12% | >15% |
| D90 | <0.5% | 1-2% | 3-5% | >7% |

### Session Metrics
| Metric | Casual | Mid-core | Hardcore |
|--------|--------|----------|----------|
| Session Length | 5-10 min | 15-30 min | 45+ min |
| Sessions/Day | 3-5 | 2-3 | 1-2 |
| Time to Churn | 3 days | 7 days | 14 days |

### Engagement Loops
```
CORE LOOP (per session):
Play → Reward → Progress → Play

META LOOP (across sessions):
Session → Daily Reward → Weekly Goal → Season Progress

SOCIAL LOOP:
Play → Compare → Compete → Share → Recruit → Play
```

---

## 🧠 Game Psychology Principles

### Flow State (Csikszentmihalyi)
```
HIGH CHALLENGE + LOW SKILL = Anxiety 😰
LOW CHALLENGE + HIGH SKILL = Boredom 😴
MATCHED CHALLENGE + SKILL = Flow 🎯

IMPLEMENTATION:
- Dynamic difficulty adjustment
- Clear goals at each level
- Immediate feedback
- Remove distractions
```

### Dopamine Mechanics
| Trigger | Implementation | Retention Impact |
|---------|----------------|------------------|
| Variable Rewards | Random power-up spawns | +20-30% |
| Completion | Level clear screen | +15-25% |
| Collection | Pellet counter, achievements | +10-20% |
| Social Proof | Leaderboards, "X playing now" | +15-25% |
| Progress | XP bar, unlock system | +25-35% |

### Loss Aversion
```
RULE: Losses feel 2x stronger than equivalent gains

APPLICATIONS:
- Daily login streaks (fear of losing streak)
- Limited-time events (fear of missing out)
- Rank systems (fear of demotion)
- Energy systems (fear of wasted energy)

ETHICAL LIMITS:
- Never punish for not playing
- Allow streak recovery
- No real money loss mechanics
```

---

## 🎮 Onboarding Best Practices

### FTUE (First Time User Experience)
```
MINUTE 0-1: "Wow moment" - show the best of the game
MINUTE 1-3: Core mechanic tutorial (move + collect)
MINUTE 3-5: First victory (easy first level)
MINUTE 5-10: Discovery phase (explore features)
MINUTE 10+: First session hook (daily reward, next goal)
```

### Tutorial Design Principles
| Principle | Bad Example | Good Example |
|-----------|-------------|--------------|
| Show Don't Tell | "Press WASD to move" | Animated hand shows controls |
| Learn by Doing | Text wall of instructions | Interactive practice |
| One Thing at Time | All controls at once | Movement → Collect → Avoid |
| Skip Option | No skip | Skip for returning players |
| Contextual Help | Help menu buried | Tooltip on first encounter |

### Tutorial Completion Rates
| Tutorial Length | Completion | Recommendation |
|-----------------|------------|----------------|
| <30 seconds | 95% | Basic games |
| 30s - 2 min | 80% | Casual games |
| 2-5 min | 60% | Mid-core games |
| 5-10 min | 40% | Complex games |
| >10 min | 20% | RPGs only |

---

## 📱 Mobile UX Standards

### Touch Target Sizes
| Element | Minimum | Recommended | Optimal |
|---------|---------|-------------|---------|
| Buttons | 44×44 px | 48×48 px | 56×56 px |
| Icons | 24×24 px | 32×32 px | 40×40 px |
| Spacing | 8 px | 12 px | 16 px |

### Gesture Guidelines
| Gesture | Use For | Notes |
|---------|---------|-------|
| Tap | Primary action | Most common |
| Swipe | Navigation | Left/right, up/down |
| Long Press | Secondary action | Add delay indicator |
| Pinch | Zoom | Optional for games |
| Double Tap | Quick action | Avoid conflict with single tap |

### Thumb Zone (Phone)
```
┌─────────────────┐
│    HARD TO      │  ← Notifications, info
│    REACH        │
├─────────────────┤
│   STRETCH       │  ← Secondary actions
│   ZONE          │
├─────────────────┤
│   COMFORT       │  ← Primary actions
│   ZONE          │  ← Most used buttons here
└─────────────────┘
     [thumb]
```

---

## 🏆 Progression Systems

### XP & Leveling
```javascript
// Standard XP curve (feels fair)
const xpForLevel = (level) => Math.floor(100 * Math.pow(1.5, level - 1));

// Level 1: 100 XP
// Level 2: 150 XP
// Level 5: 506 XP
// Level 10: 3,844 XP
// Level 20: 145,426 XP

// Session-based XP (keeps players engaged)
const XP_SOURCES = {
    pelletCollected: 1,
    powerUpUsed: 5,
    chaserCaught: 10,
    levelComplete: 50,
    perfectLevel: 100,
    dailyLogin: 25,
    weeklyChallenge: 200
};
```

### Unlock Timing
| Session | Unlock | Purpose |
|---------|--------|---------|
| 1 | Core game | Establish loop |
| 2 | Daily rewards | Create habit |
| 3 | First cosmetic | Show customization |
| 5 | Leaderboards | Add competition |
| 7 | Challenges | Add goals |
| 10 | Social features | Add community |
| 14 | Premium content | First IAP prompt |

### Achievement Design
```
TYPES:
- Progress: "Collect 100 pellets" (incremental)
- Skill: "Complete level without damage" (challenge)
- Discovery: "Find secret area" (exploration)
- Social: "Play with 5 friends" (viral)

DIFFICULTY MIX:
- 40% Easy (most players unlock)
- 35% Medium (engaged players unlock)
- 20% Hard (dedicated players unlock)
- 5% Impossible (bragging rights)
```

---

## 🔔 Notification Strategy

### Push Notification Types
| Type | Timing | Open Rate |
|------|--------|-----------|
| Daily Reward | 9 AM local | 15-25% |
| Event Start | Real-time | 20-30% |
| Friend Activity | Real-time | 25-35% |
| Win Back | D3, D7, D14 | 5-15% |
| Progress Reminder | Evening | 10-20% |

### Notification Best Practices
```
✅ DO:
- Personalize with player name
- Include specific value ("Your daily 100 coins!")
- Use emojis for visibility
- Time for player's timezone
- Limit to 1-2 per day

❌ DON'T:
- Send generic messages
- Notify about nothing important
- Send at night (quiet hours)
- Spam daily (causes opt-out)
- Use clickbait/dark patterns
```

---

## 👴 Accessibility Guidelines

### Visual Accessibility
| Issue | Solution |
|-------|----------|
| Color blindness | Icons + colors, patterns |
| Low vision | Scalable UI, high contrast |
| Motion sensitivity | Reduce animation option |
| Photosensitivity | No rapid flashing |

### Cognitive Accessibility
| Issue | Solution |
|-------|----------|
| Reading difficulty | Icons, audio cues |
| Memory issues | Clear current objectives |
| Attention | Minimal distractions |
| Processing speed | Pause option, speed settings |

### Motor Accessibility
| Issue | Solution |
|-------|----------|
| Limited mobility | One-hand mode |
| Tremor | Larger touch targets |
| Fatigue | Auto-save, short sessions |
| Timing issues | Adjustable difficulty |

### Senior-Friendly Design (60+)
```css
.senior-mode {
    --font-size-base: 18px;     /* Larger text */
    --button-size: 56px;         /* Bigger buttons */
    --contrast-ratio: 7:1;       /* Higher contrast */
    --animation-speed: 1.5;      /* Slower animations */
    --haptic-feedback: strong;   /* Clearer feedback */
}
```

---

## 📈 Retention Improvement Tactics

### Day 1 Retention
| Tactic | Impact | Effort |
|--------|--------|--------|
| Faster FTUE | +10-20% | Low |
| Early reward | +5-15% | Low |
| Push notification permission | +5-10% | Low |
| Daily reward preview | +10-15% | Medium |

### Day 7 Retention
| Tactic | Impact | Effort |
|--------|--------|--------|
| Login streak | +15-25% | Medium |
| Weekly challenges | +10-20% | Medium |
| Social features | +20-30% | High |
| New content drop | +15-25% | High |

### Day 30 Retention
| Tactic | Impact | Effort |
|--------|--------|--------|
| Battle pass | +30-50% | High |
| Ranked mode | +20-30% | High |
| Seasonal events | +25-40% | High |
| Guild/clan system | +35-50% | Very High |

---

## 🔬 A/B Testing Framework

### Test Prioritization
```
IMPACT × CONFIDENCE / EFFORT = PRIORITY SCORE

Example:
- Daily reward popup timing
  Impact: 8 (affects D1)
  Confidence: 6 (some data)
  Effort: 2 (easy change)
  Score: 24 ← Test this first!

- Complete UI overhaul
  Impact: 9 (affects everything)
  Confidence: 4 (uncertain)
  Effort: 9 (huge work)
  Score: 4 ← Low priority
```

### Key Metrics to Track
```javascript
const CORE_METRICS = {
    // Engagement
    DAU: 'Daily Active Users',
    MAU: 'Monthly Active Users',
    DAU_MAU: 'Stickiness ratio',
    
    // Retention
    D1: 'Day 1 retention',
    D7: 'Day 7 retention',
    D30: 'Day 30 retention',
    
    // Monetization
    ARPU: 'Avg Revenue Per User',
    ARPPU: 'Avg Revenue Per Paying User',
    ConversionRate: 'Free to paid %',
    
    // Session
    AvgSessionLength: 'Minutes per session',
    SessionsPerDay: 'Sessions per DAU',
    SessionInterval: 'Time between sessions'
};
```

---

## 📚 Psychology References

### Key Books
- "Hooked" by Nir Eyal (habit formation)
- "Flow" by Csikszentmihalyi (engagement)
- "Don't Make Me Think" by Steve Krug (usability)
- "The Art of Game Design" by Jesse Schell (game UX)

### Key Frameworks
- Octalysis (gamification)
- BJ Fogg Behavior Model (motivation)
- Jobs To Be Done (player needs)
- Player Personas (segmentation)

---

*Last Updated: December 2024*
*For use by AI testers - reduces token usage for UX research*
