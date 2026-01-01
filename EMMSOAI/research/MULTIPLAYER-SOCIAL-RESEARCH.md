# 👥 Multiplayer & Social Dynamics Research - Competitive/Cooperative Games 2024-2025

## Executive Summary
Dit document bevat onderzoek over multiplayer psychologie, sociale dynamiek, en community building.
Sociale features zijn de #1 driver voor long-term retention in multiplayer games.

---

## 🧠 Social Psychology in Games

### Social Facilitation Theory
```
PEOPLE PERFORM DIFFERENTLY WHEN OBSERVED

SIMPLE TASKS: Performance IMPROVES with audience
- Collecting pellets: faster with spectators
- Basic movement: more precise under pressure

COMPLEX TASKS: Performance DECREASES with audience
- Strategic decisions: worse under pressure
- New mechanics: harder to learn publicly

GAME DESIGN IMPLICATIONS:
- Tutorial/learning: Private or with supportive AI
- Skill display: Public for mastery moments
- Ranked matches: Pressure is part of the challenge
- Casual modes: Lower social pressure
```

### Social Comparison Theory (Festinger)
```
WE EVALUATE OURSELVES BY COMPARING TO OTHERS

UPWARD COMPARISON (vs better players):
- Creates motivation ("I can be that good")
- Can cause discouragement if gap too large
- Best when gap is aspirational, not hopeless

DOWNWARD COMPARISON (vs worse players):
- Creates confidence ("I'm doing well")
- Can reduce motivation if no challenge
- Best for recovering from losses

GAME DESIGN:
- Show players SLIGHTLY above (motivation)
- Show players SLIGHTLY below (confidence)
- Avoid showing top 0.1% to new players
- Rank display: Show achievable next rank
```

### Dunbar's Number in Gaming
```
LAYERS OF SOCIAL RELATIONSHIPS:

5 - Intimate Friends (squad/party regulars)
15 - Close Friends (frequent teammates)
50 - Good Friends (recognize, chat with)
150 - Casual Friends (nodding acquaintances)
500 - Acquaintances (seen before)
1500 - Recognizable (know the name)

GAME SOCIAL FEATURES:
5: Party/squad system (voice chat)
15: Friends list core
50: Clan/guild active
150: Total friends list
500: Follower count
1500: Leaderboard recognition

DESIGN IMPLICATION:
Focus features on the 5-15 layer!
Deep relationships > wide networks
```

### Parasocial Relationships
```
ONE-SIDED RELATIONSHIPS WITH PERSONAS

APPLIES TO:
- Streamers playing your game
- In-game NPCs/characters
- AI companions
- Developer personas

LEVERAGE:
- Character backstories create attachment
- Streamer integration features
- Developer "face" in updates
- Community managers as personas

MAZECHASE OPPORTUNITY:
- Named chaser characters with personality
- Seasonal "host" character for events
- Developer mascot in announcements
```

---

## 🏆 Competitive Systems

### ELO/MMR System Design
```
MATCHMAKING FUNDAMENTALS:

BASIC ELO:
New_Rating = Old_Rating + K × (Actual - Expected)
- K-factor: How much each game matters (16-32 typical)
- Actual: 1 for win, 0 for loss, 0.5 for draw
- Expected: Probability based on rating difference

PLACEMENT MATCHES:
- 5-10 initial games with high K-factor
- Fast convergence to skill level
- Reduces frustrating mismatches early

SKILL DECAY:
- Inactivity reduces displayed rank
- Hidden MMR may stay stable
- Encourages continued play

VOLATILITY:
- New/returning players: Higher K (faster adjustment)
- Established players: Lower K (stability)
- Winning/losing streaks: Temporary K boost
```

### Rank Tier Design
```
OPTIMAL TIER STRUCTURE:

BRONZE → SILVER → GOLD → PLATINUM → DIAMOND → MASTER → LEGEND

POPULATION DISTRIBUTION (target):
- Bronze: 15%
- Silver: 25%
- Gold: 30%
- Platinum: 18%
- Diamond: 8%
- Master: 3%
- Legend: 1%

DESIGN PRINCIPLES:
- Entry rank feels achievable (Silver)
- Middle ranks are populous (Gold cluster)
- Top ranks are exclusive (flex value)
- Each rank has visual distinction

SUBDIVISION:
- 3-5 divisions per tier (Gold III → Gold II → Gold I)
- Small wins feel like progress
- Demotion protection at tier boundaries
```

### Leaderboard Psychology
```
LEADERBOARD TYPES:

GLOBAL:
- Intimidating for new players
- Whale/grinder dominated
- Good for spectacle, bad for motivation

FRIENDS:
- Highly motivating
- Social pressure to play
- Works with small friend groups
- Most effective retention driver

REGIONAL/LOCAL:
- More achievable "top" position
- Cultural relevance
- Moderate motivation

TIME-BOXED (Weekly/Seasonal):
- Fresh starts
- Reduces permanent stratification
- Encourages return

PERCENTILE:
- "Top 10% of players"
- Achievable for many
- Less intimidating than position

BEST PRACTICE:
Default to FRIENDS leaderboard
Show percentile, not global rank
Weekly reset leaderboards for engagement
```

### Anti-Frustration Mechanics
```
RANKED GAME PROTECTION:

LOSS STREAK PROTECTION:
- After 3 losses: Reduced point loss
- After 5 losses: Suggest break / casual mode
- Hidden: Slightly easier opponents

WIN STREAK CAUTION:
- After 3 wins: Normal points
- After 5 wins: Slightly harder opponents
- Prevents "smurf feel" for opponents

DEMOTION PROTECTION:
- Can't demote on first loss at new tier
- 3-game buffer at tier floor
- Makes promotions feel earned

COMEBACK MECHANICS:
- Bonus points for beating higher-ranked
- "Hot streak" visual celebration
- Underdog bonus (lower rank beats higher)
```

---

## 🤝 Cooperative Systems

### Cooperation Psychology
```
WHY PEOPLE COOPERATE:

1. RECIPROCITY
   "They helped me, I'll help them"
   Design: Visible assistance tracking

2. REPUTATION
   "Others will see I'm helpful"
   Design: Public helper badges

3. GROUP IDENTITY
   "We're on the same team"
   Design: Team colors, shared goals

4. SHARED FATE
   "We win/lose together"
   Design: Team scoring, group rewards

5. COMMUNICATION
   "We can coordinate"
   Design: Ping systems, quick chat
```

### Team Formation
```
TEAM SIZE PSYCHOLOGY:

2 PLAYERS (Duo):
- Intimate, high pressure
- Blame is direct
- Communication easy
- Best for: Close friends

3 PLAYERS (Trio):
- Coalition dynamics
- 2v1 potential
- Odd numbers = no ties
- Best for: Small friend groups

4 PLAYERS (Squad):
- Balanced, popular
- Room for specialists
- 2v2 sub-teams possible
- Best for: Versatile play

5+ PLAYERS:
- Communication overhead
- Coordination challenges
- Spectator-like members
- Best for: Casual, chaotic fun

MAZECHASE TEAM MODES:
- Duo: "Buddy Escape" (must both escape)
- Squad: "Team Chase" (2v2 hunters vs runners)
- Party: "Chaos Mode" (8 player free-for-all)
```

### Voice Chat Considerations
```
VOICE CHAT TRADE-OFFS:

PROS:
- Faster coordination
- Social bonding
- Competitive advantage

CONS:
- Toxicity vector
- Barrier for introverts
- Language barriers
- Age safety concerns

ALTERNATIVES:
- Ping system (Apex-style)
- Quick chat wheel
- Emoji reactions
- Contextual callouts

IMPLEMENTATION:
- Party-only voice by default
- Opt-in for open voice
- Report/mute single button
- No voice in ranked (or separate queue)
```

---

## 🎪 Social Features Design

### Friends System
```
CORE FEATURES:

ADD FRIENDS:
- Post-match "Add Friend" prompt
- Username search
- QR code/link sharing
- Platform integration (Steam, Discord)

FRIEND STATUS:
- Online/Offline/In-Game
- Currently in match (spectate option)
- Accepting invites or not
- "Looking for Group"

FRIEND ACTIVITY:
- "X just won a match"
- "X unlocked new skin"
- "X reached Gold rank"
- Creates social proof, FOMO

FRIEND COMPARISON:
- Weekly stats comparison
- Achievement race
- Collection comparison
- "Friend scored higher" notification
```

### Party System
```
PARTY FEATURES:

CREATION:
- One-click invite friends
- Party code sharing
- QR code for in-person
- Discord integration

PARTY LOBBY:
- Voice/text chat
- Ready up system
- Character selection visible
- Party leader controls queue

MATCHMAKING:
- Party vs Party preferred
- Mixed party fills
- Party MMR averaging
- Unfair stomp protection

PARTY BONUSES:
- +10% XP when in party
- Party-exclusive challenges
- Group achievement tracking
- "Play with friends" rewards
```

### Guilds/Clans
```
GUILD STRUCTURE:

TIERS:
- 5 members: Squad
- 25 members: Clan
- 100 members: Guild
- 500 members: Alliance

FEATURES BY SIZE:
Squad: Private chat, shared stats
Clan: Custom tag, emblem, rankings
Guild: Seasonal competitions, events
Alliance: Cross-guild events, war

GUILD ACTIVITIES:
- Weekly challenges (collective goals)
- Guild leaderboards
- Guild vs Guild matches
- Shared unlocks
- Member progression tracking

GUILD GOVERNANCE:
- Leader, Officers, Members roles
- Promote/demote/kick permissions
- Application system
- Activity requirements
```

### Spectator Mode
```
SPECTATOR FEATURES:

FRIEND SPECTATING:
- Watch friends live
- Free camera or follow player
- Stats overlay
- Delay for competitive integrity (30s-2min)

BROADCASTING:
- Streamer mode (hide usernames)
- Overlay API for OBS
- Highlight capture
- Instant replay

ESPORTS:
- Commentator tools
- Multi-camera switching
- Stats dashboard
- Production features
```

---

## 🛡️ Anti-Toxicity Measures

### Toxicity Types & Solutions
```
CHAT TOXICITY:
- Profanity filter (smart, not blocking "class")
- Report system
- AI-powered detection
- Chat rate limiting

GAMEPLAY TOXICITY:
- AFK detection
- Intentional feeding detection
- Team killing (if applicable)
- Griefing patterns

CONSEQUENCES:
- Warning
- Chat mute (1hr → 24hr → 7d)
- Ranked ban
- Game ban (temporary → permanent)

REFORM:
- Good behavior rewards
- Toxicity score decay
- "Reformed" visible status
- Second chance system
```

### Positive Reinforcement
```
REWARDING GOOD BEHAVIOR:

COMMENDATION SYSTEM:
- "Good Teammate" button post-match
- "Friendly" commend
- "Skilled Player" commend
- "Fun to Play With" commend

HONOR REWARDS:
- Special cosmetics for high honor
- Queue priority
- Beta access
- Profile flair

ANTI-ABUSE:
- Can't commend party members
- Rate limited
- Weight by commender's honor
- Suspicious pattern detection
```

---

## 📊 Social Metrics

### Key Social KPIs
```
SOCIAL ENGAGEMENT:
- % players with friends added
- Average friend list size
- % matches played with friends
- Party size distribution

RETENTION CORRELATION:
Friends added Day 1 → D7 retention +40%
Played with friend D1 → D7 retention +60%
In active guild → D30 retention +80%

SOCIAL FEATURES USAGE:
- Friend invites sent/accepted ratio
- Party creation rate
- Voice chat adoption
- Spectator usage
```

### A/B Test Ideas
```
SOCIAL EXPERIMENTS:

1. Post-match "Add Friend" prompt position
2. Party XP bonus (0% vs 10% vs 25%)
3. Friend activity feed frequency
4. Voice chat default (on vs off)
5. Guild minimum size requirements
6. Commendation visibility
7. Leaderboard default (global vs friends)
```

---

## 🎯 MazeChase Social Opportunities

### Recommended Social Features
```
PHASE 1 (Launch):
- [ ] Friends list
- [ ] Party system (2-4 players)
- [ ] Post-match "Add Friend"
- [ ] Friends leaderboard
- [ ] Basic text chat

PHASE 2 (Month 2-3):
- [ ] Guilds/Clans
- [ ] Spectator mode
- [ ] Friend activity feed
- [ ] Commendation system

PHASE 3 (Month 4+):
- [ ] Voice chat (party only)
- [ ] Guild vs Guild events
- [ ] Streamer integration
- [ ] Esports foundation
```

### Unique Social Mechanics
```
MAZECHASE-SPECIFIC:

"TAG TEAM" MODE:
- 2v2, one runner one chaser per team
- Swap roles mid-match
- Requires coordination

"RELAY RACE":
- Team of 4, sequential maze runs
- Pass the "baton" (score)
- Combined time wins

"MENTOR MATCH":
- High rank + new player duo
- Mentor gets teaching rewards
- Mentee gets guidance

"REVENGE MODE":
- After loss, immediate rematch option
- Adds narrative, rivalry
- Tracks head-to-head record
```

---

## 📚 Sources & Further Reading

### Academic
- "Social Psychology" - Aronson, Wilson, Akert
- "Influence: The Psychology of Persuasion" - Cialdini
- "Reality Is Broken" - Jane McGonigal

### Industry
- GDC: "Building Strong Game Communities"
- GDC: "The Science of Social in Games"
- Riot Games: "Player Behavior" series
- Supercell: Community Building talks

### Data Sources
- Newzoo Social Gaming Report
- Discord Game Developer resources
- Twitch Developer insights

---

*Last Updated: December 2024*
*For use by AI testers - multiplayer & social expertise*
