# UX Patterns

*User experience best practices for mobile/casual games*

## Onboarding (FTUE - First Time User Experience)

### Best Practices
1. **Show, don't tell** - Interactive tutorial over text
2. **Progressive disclosure** - Reveal features gradually
3. **Quick to fun** - First gameplay within 30 seconds
4. **Skip option** - Always allow experienced players to skip

### MazeChase Onboarding Flow
```
1. Logo + "Tap to start" (2s max)
2. Immediately drop into tutorial level
3. "Swipe to move" - guided with arrow
4. First coin (instant reward)
5. First ghost encounter (learn danger)
6. Complete level → celebration
7. Main menu unlocked
```

### Metrics to Track
- **FTUE completion rate:** Target 85%+
- **Time to first game:** Target <30s
- **Tutorial skip rate:** Monitor but don't penalize

## Session Design

### Optimal Session Length
- **Casual:** 2-5 minutes per session
- **Core loop:** 30-90 seconds per game
- **Natural break points:** After each level

### Session Flow
```
Open App → Quick Resume → Core Gameplay → Reward → Loop/Exit
```

## Retention Mechanics

### Daily Engagement
1. **Daily rewards** - Escalating 7-day calendar
2. **Daily challenge** - Unique goal each day
3. **Push notifications** - Max 2/day, personalized

### Long-term Hooks
1. **Collection progress** - Skins, characters
2. **Skill-based ranking** - Weekly leaderboards
3. **Social features** - Friends, guilds

## Friction Points to Avoid

❌ Mandatory account creation at start
❌ Long loading screens without feedback
❌ Unexplained deaths/failures
❌ Currency confusion (too many types)
❌ Unskippable animations

## Feedback Loops

### Immediate Feedback (0-100ms)
- Button press → visual + haptic
- Coin collect → sound + particle
- Damage → screen shake + flash

### Short-term Feedback (1-10s)
- Level complete → score tally + stars
- Achievement unlock → notification
- Power-up active → visual indicator

### Long-term Feedback (session+)
- Progress bar to next unlock
- Rank changes after game
- Statistics summary

## Mobile-Specific UX

### Touch Targets
- Minimum: 44x44 points
- Comfortable: 48x48 points
- Spacing: 8px between targets

### Safe Areas
- Account for notch/dynamic island
- Bottom bar height: 34px on modern iPhones
- Side margins: 16px minimum

### Gestures
| Gesture | Action |
|---------|--------|
| Tap | Select/confirm |
| Swipe | Navigate/move |
| Long press | Secondary action |
| Pinch | Zoom (if applicable) |

## Extracted Insights

*Auto-updated from AI evaluations and implementations*
