# 🔄 AI Tester Workflow

## Mapstructuur

```text
tests/
├── in/                              # INPUT: Implementation logs (JSON)
│   └── implementation-*.json        # Wat is geïmplementeerd
│
├── out/                             # OUTPUT: AI evaluaties (JSON)
│   ├── evaluation-*.json            # Gedetailleerde actionable items
│   ├── ai-test-*.json               # Ruwe test resultaten
│   └── plan-*.md                    # Prioriteitenlijst
│
├── ai-game-testers.js               # De AI tester
└── README-WORKFLOW.md               # Dit bestand
```

## De Loop

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   1. RUN AI TESTERS                                         │
│      node ai-game-testers.js                                │
│                ↓                                            │
│   2. OUTPUT → out/evaluation-TIMESTAMP.json                 │
│      - Bevat actionable items                               │
│      - Per-tester feedback                                  │
│      - Prioriteiten                                         │
│                ↓                                            │
│   3. IMPLEMENTEER                                           │
│      - Lees out/evaluation-*.json                           │
│      - Voer taken uit                                       │
│                ↓                                            │
│   4. LOG → in/implementation-TIMESTAMP.json                 │
│      - Documenteer wat is gedaan (JSON)                     │
│      - Welke bestanden gewijzigd                            │
│      - Wat nog open staat                                   │
│                ↓                                            │
│   5. AI LEEST in/*.json                                     │
│      - Voorkomt dubbele suggesties                          │
│      - Kent context van vorige implementaties               │
│                ↓                                            │
│   └──────────── TERUG NAAR 1 ────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Commando's

```bash
# Run AI testers
cd tests && node ai-game-testers.js

# Run met auto-implementatie (experimenteel)
node ai-game-testers.js --implement

# Alleen experts
node ai-game-testers.js --experts-only

# Alleen spelers
node ai-game-testers.js --players-only

# Snel (cached observations)
node ai-game-testers.js --fast
```

## JSON Formats

### in/implementation-*.json (INPUT)

Maak een bestand in `in/` met dit format:

```json
{
  "metadata": {
    "type": "implementation_log",
    "timestamp": "2025-12-30T17:11:00Z",
    "source": "evaluation-2025-12-30_09-27.json"
  },
  "summary": {
    "totalTasks": 5,
    "completed": 4,
    "skipped": 1
  },
  "tasks": [
    {
      "id": "audio-ambiance",
      "name": "Add Ambiance Audio System",
      "status": "completed",
      "files": [
        "ui-web/src/lib/game/audio.ts"
      ],
      "changes": [
        "Added startAmbiance() method",
        "Added stopAmbiance() method",
        "Added 'ambiance' to audio types"
      ]
    },
    {
      "id": "large-text-mode",
      "name": "Large Text Accessibility Mode",
      "status": "completed",
      "files": [
        "ui-web/src/styles/accessibility.css"
      ],
      "changes": [
        "Added .large-text class",
        "25% larger fonts for seniors",
        "56px minimum touch targets"
      ]
    },
    {
      "id": "some-skipped-task",
      "name": "Already Implemented Feature",
      "status": "skipped",
      "reason": "Already exists in codebase"
    }
  ],
  "nextActions": [
    {
      "id": "create-ambiance-wav",
      "description": "Create /audio/ambiance.wav file",
      "priority": "high"
    },
    {
      "id": "settings-ui-toggle",
      "description": "Add settings UI toggle for large-text mode",
      "priority": "medium"
    }
  ]
}
```

### out/evaluation-*.json (OUTPUT)

De AI tester genereert:

```json
{
  "metadata": {
    "timestamp": "2025-12-30T09:27:00Z",
    "version": "4.2",
    "totalTesters": 14,
    "averageScore": 7.9,
    "testRun": "ai-test-2025-12-30_09-27.json"
  },
  "workflow": {
    "nextStep": "Implementeer en log in tests/in/",
    "inputFormat": "implementation-YYYY-MM-DD_HH-mm.json",
    "inputDir": "tests/in/",
    "outputDir": "tests/out/"
  },
  "prioritizedSuggestions": [
    {
      "rank": 1,
      "category": "audio",
      "suggestion": "Add background ambiance music",
      "suggestedBy": ["Emma", "Marcus"],
      "impact": "high"
    },
    {
      "rank": 2,
      "category": "accessibility",
      "suggestion": "Large text mode for seniors",
      "suggestedBy": ["Grandma Mei"],
      "impact": "medium"
    }
  ],
  "perTester": [
    {
      "name": "Emma",
      "role": "Audio Designer",
      "score": 8.5,
      "mainFeedback": "Audio needs more ambient sounds",
      "suggestions": [
        "Add themed background music per level",
        "Spatial audio for ghost proximity"
      ]
    }
  ]
}
```

## Status Values

Voor `tasks[].status`:

- `"completed"` - Taak is volledig afgerond
- `"skipped"` - Taak overgeslagen (al geïmplementeerd, niet nodig, etc.)
- `"partial"` - Gedeeltelijk geïmplementeerd

Voor `nextActions[].priority`:

- `"high"` - Kritiek voor volgende release
- `"medium"` - Belangrijk maar niet urgent
- `"low"` - Nice to have

## Belangrijke Notes

- AI testers lezen `in/implementation-*.json` om dubbele suggesties te voorkomen
- Maximum 3 meest recente logs worden geladen voor context
- Alle timestamps gebruiken ISO 8601 format
- Bestandsnamen: `implementation-YYYY-MM-DD_HH-mm.json`
