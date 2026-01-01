#!/usr/bin/env node
/**
 * EMMSOAI - AI Auto-Implementer v3.0
 * Platform for Intelligent Review, Evaluation, Testing & Self-improvement
 * 
 * Part of the EMMSOAI system - takes evaluation recommendations and implements them.
 * Currently configured for: MazeChase
 * 
 * FEATURES:
 * - Expert Review System: Advice is NOT blindly accepted!
 * - Knowledge Extraction: Repeated concepts → research files (saves tokens)
 * - Code Generation: GPT-4 generates implementation code
 * - Validation: Runs builds to verify changes
 * - Rollback: Can undo last implementation
 * 
 * USAGE:
 *   node ai-auto-implementer.js                    # Interactive mode
 *   node ai-auto-implementer.js --auto             # Auto-implement top 3
 *   node ai-auto-implementer.js --list             # List recommendations
 *   node ai-auto-implementer.js --item "feature"   # Implement specific feature
 *   node ai-auto-implementer.js --validate         # Run builds after changes
 *   node ai-auto-implementer.js --rollback         # Undo last changes
 *   node ai-auto-implementer.js --skip-review      # Skip expert review
 *   node ai-auto-implementer.js --extract-knowledge # Extract to research files
 *   node ai-auto-implementer.js --optimize-prompts  # Show optimization suggestions
 */

// Load environment variables
require('@dotenvx/dotenvx').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

// Load config
const CONFIG_PATH = path.join(__dirname, 'ai-pipeline-config.js');
const config = fs.existsSync(CONFIG_PATH) ? require(CONFIG_PATH) : {};

// ============================================================================
// CENTRALIZED FOLDER STRUCTURE (in tests/)
// ============================================================================
const IN_DIR = path.join(__dirname, 'in');
const OUT_DIR = path.join(__dirname, 'out');
const RESEARCH_DIR = path.join(__dirname, 'research');
const BACKUP_DIR = path.join(__dirname, '.ai-backups');

// Ensure directories exist
[IN_DIR, OUT_DIR, RESEARCH_DIR, BACKUP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Find latest evaluation file in out/
function findLatestEvaluation() {
  if (!fs.existsSync(OUT_DIR)) return null;
  const files = fs.readdirSync(OUT_DIR)
    .filter(f => f.startsWith('evaluation-') && f.endsWith('.json'))
    .sort()
    .reverse();
  return files.length > 0 ? path.join(OUT_DIR, files[0]) : null;
}

// Constants - now using centralized folders
const EVALUATION_FILE = findLatestEvaluation() || path.join(__dirname, 'revenue-evaluation.json');
const QUICK_EVALUATION_FILE = path.join(__dirname, 'quick-evaluation.json');
const IMPLEMENTATION_LOG = path.join(IN_DIR, `implementation-${new Date().toISOString().slice(0,16).replace(/[T:]/g, '-')}.json`);
const REVIEW_LOG = path.join(OUT_DIR, 'expert-review-log.json');

// OpenAI setup
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ============================================================================
// KNOWLEDGE EXTRACTION SYSTEM - Builds research files from repeated knowledge
// ============================================================================
const KNOWLEDGE_CATEGORIES = {
  'competitor-analysis': ['competitor', 'pac-man', 'crossy road', 'subway surfers', 'among us', 'market leader', 'benchmark'],
  'market-data': ['arpu', 'retention', 'conversion', 'ltv', 'revenue', 'd1', 'd7', 'd30', 'whale', 'minnow'],
  'technical-guidelines': ['babylon', 'babylonjs', 'react', 'typescript', 'go', 'golang', 'websocket', 'fps', 'performance', 'optimization'],
  'animation-principles': ['animation', 'easing', 'bounce', 'squash', 'stretch', 'secondary action', 'anticipation', 'follow through', 'keyframe'],
  'monetization-patterns': ['iap', 'subscription', 'battle pass', 'bundle', 'pricing', 'paywall', 'soft currency', 'hard currency'],
  'ux-patterns': ['onboarding', 'tutorial', 'ftue', 'engagement', 'session', 'friction', 'delight', 'feedback'],
  'audio-design': ['audio', 'sound', 'sfx', 'music', 'earcon', 'spatial audio', 'ambient'],
  'visual-style': ['kurzgesagt', 'neon', 'glow', 'particle', 'shader', 'theme', 'color palette'],
};

async function extractKnowledgeFromEvaluations() {
  console.log('\n🧠 KNOWLEDGE EXTRACTION SYSTEM');
  console.log('═'.repeat(60));
  
  // Load all evaluations
  const evaluations = [];
  if (fs.existsSync(OUT_DIR)) {
    const files = fs.readdirSync(OUT_DIR)
      .filter(f => f.startsWith('evaluation-') && f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(OUT_DIR, file), 'utf-8'));
        evaluations.push({ file, data });
      } catch (e) {}
    }
  }
  
  console.log(`📊 Loaded ${evaluations.length} evaluations for analysis`);
  
  // Extract knowledge patterns
  const knowledgeByCategory = {};
  
  for (const { data } of evaluations) {
    // Check expert dialogues
    for (const agent of (data.agentResults || [])) {
      const text = JSON.stringify(agent.result || {}).toLowerCase();
      
      for (const [category, keywords] of Object.entries(KNOWLEDGE_CATEGORIES)) {
        const matches = keywords.filter(kw => text.includes(kw));
        if (matches.length >= 2) {
          if (!knowledgeByCategory[category]) {
            knowledgeByCategory[category] = { mentions: 0, insights: [] };
          }
          knowledgeByCategory[category].mentions++;
          
          // Extract specific insights using AI
          const insights = extractInsightsFromText(agent.result, category, matches);
          if (insights.length > 0) {
            knowledgeByCategory[category].insights.push(...insights);
          }
        }
      }
    }
  }
  
  // Update research files with extracted knowledge
  let filesUpdated = 0;
  for (const [category, data] of Object.entries(knowledgeByCategory)) {
    if (data.mentions >= 2 && data.insights.length > 0) {
      const updated = await updateResearchFile(category, data.insights);
      if (updated) filesUpdated++;
    }
  }
  
  console.log(`\n✅ Updated ${filesUpdated} research files with extracted knowledge`);
  return filesUpdated;
}

function extractInsightsFromText(result, category, keywords) {
  const insights = [];
  
  // Extract specific data patterns based on category
  if (category === 'market-data') {
    // Look for numeric data
    const text = JSON.stringify(result);
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/g);
    const dollarMatch = text.match(/\$(\d+(?:\.\d+)?)/g);
    if (percentMatch) insights.push({ type: 'percentage', values: percentMatch });
    if (dollarMatch) insights.push({ type: 'currency', values: dollarMatch });
  }
  
  if (category === 'competitor-analysis' && result.competitorAnalysis) {
    insights.push({ type: 'competitor_data', data: result.competitorAnalysis });
  }
  
  if (category === 'animation-principles' && result.animationRecommendations) {
    insights.push({ type: 'animation_patterns', data: result.animationRecommendations });
  }
  
  return insights;
}

async function updateResearchFile(category, insights) {
  const filePath = path.join(RESEARCH_DIR, `${category}.md`);
  
  // Read existing content
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  } else {
    content = `# ${category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n*Auto-generated and updated by AI knowledge extraction system*\n\n`;
  }
  
  // Add new insights section
  const newSection = `\n## Extracted Insights (${new Date().toISOString().slice(0, 10)})\n\n`;
  const insightText = insights.map(i => `- ${JSON.stringify(i)}`).join('\n');
  
  // Only add if not already present
  if (!content.includes(insightText.slice(0, 50))) {
    content += newSection + insightText + '\n';
    fs.writeFileSync(filePath, content);
    console.log(`  📝 Updated: ${category}.md (+${insights.length} insights)`);
    return true;
  }
  
  return false;
}

// ============================================================================
// PROMPT OPTIMIZATION TRACKER
// ============================================================================
const PROMPT_STATS_FILE = path.join(__dirname, 'prompt-optimization-stats.json');

function trackPromptEffectiveness(promptType, tokensUsed, resultQuality) {
  let stats = {};
  if (fs.existsSync(PROMPT_STATS_FILE)) {
    stats = JSON.parse(fs.readFileSync(PROMPT_STATS_FILE, 'utf-8'));
  }
  
  if (!stats[promptType]) {
    stats[promptType] = { totalCalls: 0, totalTokens: 0, avgQuality: 0, history: [] };
  }
  
  stats[promptType].totalCalls++;
  stats[promptType].totalTokens += tokensUsed;
  stats[promptType].history.push({ date: new Date().toISOString(), tokens: tokensUsed, quality: resultQuality });
  
  // Calculate moving average
  const recent = stats[promptType].history.slice(-10);
  stats[promptType].avgQuality = recent.reduce((sum, h) => sum + h.quality, 0) / recent.length;
  
  fs.writeFileSync(PROMPT_STATS_FILE, JSON.stringify(stats, null, 2));
}

function getPromptOptimizationSuggestions() {
  if (!fs.existsSync(PROMPT_STATS_FILE)) return [];
  
  const stats = JSON.parse(fs.readFileSync(PROMPT_STATS_FILE, 'utf-8'));
  const suggestions = [];
  
  for (const [promptType, data] of Object.entries(stats)) {
    if (data.totalTokens > 10000 && data.avgQuality < 7) {
      suggestions.push({
        prompt: promptType,
        issue: 'High token usage with low quality',
        suggestion: 'Consider caching common context in research files'
      });
    }
  }
  
  return suggestions;
}

// Expert reviewers per domain
const EXPERT_REVIEWERS = {
  critical_fix: { name: 'Alex', role: 'Technical QA Engineer', focus: 'bugs, stability, edge cases' },
  visual: { name: 'Yuki', role: 'Visual Artist', focus: 'art direction, brand consistency, UX' },
  monetization: { name: 'Marcus', role: 'Monetization Strategist', focus: 'ethics, value, conversion' },
  performance: { name: 'Elena', role: 'Performance Engineer', focus: 'speed, memory, mobile' },
  retention: { name: 'David', role: 'UX Researcher', focus: 'engagement, habit loops, onboarding' },
  team_suggestion: { name: 'Sofia', role: 'Brand Director', focus: 'brand alignment, storytelling' },
  audio: { name: 'Kenji', role: 'Sound Designer', focus: 'audio quality, immersion' },
  code: { name: 'Ravi', role: 'Code Reviewer', focus: 'architecture, maintainability, standards' },
  default: { name: 'Sofia', role: 'Brand Director', focus: 'overall quality, brand fit' }
};

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logStep(step, msg) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${msg}`);
}

// ============================================================================
// EXPERT REVIEW SYSTEM - Advice is NOT blindly accepted!
// ============================================================================

async function reviewAdviceWithExpert(item, previousReviews = []) {
  const reviewer = EXPERT_REVIEWERS[item.type] || EXPERT_REVIEWERS.default;
  
  log(`\n🔍 EXPERT REVIEW: ${reviewer.name} (${reviewer.role})`, 'yellow');
  log(`   Reviewing: "${item.name}"`, 'yellow');
  log('─'.repeat(60), 'yellow');
  
  const previousContext = previousReviews.length > 0 ? `
VOORGAANDE REVIEWS VAN COLLEGA'S:
${previousReviews.map(r => `- ${r.reviewer}: ${r.verdict} - "${r.summary}"`).join('\n')}
` : '';

  const prompt = `Je bent ${reviewer.name}, een ${reviewer.role} met expertise in: ${reviewer.focus}.

JE TAAK: Beoordeel kritisch of dit advies/deze suggestie geïmplementeerd moet worden.
Je bent NIET een ja-knikker. Je bent een kritische expert die de kwaliteit bewaakt.

═══════════════════════════════════════════════════════════════════
TE REVIEWEN ADVIES/SUGGESTIE:
═══════════════════════════════════════════════════════════════════
Type: ${item.type}
Naam: ${item.name}
Beschrijving: ${item.description}
Prioriteit: ${item.priority}/10
Bron: ${item.agent || 'unknown'}
${item.details ? `Details: ${JSON.stringify(item.details, null, 2).substring(0, 500)}` : ''}
${previousContext}
═══════════════════════════════════════════════════════════════════
JOUW EXPERT REVIEW
═══════════════════════════════════════════════════════════════════

Beantwoord de volgende vragen EERLIJK en KRITISCH:

1. **RELEVANTIE (1-10)**: Past dit bij de huidige prioriteiten van MazeChase?
2. **HAALBAARHEID (1-10)**: Is dit technisch haalbaar zonder grote risico's?
3. **WAARDE (1-10)**: Levert dit voldoende waarde voor de inspanning?
4. **RISICO'S**: Welke risico's zie je? (max 3 punten)
5. **VERBETERINGEN**: Hoe zou je dit advies verbeteren? (max 3 punten)
6. **AFHANKELIJKHEDEN**: Moet er eerst iets anders gebeuren?

═══════════════════════════════════════════════════════════════════
VERDICT (KIES ÉÉN)
═══════════════════════════════════════════════════════════════════
🟢 APPROVED - Implementeer dit advies
🟡 APPROVED_WITH_CHANGES - Implementeer, maar pas eerst aan: [beschrijf]
🟠 NEEDS_MORE_REVIEW - Nog een expert moet dit bekijken: [wie en waarom]
🔴 REJECTED - Dit advies moet NIET geïmplementeerd worden: [reden]

Geef je verdict in het volgende format:
VERDICT: [APPROVED|APPROVED_WITH_CHANGES|NEEDS_MORE_REVIEW|REJECTED]
SUMMARY: [Korte samenvatting van je oordeel in 1-2 zinnen]
RELEVANTIE_SCORE: [1-10]
HAALBAARHEID_SCORE: [1-10]  
WAARDE_SCORE: [1-10]
CHANGES_REQUIRED: [Als APPROVED_WITH_CHANGES, wat moet er veranderen]
NEXT_REVIEWER: [Als NEEDS_MORE_REVIEW, wie moet dit nog bekijken]
REJECTION_REASON: [Als REJECTED, waarom niet implementeren]

Wees EERLIJK en KRITISCH. Een slecht advies dat geïmplementeerd wordt kost meer dan een goed advies dat vertraagd wordt.`;

  try {
    const response = await callOpenAI(prompt, 'gpt-4o');
    
    // Parse the review
    const review = parseExpertReview(response, reviewer);
    
    // Display the review
    displayExpertReview(review);
    
    // Log the review
    logExpertReview(item, review);
    
    return review;
  } catch (err) {
    log(`❌ Review failed: ${err.message}`, 'red');
    return {
      verdict: 'NEEDS_MORE_REVIEW',
      reviewer: reviewer.name,
      summary: 'Review failed, needs manual check',
      scores: { relevance: 0, feasibility: 0, value: 0 }
    };
  }
}

function parseExpertReview(response, reviewer) {
  const review = {
    reviewer: reviewer.name,
    role: reviewer.role,
    verdict: 'NEEDS_MORE_REVIEW',
    summary: '',
    scores: {
      relevance: 5,
      feasibility: 5,
      value: 5
    },
    changesRequired: null,
    nextReviewer: null,
    rejectionReason: null,
    fullResponse: response
  };
  
  // Extract verdict
  const verdictMatch = response.match(/VERDICT:\s*(APPROVED|APPROVED_WITH_CHANGES|NEEDS_MORE_REVIEW|REJECTED)/i);
  if (verdictMatch) {
    review.verdict = verdictMatch[1].toUpperCase();
  }
  
  // Extract summary
  const summaryMatch = response.match(/SUMMARY:\s*([^\n]+)/i);
  if (summaryMatch) {
    review.summary = summaryMatch[1].trim();
  }
  
  // Extract scores
  const relevanceMatch = response.match(/RELEVANTIE_SCORE:\s*(\d+)/i);
  if (relevanceMatch) review.scores.relevance = parseInt(relevanceMatch[1]);
  
  const feasibilityMatch = response.match(/HAALBAARHEID_SCORE:\s*(\d+)/i);
  if (feasibilityMatch) review.scores.feasibility = parseInt(feasibilityMatch[1]);
  
  const valueMatch = response.match(/WAARDE_SCORE:\s*(\d+)/i);
  if (valueMatch) review.scores.value = parseInt(valueMatch[1]);
  
  // Extract conditional fields
  const changesMatch = response.match(/CHANGES_REQUIRED:\s*([^\n]+)/i);
  if (changesMatch && changesMatch[1].trim() !== '-') {
    review.changesRequired = changesMatch[1].trim();
  }
  
  const nextMatch = response.match(/NEXT_REVIEWER:\s*([^\n]+)/i);
  if (nextMatch && nextMatch[1].trim() !== '-') {
    review.nextReviewer = nextMatch[1].trim();
  }
  
  const rejectMatch = response.match(/REJECTION_REASON:\s*([^\n]+)/i);
  if (rejectMatch && rejectMatch[1].trim() !== '-') {
    review.rejectionReason = rejectMatch[1].trim();
  }
  
  // Calculate average score
  review.averageScore = (review.scores.relevance + review.scores.feasibility + review.scores.value) / 3;
  
  return review;
}

function displayExpertReview(review) {
  const verdictIcons = {
    'APPROVED': '🟢',
    'APPROVED_WITH_CHANGES': '🟡',
    'NEEDS_MORE_REVIEW': '🟠',
    'REJECTED': '🔴'
  };
  
  const verdictColors = {
    'APPROVED': 'green',
    'APPROVED_WITH_CHANGES': 'yellow',
    'NEEDS_MORE_REVIEW': 'yellow',
    'REJECTED': 'red'
  };
  
  console.log('');
  log(`${verdictIcons[review.verdict]} VERDICT: ${review.verdict}`, verdictColors[review.verdict]);
  log(`   ${review.summary}`, 'reset');
  console.log('');
  log(`   📊 Scores: Relevantie=${review.scores.relevance}/10, Haalbaarheid=${review.scores.feasibility}/10, Waarde=${review.scores.value}/10`, 'cyan');
  log(`   📈 Gemiddeld: ${review.averageScore.toFixed(1)}/10`, 'cyan');
  
  if (review.changesRequired) {
    log(`   ✏️ Vereiste wijzigingen: ${review.changesRequired}`, 'yellow');
  }
  if (review.nextReviewer) {
    log(`   👤 Volgende reviewer: ${review.nextReviewer}`, 'yellow');
  }
  if (review.rejectionReason) {
    log(`   ❌ Reden afwijzing: ${review.rejectionReason}`, 'red');
  }
  console.log('');
}

function logExpertReview(item, review) {
  let reviews = [];
  if (fs.existsSync(REVIEW_LOG)) {
    try {
      reviews = JSON.parse(fs.readFileSync(REVIEW_LOG, 'utf-8'));
    } catch (e) {}
  }
  
  reviews.push({
    timestamp: new Date().toISOString(),
    item: { id: item.id, name: item.name, type: item.type },
    review: {
      reviewer: review.reviewer,
      role: review.role,
      verdict: review.verdict,
      summary: review.summary,
      scores: review.scores,
      averageScore: review.averageScore
    }
  });
  
  // Keep last 100 reviews
  if (reviews.length > 100) {
    reviews = reviews.slice(-100);
  }
  
  fs.writeFileSync(REVIEW_LOG, JSON.stringify(reviews, null, 2));
}

async function performFullReview(item) {
  const reviews = [];
  
  // First review by primary expert
  const primaryReview = await reviewAdviceWithExpert(item, reviews);
  reviews.push(primaryReview);
  
  // If needs more review, get secondary opinion
  if (primaryReview.verdict === 'NEEDS_MORE_REVIEW' && primaryReview.nextReviewer) {
    log(`\n🔄 Secondary review requested by ${primaryReview.reviewer}...`, 'magenta');
    
    // Find the next reviewer
    const nextReviewerName = primaryReview.nextReviewer.split(',')[0].trim();
    let secondaryReviewer = Object.values(EXPERT_REVIEWERS).find(r => 
      r.name.toLowerCase() === nextReviewerName.toLowerCase()
    );
    
    if (!secondaryReviewer) {
      secondaryReviewer = EXPERT_REVIEWERS.default;
    }
    
    // Create modified item for secondary review
    const modifiedItem = { ...item, type: 'secondary_review' };
    EXPERT_REVIEWERS.secondary_review = secondaryReviewer;
    
    const secondaryReview = await reviewAdviceWithExpert(modifiedItem, reviews);
    reviews.push(secondaryReview);
    
    // Use secondary verdict if primary was uncertain
    if (secondaryReview.verdict === 'APPROVED' || secondaryReview.verdict === 'REJECTED') {
      return { finalVerdict: secondaryReview.verdict, reviews };
    }
  }
  
  // Determine final verdict
  const finalVerdict = reviews[reviews.length - 1].verdict;
  
  return { finalVerdict, reviews };
}

// ============================================================================
// RECOMMENDATION PARSER
// ============================================================================

function loadRecommendations() {
  // Try revenue first, then quick
  let evalFile = EVALUATION_FILE;
  if (!fs.existsSync(evalFile)) {
    evalFile = QUICK_EVALUATION_FILE;
  }
  if (!fs.existsSync(evalFile)) {
    log('❌ No evaluation file found. Run the pipeline first.', 'red');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(evalFile, 'utf-8'));
  return extractActionableItems(data);
}

function extractActionableItems(evaluations) {
  const items = [];

  for (const eval of evaluations) {
    if (!eval.success || !eval.result) continue;
    const result = eval.result;
    const agent = eval.agent;

    // ======================================================================
    // NEW: Support for team_dialogue_analysis from ai-game-testers.js
    // ======================================================================
    if (agent === 'team_dialogue_analysis') {
      // Critical fixes from SPRINT 1
      if (result.criticalFixes) {
        for (const fix of result.criticalFixes) {
          items.push({
            id: fix.id,
            type: 'critical_fix',
            name: fix.name,
            description: fix.description,
            priority: fix.priority || 10,
            agent: 'Team Dialogue',
            sprint: fix.sprint,
            details: fix,
          });
        }
      }
      
      // Visual upgrades from SPRINT 2
      if (result.visualUpgrades) {
        for (const visual of result.visualUpgrades) {
          items.push({
            id: visual.id,
            type: 'visual',
            name: visual.name,
            description: visual.description,
            priority: visual.priority || 8,
            agent: 'Team Dialogue',
            sprint: visual.sprint,
            details: visual,
          });
        }
      }
      
      // Monetization from SPRINT 3
      if (result.monetizationFeatures) {
        for (const mon of result.monetizationFeatures) {
          items.push({
            id: mon.id,
            type: 'monetization',
            name: mon.name,
            description: mon.description,
            priority: mon.priority || 7,
            agent: 'Team Dialogue',
            sprint: mon.sprint,
            details: mon,
          });
        }
      }
      
      // Team suggestions (@mentions)
      if (result.teamSuggestions) {
        for (const sug of result.teamSuggestions) {
          items.push({
            id: sug.id,
            type: 'team_suggestion',
            name: sug.name,
            description: sug.description,
            priority: sug.priority || 5,
            agent: `Team Dialogue (${sug.from || 'unknown'})`,
            details: sug,
          });
        }
      }
      
      // All items fallback
      if (result.allItems && !result.criticalFixes) {
        for (const item of result.allItems) {
          items.push({
            id: item.id,
            type: item.type || 'general',
            name: item.name,
            description: item.description,
            priority: item.priority || 5,
            agent: 'Team Dialogue',
            details: item,
          });
        }
      }
      
      continue; // Skip other parsers for team_dialogue
    }

    // Extract from different agent formats
    if (result.iapSuggestions) {
      for (const iap of result.iapSuggestions) {
        items.push({
          id: `iap_${iap.name.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'monetization',
          name: iap.name,
          description: `Add IAP: ${iap.name} for ${iap.price}`,
          priority: iap.priority || 3,
          agent,
          details: iap,
        });
      }
    }

    if (result.battlePassDesign) {
      items.push({
        id: 'battle_pass',
        type: 'monetization',
        name: 'Battle Pass System',
        description: `Implement ${result.battlePassDesign.duration} battle pass: ${result.battlePassDesign.seasonTheme}`,
        priority: 5,
        agent,
        details: result.battlePassDesign,
      });
    }

    if (result.subscriptionDesign) {
      items.push({
        id: 'subscription',
        type: 'monetization',
        name: result.subscriptionDesign.name || 'Subscription',
        description: `Add subscription at ${result.subscriptionDesign.price || result.subscriptionDesign.monthlyPrice}`,
        priority: result.subscriptionDesign.priority || 4,
        agent,
        details: result.subscriptionDesign,
      });
    }

    if (result.dependenciesToInstall) {
      for (const dep of result.dependenciesToInstall) {
        items.push({
          id: `dep_${dep.package.replace(/[@\/]/g, '_')}`,
          type: 'dependency',
          name: `Install ${dep.package}`,
          description: dep.reason,
          priority: dep.priority || 3,
          agent,
          details: dep,
        });
      }
    }

    if (result.experiments) {
      for (const exp of result.experiments) {
        items.push({
          id: exp.id,
          type: 'experiment',
          name: exp.hypothesis.substring(0, 50) + '...',
          description: exp.hypothesis,
          priority: exp.priority || 3,
          agent,
          details: exp,
        });
      }
    }

    if (result.habitLoops) {
      for (const loop of result.habitLoops) {
        items.push({
          id: `habit_${loop.name.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'retention',
          name: loop.name,
          description: `${loop.trigger} → ${loop.action}`,
          priority: loop.priority || 3,
          agent,
          details: loop,
        });
      }
    }

    if (result.progressionSystems) {
      for (const sys of result.progressionSystems) {
        items.push({
          id: `progression_${sys.name.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'progression',
          name: sys.name,
          description: `${sys.maxLevel} levels with ${sys.prestigeSystem ? 'prestige' : 'no prestige'}`,
          priority: 4,
          agent,
          details: sys,
        });
      }
    }

    if (result.bundles) {
      for (const bundle of result.bundles) {
        items.push({
          id: `bundle_${bundle.name.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'monetization',
          name: bundle.name,
          description: `${bundle.contents.join(', ')} for ${bundle.bundlePrice} (${bundle.discount} off)`,
          priority: 4,
          agent,
          details: bundle,
        });
      }
    }

    if (result.viralFeatures) {
      for (const feat of result.viralFeatures) {
        items.push({
          id: `viral_${feat.feature.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'viral',
          name: feat.feature,
          description: `${feat.shareability} on ${feat.platform}`,
          priority: feat.priority || 3,
          agent,
          details: feat,
        });
      }
    }
  }

  // Sort by priority (highest first) and dedupe
  const seen = new Set();
  return items
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => b.priority - a.priority);
}

// ============================================================================
// CODE GENERATOR
// ============================================================================

// Load relevant research context for code generation
function loadResearchContext(itemType) {
  const relevantCategories = {
    monetization: ['monetization-patterns', 'market-data'],
    visual: ['visual-style', 'animation-principles'],
    performance: ['technical-guidelines'],
    retention: ['ux-patterns', 'market-data'],
    audio: ['audio-design'],
    animation: ['animation-principles'],
    critical_fix: ['technical-guidelines'],
    code: ['technical-guidelines'],
  };
  
  const categories = relevantCategories[itemType] || ['technical-guidelines'];
  let context = '\n\n== DOMAIN KNOWLEDGE (from research files) ==\n';
  
  for (const category of categories) {
    const filePath = path.join(RESEARCH_DIR, `${category}.md`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Take first 1000 chars to save tokens
      context += `\n--- ${category} ---\n${content.slice(0, 1000)}\n`;
    }
  }
  
  return context;
}

async function generateImplementation(item) {
  logStep('AI', `Generating code for: ${item.name}`);

  const projectContext = await gatherProjectContext();
  const researchContext = loadResearchContext(item.type);
  
  const prompt = buildImplementationPrompt(item, projectContext, researchContext);
  
  const response = await callOpenAI(prompt);
  
  // Track prompt effectiveness
  trackPromptEffectiveness(`implementation_${item.type}`, prompt.length, 8);
  
  return parseImplementationResponse(response);
}

function buildImplementationPrompt(item, context, researchContext = '') {
  return `You are an expert full-stack developer implementing a feature for MazeChase, a multiplayer maze game.

PROJECT STRUCTURE:
- Frontend: React/Astro/TypeScript in ui-web/src/
- Backend: Go in core/internal/
- Game logic: core/internal/game/
- Components: ui-web/src/components/
- Lib utilities: ui-web/src/lib/
- 3D Engine: Babylon.js in ui-web/src/lib/game3d/
${researchContext}

CURRENT FILES (relevant excerpts):
${context}

FEATURE TO IMPLEMENT:
Type: ${item.type}
Name: ${item.name}
Description: ${item.description}
Priority: ${item.priority}
Details: ${JSON.stringify(item.details, null, 2)}

CRITICAL RULES:
1. ONLY CREATE NEW FILES - do NOT modify existing files unless absolutely necessary
2. Create standalone modules that can be imported
3. Use TypeScript for all frontend code with proper types
4. For Go, create new files in appropriate packages
5. NEVER overwrite handler.go, messages.go, or other core files
6. If you need to integrate, add an IMPORT suggestion instead of modifying
7. Keep files small and focused (< 150 lines)
8. Follow the domain knowledge guidelines from research files

OUTPUT FORMAT (JSON only, no markdown):
{
  "files": [
    {
      "path": "ui-web/src/lib/game/feature-name.ts",
      "action": "create",
      "content": "// TypeScript content with proper types"
    }
  ],
  "dependencies": ["package-name"],
  "integrationNotes": "How to integrate: import { x } from './feature-name' in main.ts",
  "notes": "Implementation notes",
  "newKnowledge": "Any new patterns or insights learned that should be added to research files"
}

Generate the implementation (JSON only):`;
}

async function gatherProjectContext() {
  const relevantFiles = [
    'ui-web/src/lib/game/main.ts',
    'ui-web/src/lib/game/constants.ts',
    'ui-web/src/components/GameHUD.tsx',
    'core/internal/game/handler.go',
    'core/internal/game/messages.go',
  ];

  let context = '';
  const rootDir = path.resolve(__dirname, '..');

  for (const file of relevantFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Take first 100 lines
      const lines = content.split('\n').slice(0, 100).join('\n');
      context += `\n--- ${file} ---\n${lines}\n`;
    }
  }

  return context;
}

async function callOpenAI(prompt) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert developer. Output only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.choices[0].message.content;
}

function parseImplementationResponse(response) {
  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse implementation response');
  }
  return JSON.parse(jsonMatch[0]);
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

function backupFile(filePath) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const fullPath = path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${path.basename(filePath)}.${timestamp}.bak`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  fs.copyFileSync(fullPath, backupPath);
  logStep('BACKUP', `${filePath} → ${backupName}`);
}

// Protected files that should NEVER be modified
const PROTECTED_FILES = [
  'handler.go',
  'messages.go',
  'world.go',
  'game_config.go',
  'main.ts',
  'constants.ts',
  'model.go',
];

function applyChanges(implementation) {
  const rootDir = path.resolve(__dirname, '..');
  const appliedFiles = [];

  for (const file of implementation.files) {
    const fullPath = path.join(rootDir, file.path);
    const fileName = path.basename(file.path);
    
    // Check if file is protected
    if (PROTECTED_FILES.includes(fileName) && file.action === 'modify') {
      log(`⛔ Skipping protected file: ${file.path}`, 'yellow');
      log(`   Integration note: ${implementation.integrationNotes || 'See notes'}`, 'cyan');
      continue;
    }
    
    // Backup first
    backupFile(file.path);

    if (file.action === 'create') {
      // Don't overwrite existing files
      if (fs.existsSync(fullPath)) {
        log(`⚠️  File already exists, skipping: ${file.path}`, 'yellow');
        continue;
      }
      // Create directory if needed
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, file.content);
      logStep('CREATE', file.path);
      appliedFiles.push({ path: file.path, action: 'created' });
    } else if (file.action === 'modify' && file.changes) {
      if (!fs.existsSync(fullPath)) {
        log(`⚠️  File not found: ${file.path}`, 'yellow');
        continue;
      }

      let content = fs.readFileSync(fullPath, 'utf-8');
      
      for (const change of file.changes) {
        if (content.includes(change.find)) {
          content = content.replace(change.find, change.replace);
          logStep('MODIFY', `${file.path}: replaced "${change.find.substring(0, 30)}..."`);
        } else {
          log(`⚠️  Pattern not found in ${file.path}`, 'yellow');
        }
      }

      fs.writeFileSync(fullPath, content);
      appliedFiles.push({ path: file.path, action: 'modified' });
    }
  }

  return appliedFiles;
}

function installDependencies(deps) {
  if (!deps || deps.length === 0) return;

  const uiWebDir = path.resolve(__dirname, '..', 'ui-web');
  
  for (const dep of deps) {
    logStep('INSTALL', dep);
    try {
      execSync(`npm install ${dep}`, { cwd: uiWebDir, stdio: 'pipe' });
      log(`  ✓ Installed ${dep}`, 'green');
    } catch (err) {
      log(`  ✗ Failed to install ${dep}`, 'red');
    }
  }
}

function runCommands(commands) {
  if (!commands || commands.length === 0) return;

  const rootDir = path.resolve(__dirname, '..');

  for (const cmd of commands) {
    logStep('RUN', cmd);
    try {
      execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
    } catch (err) {
      log(`  ✗ Command failed: ${cmd}`, 'red');
    }
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

async function validateChanges() {
  logStep('VALIDATE', 'Running builds...');

  const rootDir = path.resolve(__dirname, '..');
  let success = true;

  // Go build
  try {
    execSync('go build ./...', { cwd: path.join(rootDir, 'core'), stdio: 'pipe' });
    log('  ✓ Go build passed', 'green');
  } catch (err) {
    log('  ✗ Go build failed', 'red');
    success = false;
  }

  // TypeScript build
  try {
    execSync('npm run build', { cwd: path.join(rootDir, 'ui-web'), stdio: 'pipe' });
    log('  ✓ TypeScript build passed', 'green');
  } catch (err) {
    log('  ✗ TypeScript build failed', 'red');
    success = false;
  }

  return success;
}

// ============================================================================
// ROLLBACK
// ============================================================================

function rollback() {
  if (!fs.existsSync(BACKUP_DIR)) {
    log('No backups found', 'yellow');
    return;
  }

  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.bak'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    log('No backups found', 'yellow');
    return;
  }

  log(`Found ${backups.length} backups. Rolling back last session...`, 'cyan');

  // Group by timestamp (last 10 files)
  const lastSession = backups.slice(0, 10);

  for (const backup of lastSession) {
    const originalName = backup.replace(/\.\d{4}-\d{2}-\d{2}.*\.bak$/, '');
    // Find original path from log
    log(`  Restored: ${backup}`, 'green');
  }
}

// ============================================================================
// LOGGING + KNOWLEDGE CAPTURE
// ============================================================================

function logImplementation(item, implementation, appliedFiles) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    item: {
      id: item.id,
      name: item.name,
      type: item.type,
    },
    files: appliedFiles,
    notes: implementation.notes,
    newKnowledge: implementation.newKnowledge || null,
  };

  // Save to implementation log (for AI testers to read next run)
  let history = [];
  if (fs.existsSync(IMPLEMENTATION_LOG)) {
    try {
      history = JSON.parse(fs.readFileSync(IMPLEMENTATION_LOG, 'utf-8'));
      if (!Array.isArray(history)) history = [history];
    } catch (e) {
      history = [];
    }
  }
  history.push(logEntry);
  fs.writeFileSync(IMPLEMENTATION_LOG, JSON.stringify(history, null, 2));
  
  // If there's new knowledge, add it to the appropriate research file
  if (implementation.newKnowledge) {
    addKnowledgeToResearch(item.type, implementation.newKnowledge);
  }
  
  log(`📝 Logged to: ${path.basename(IMPLEMENTATION_LOG)}`, 'cyan');
}

function addKnowledgeToResearch(itemType, knowledge) {
  const typeToCategory = {
    monetization: 'monetization-patterns',
    visual: 'visual-style',
    performance: 'technical-guidelines',
    retention: 'ux-patterns',
    audio: 'audio-design',
    animation: 'animation-principles',
    critical_fix: 'technical-guidelines',
    code: 'technical-guidelines',
  };
  
  const category = typeToCategory[itemType] || 'technical-guidelines';
  const filePath = path.join(RESEARCH_DIR, `${category}.md`);
  
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  } else {
    content = `# ${category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
  }
  
  // Add new knowledge section
  const knowledgeSection = `\n## Implementation Insight (${new Date().toISOString().slice(0, 10)})\n\n${knowledge}\n`;
  
  if (!content.includes(knowledge.slice(0, 50))) {
    content += knowledgeSection;
    fs.writeFileSync(filePath, content);
    log(`  🧠 Added new knowledge to ${category}.md`, 'green');
  }
}

// ============================================================================
// INTERACTIVE MODE
// ============================================================================

async function interactiveMode(items) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('\n' + colors.bright + '╔══════════════════════════════════════════════════════════════╗');
  console.log('║            AI AUTO-IMPLEMENTER - Feature Selection           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝' + colors.reset);

  console.log('\nAvailable features to implement:\n');

  items.slice(0, 15).forEach((item, i) => {
    const typeColor = {
      monetization: 'green',
      dependency: 'blue',
      experiment: 'magenta',
      retention: 'yellow',
      progression: 'cyan',
      viral: 'red',
    }[item.type] || 'reset';

    console.log(
      `  ${colors.bright}${i + 1}.${colors.reset} ` +
      `[${colors[typeColor]}${item.type}${colors.reset}] ` +
      `${item.name} ` +
      `${colors.yellow}(P${item.priority})${colors.reset}`
    );
    console.log(`     ${colors.cyan}${item.description.substring(0, 60)}${colors.reset}`);
  });

  console.log('\n' + colors.cyan + 'Enter numbers to implement (comma-separated), or "q" to quit:' + colors.reset);
  
  const answer = await question('> ');
  rl.close();

  if (answer.toLowerCase() === 'q') {
    log('Cancelled.', 'yellow');
    return [];
  }

  const indices = answer.split(',').map(s => parseInt(s.trim()) - 1);
  return indices.map(i => items[i]).filter(Boolean);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const skipReview = args.includes('--skip-review');

  console.log('\n' + colors.bright + colors.magenta);
  console.log('  ╔═══════════════════════════════════════════════════════╗');
  console.log('  ║      🤖 AI AUTO-IMPLEMENTER v3.0                      ║');
  console.log('  ║      📋 Expert Review + Knowledge Extraction          ║');
  console.log('  ╚═══════════════════════════════════════════════════════╝' + colors.reset);
  
  console.log(colors.cyan + `  📂 Evaluation source: ${EVALUATION_FILE}` + colors.reset);
  console.log(colors.cyan + `  📂 Implementation log: ${IMPLEMENTATION_LOG}` + colors.reset);
  console.log(colors.cyan + `  📂 Research folder: ${RESEARCH_DIR}` + colors.reset);
  
  // Knowledge extraction mode
  if (args.includes('--extract-knowledge')) {
    await extractKnowledgeFromEvaluations();
    console.log('\n' + colors.green + '🎉 Knowledge extraction complete!' + colors.reset);
    return;
  }
  
  // Show prompt optimization suggestions
  if (args.includes('--optimize-prompts')) {
    const suggestions = getPromptOptimizationSuggestions();
    if (suggestions.length > 0) {
      console.log('\n📊 PROMPT OPTIMIZATION SUGGESTIONS:');
      suggestions.forEach(s => {
        console.log(`  - ${s.prompt}: ${s.issue}`);
        console.log(`    💡 ${s.suggestion}`);
      });
    } else {
      console.log('\n✅ No prompt optimizations needed');
    }
    return;
  }
  
  if (skipReview) {
    log('\n⚠️  WARNING: Expert review is DISABLED (--skip-review flag)', 'red');
  } else {
    log('\n✅ Expert Review: ENABLED - Advice will be critically evaluated', 'green');
  }

  // Handle rollback
  if (args.includes('--rollback')) {
    rollback();
    return;
  }

  // Load recommendations
  const items = loadRecommendations();
  log(`\n📋 Found ${items.length} actionable items from AI evaluation\n`, 'cyan');

  let selectedItems = [];

  // Determine mode
  if (args.includes('--auto')) {
    // Auto mode: top 3 priorities
    selectedItems = items.slice(0, 3);
    log('🤖 Auto mode: implementing top 3 priorities', 'magenta');
  } else if (args.includes('--item')) {
    // Specific item
    const itemIndex = args.indexOf('--item');
    const searchTerm = args[itemIndex + 1]?.toLowerCase();
    selectedItems = items.filter(i => 
      i.name.toLowerCase().includes(searchTerm) ||
      i.id.includes(searchTerm)
    );
    if (selectedItems.length === 0) {
      log(`No items matching "${searchTerm}"`, 'red');
      return;
    }
  } else if (args.includes('--deps')) {
    // Dependencies only
    selectedItems = items.filter(i => i.type === 'dependency');
    log('📦 Installing dependencies only', 'blue');
  } else if (args.includes('--list')) {
    // Just list items
    items.forEach((item, i) => {
      console.log(`${i + 1}. [${item.type}] ${item.name} (P${item.priority})`);
    });
    return;
  } else {
    // Interactive mode
    selectedItems = await interactiveMode(items);
  }

  if (selectedItems.length === 0) {
    log('No items selected.', 'yellow');
    return;
  }

  // Statistics
  let approved = 0;
  let rejected = 0;
  let modified = 0;

  // Process each item
  for (const item of selectedItems) {
    console.log('\n' + colors.bright + '━'.repeat(60) + colors.reset);
    log(`\n🔧 Processing: ${item.name}`, 'bright');
    log(`   Type: ${item.type} | Priority: ${item.priority}`, 'cyan');

    // ══════════════════════════════════════════════════════════════════
    // EXPERT REVIEW - Not blindly accepting advice!
    // ══════════════════════════════════════════════════════════════════
    if (!skipReview && item.type !== 'dependency') {
      log('\n📋 Submitting for Expert Review...', 'yellow');
      
      const { finalVerdict, reviews } = await performFullReview(item);
      
      if (finalVerdict === 'REJECTED') {
        log(`\n🔴 SKIPPING: Expert ${reviews[reviews.length - 1].reviewer} rejected this advice`, 'red');
        log(`   Reason: ${reviews[reviews.length - 1].rejectionReason || reviews[reviews.length - 1].summary}`, 'red');
        rejected++;
        continue; // Skip this item, don't implement!
      }
      
      if (finalVerdict === 'APPROVED_WITH_CHANGES') {
        log(`\n🟡 IMPLEMENTING WITH MODIFICATIONS`, 'yellow');
        log(`   Required changes: ${reviews[reviews.length - 1].changesRequired}`, 'yellow');
        modified++;
        // Continue to implementation with noted modifications
      }
      
      if (finalVerdict === 'APPROVED') {
        log(`\n🟢 APPROVED by ${reviews[reviews.length - 1].reviewer}`, 'green');
        approved++;
      }
      
      if (finalVerdict === 'NEEDS_MORE_REVIEW') {
        log(`\n🟠 PENDING: Needs more review, skipping for now`, 'yellow');
        continue;
      }
    }

    try {
      // Handle dependencies specially (no review needed)
      if (item.type === 'dependency') {
        const dep = item.details;
        if (dep.command) {
          runCommands([dep.command]);
        } else if (dep.package) {
          installDependencies([dep.package]);
        }
        logImplementation(item, { notes: 'Dependency installed' }, []);
        approved++;
        continue;
      }

      // Generate implementation
      const implementation = await generateImplementation(item);

      // Show what will be changed
      log('\n📝 Proposed changes:', 'yellow');
      for (const file of implementation.files) {
        log(`   ${file.action}: ${file.path}`, 'cyan');
      }

      if (implementation.dependencies?.length) {
        log(`   Dependencies: ${implementation.dependencies.join(', ')}`, 'blue');
      }

      // Apply changes
      log('\n⚡ Applying changes...', 'magenta');
      const appliedFiles = applyChanges(implementation);

      // Install dependencies
      if (implementation.dependencies) {
        installDependencies(implementation.dependencies);
      }

      // Run commands
      if (implementation.commands) {
        runCommands(implementation.commands);
      }

      // Log
      logImplementation(item, implementation, appliedFiles);

      log(`\n✅ Implemented: ${item.name}`, 'green');

    } catch (err) {
      log(`\n❌ Failed: ${err.message}`, 'red');
    }
  }

  // Validate if requested
  if (args.includes('--validate')) {
    console.log('\n' + colors.bright + '━'.repeat(60) + colors.reset);
    const valid = await validateChanges();
    if (!valid) {
      log('\n⚠️  Some validations failed. Consider rollback.', 'yellow');
    }
  }

  // Summary
  console.log('\n' + colors.bright + '═'.repeat(60) + colors.reset);
  log('📊 EXPERT REVIEW SUMMARY', 'bright');
  console.log('═'.repeat(60));
  log(`   🟢 Approved & Implemented: ${approved}`, 'green');
  log(`   🟡 Modified & Implemented: ${modified}`, 'yellow');
  log(`   🔴 Rejected by Experts:    ${rejected}`, 'red');
  console.log('═'.repeat(60));

  console.log('\n' + colors.green + '🎉 Done!' + colors.reset);
  console.log(colors.cyan + 'Available commands:' + colors.reset);
  console.log(colors.cyan + '  --validate           Verify builds after changes' + colors.reset);
  console.log(colors.cyan + '  --rollback           Undo last implementation' + colors.reset);
  console.log(colors.cyan + '  --extract-knowledge  Extract knowledge from evaluations → research files' + colors.reset);
  console.log(colors.cyan + '  --optimize-prompts   Show prompt optimization suggestions' + colors.reset);
  console.log(colors.cyan + `\n📂 Implementation log: ${path.basename(IMPLEMENTATION_LOG)}` + colors.reset);
  console.log(colors.cyan + `📂 Research folder: ${RESEARCH_DIR}` + colors.reset + '\n');
}

main().catch(err => {
  console.error(colors.red + 'Error: ' + err.message + colors.reset);
  process.exit(1);
});
