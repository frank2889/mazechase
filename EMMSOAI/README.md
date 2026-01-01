# EMMSOAI

**P**latform for **I**ntelligent **R**eview, **E**valuation, **T**esting & **S**elf-improvement

A self-improving AI system that evaluates software projects, generates actionable recommendations, and implements changes—all while learning from each iteration.

## 🎯 What is EMMSOAI?

EMMSOAI is an autonomous AI development assistant that:

1. **Evaluates** your project through multiple AI personas (players, experts)
2. **Generates** concrete, actionable recommendations with code
3. **Implements** approved changes with expert review
4. **Learns** from each cycle, building domain knowledge in research files
5. **Improves** its own prompts and processes over time

## 📁 Folder Structure

```text
EMMSOAI/
├── ai-game-testers.js      # Main evaluation engine (14 AI personas)
├── ai-auto-implementer.js  # Auto-implementation with expert review
├── emmsoai.config.json      # Project configuration
├── package.json            # Dependencies
├── in/                     # Implementation logs (what was done)
├── out/                    # Evaluation outputs (what to do)
└── research/               # Domain knowledge (accumulated learning)
    ├── animation-principles.md
    ├── audio-design.md
    ├── competitor-analysis.md
    ├── market-data.md
    ├── monetization-patterns.md
    ├── technical-guidelines.md
    ├── ux-patterns.md
    ├── visual-style.md
    └── ... (auto-expands based on needs)
```

## 🔄 The Learning Loop

```text
┌─────────────────────────────────────────────────────────┐
│                     EMMSOAI LOOP                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. EVALUATE (ai-game-testers.js)                     │
│      ├── 5 Player personas test gameplay                │
│      ├── 8 Expert personas analyze domains              │
│      └── Sofia synthesizes into priorities              │
│                         ↓                               │
│   2. OUTPUT (out/evaluation-TIMESTAMP.json)            │
│      └── Concrete code changes, priorities, scores      │
│                         ↓                               │
│   3. IMPLEMENT (ai-auto-implementer.js)                │
│      ├── Expert review (not blindly accepting!)        │
│      ├── GPT-4 code generation                          │
│      └── Validation & rollback capability               │
│                         ↓                               │
│   4. LOG (in/implementation-TIMESTAMP.json)            │
│      └── What was implemented, by whom, outcomes        │
│                         ↓                               │
│   5. LEARN (research/*.md)                             │
│      ├── Extract repeated knowledge                     │
│      ├── Update domain expertise                        │
│      └── Optimize prompts based on patterns             │
│                         ↓                               │
│                    LOOP BACK TO 1                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
export OPENAI_API_KEY="your-key"

# Run evaluation
npm test

# View recommendations
npm run implement:list

# Auto-implement top 3 priorities
npm run implement:auto

# Extract knowledge from evaluations
npm run extract-knowledge
```

## 🤖 AI Personas

### Players (Test Gameplay)

| Name | Type | Focus |
| ---- | ---- | ----- |
| Jake | Casual | Fun, simplicity, quick sessions |
| Maria | Competitive | Challenge, rankings, skill |
| Tyler | Social | Friends, sharing, multiplayer |
| Priya | Collector | Completionism, achievements |
| Leo | Speedrunner | Optimization, exploits, records |

### Experts (Domain Analysis)

| Name | Role | Expertise |
| ---- | ---- | --------- |
| Marcus | Monetization | F2P ethics, ARPU, conversion |
| Elena | Performance | FPS, memory, mobile optimization |
| Kenji | Audio | Sound design, spatial audio, music |
| David | UX | Onboarding, retention, engagement |
| Ava | Animation | Disney principles, Babylon.js |
| Ravi | Code Quality | Architecture, maintainability |
| Yuki | Visual | Art direction, Kurzgesagt style |
| Chen | Security | Exploits, validation, anti-cheat |

### Director

| Name | Role | Function |
| ---- | ---- | -------- |
| Sofia | Brand Director | Final synthesis, prioritization |

## 📊 Self-Improvement Features

### Knowledge Extraction

When AI personas mention the same concepts 2+ times across evaluations, EMMSOAI extracts this knowledge to research files. This:

- **Saves tokens** (don't repeat in every prompt)
- **Builds consensus** from facts, not opinions
- **Creates reusable** domain expertise

### Prompt Optimization

EMMSOAI tracks:

- Token usage per prompt type
- Result quality scores
- Patterns in successful prompts

Use `npm run optimize-prompts` to see suggestions.

## 🔧 Adapting to Other Projects

Edit `emmsoai.config.json`:

```json
{
  "currentProject": {
    "name": "YourProject",
    "path": "..",
    "type": "web-app",
    "stack": {
      "frontend": "React/Next.js",
      "backend": "Python/FastAPI"
    }
  }
}
```

The research files and personas can be customized per project type.

## 📜 License

ISC - Use freely, improve continuously.
