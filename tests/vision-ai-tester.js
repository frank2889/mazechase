/**
 * 🎮 MazeChase Vision AI Game Tester
 * 
 * Neemt screenshots van het spel en analyseert deze met GPT-4 Vision.
 * Test zowel technische gameplay als visuele aantrekkelijkheid.
 * 
 * Vereisten:
 *   npm install puppeteer openai dotenv
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const puppeteer = require('puppeteer');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.GAME_URL || 'http://localhost:8080';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID
});

// 4 AI Tester Personas met focus op visuele aspecten
const VISION_TESTERS = [
    {
        name: "Emma",
        age: 8,
        persona: `Je bent Emma, een 8-jarig meisje. Kijk naar deze game screenshot en beoordeel:
        - Zijn de kleuren vrolijk en aantrekkelijk?
        - Begrijp je wat er gebeurt in het spel?
        - Zien de karakters er leuk en vriendelijk uit?
        - Zou je dit spel willen spelen?
        Antwoord alsof je 8 jaar bent.`
    },
    {
        name: "Tim",
        age: 16,
        persona: `Je bent Tim, een 16-jarige gamer die veel Fortnite en Valorant speelt.
        Analyseer deze game screenshot kritisch op:
        - Graphics kwaliteit (modern of outdated?)
        - UI/UX design (clean of rommelig?)
        - Visuele feedback (zijn acties duidelijk?)
        - Vergelijk met andere games die je kent
        Wees eerlijk en kritisch.`
    },
    {
        name: "Sandra",
        age: 38,
        persona: `Je bent Sandra, moeder van 2 kinderen (8 en 12 jaar).
        Beoordeel deze game screenshot op:
        - Is het geschikt voor kinderen?
        - Ziet het er professioneel uit?
        - Is de UI duidelijk genoeg voor verschillende leeftijden?
        - Zou je dit met je gezin spelen?
        Focus op family-friendliness.`
    },
    {
        name: "Marcus",
        age: 32,
        persona: `Je bent Marcus, een UI/UX designer met 10 jaar ervaring.
        Analyseer deze game screenshot professioneel op:
        - Kleurgebruik en contrast
        - Typografie en leesbaarheid
        - Visuele hiërarchie
        - Consistentie in design
        - Ruimtegebruik en compositie
        Geef concrete design verbeteringen.`
    }
];

// Screenshot configurations
const SCREENSHOT_SCENARIOS = [
    { name: 'login', path: '/auth/login/', wait: 1000 },
    { name: 'register', path: '/auth/register/', wait: 1000 },
    { name: 'lobby', path: '/lobby/', requiresAuth: true, wait: 1500 },
    { name: 'game', path: '/game/', requiresAuth: true, wait: 3000, gameplay: true }
];

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * Take a screenshot of a page
 */
async function takeScreenshot(page, name) {
    const filepath = path.join(SCREENSHOT_DIR, `${name}_${Date.now()}.png`);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`📸 Screenshot: ${name}`);
    return filepath;
}

/**
 * Convert image to base64
 */
function imageToBase64(filepath) {
    const imageBuffer = fs.readFileSync(filepath);
    return imageBuffer.toString('base64');
}

/**
 * Analyze screenshot with GPT-4 Vision
 */
async function analyzeWithVision(imagePath, tester, scenarioName) {
    const base64Image = imageToBase64(imagePath);
    
    const prompt = `${tester.persona}

Je bekijkt een screenshot van "MazeChase" - een multiplayer maze game geïnspireerd door Pac-Man.
Dit is de ${scenarioName} pagina.

Geef je analyse in het volgende format:

1. EERSTE INDRUK (1-10): Score en korte uitleg
2. VISUELE AANTREKKELIJKHEID (1-10): Kleuren, stijl, sfeer
3. DUIDELIJKHEID (1-10): Is het duidelijk wat je moet doen?
4. PROFESSIONALITEIT (1-10): Ziet het er af uit?

TOP 3 POSITIEVE PUNTEN:
TOP 3 VERBETERPUNTEN:

DESIGN SUGGESTIES (minimaal 2 concrete suggesties):`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${base64Image}`,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });
        
        return response.choices[0].message.content;
    } catch (err) {
        console.error(`Vision AI Error: ${err.message}`);
        return `[Vision analysis failed: ${err.message}]`;
    }
}

/**
 * Login to the game
 */
async function login(page, username, password) {
    await page.goto(`${BASE_URL}/auth/login/`);
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });
    
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);
    
    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    ]);
    
    // Check if login succeeded by looking at URL
    const url = page.url();
    return url.includes('/lobby') || url.includes('/game');
}

/**
 * Register a new user
 */
async function register(page, username, password) {
    await page.goto(`${BASE_URL}/auth/register/`);
    await page.waitForSelector('input[name="username"]', { timeout: 5000 });
    
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);
    await page.type('input[name="passwordVerify"]', password);
    
    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    ]);
    
    return true;
}

/**
 * Run visual tests for a single tester
 */
async function runVisualTests(tester) {
    console.log(`\n🎨 Visual Testing as ${tester.name} (${tester.age}j)...`);
    console.log('─'.repeat(50));
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = {
        tester: tester.name,
        age: tester.age,
        screenshots: [],
        analyses: []
    };
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Test each scenario
        for (const scenario of SCREENSHOT_SCENARIOS) {
            console.log(`\n📍 Testing: ${scenario.name}`);
            
            // Handle auth if required
            if (scenario.requiresAuth) {
                const username = `vision_${tester.name.toLowerCase()}_${Date.now()}`;
                const password = 'test1234';
                
                // Try to register/login
                try {
                    await register(page, username, password);
                } catch (e) {
                    await login(page, username, password);
                }
            }
            
            // Navigate to page
            await page.goto(`${BASE_URL}${scenario.path}`, {
                waitUntil: 'networkidle2',
                timeout: 15000
            }).catch(() => {});
            
            // Wait for content to load
            await new Promise(r => setTimeout(r, scenario.wait));
            
            // For game page, try to start a solo game
            if (scenario.gameplay) {
                try {
                    // Look for solo/single player button
                    const soloButton = await page.$('button:has-text("Solo"), button:has-text("single"), a[href*="single"]');
                    if (soloButton) {
                        await soloButton.click();
                        await new Promise(r => setTimeout(r, 3000));
                    }
                } catch (e) {
                    console.log('  (Could not find solo button)');
                }
            }
            
            // Take screenshot
            const screenshotPath = await takeScreenshot(page, `${tester.name}_${scenario.name}`);
            results.screenshots.push(screenshotPath);
            
            // Analyze with Vision AI
            console.log(`  🤖 Analyzing with Vision AI...`);
            const analysis = await analyzeWithVision(screenshotPath, tester, scenario.name);
            results.analyses.push({
                scenario: scenario.name,
                analysis
            });
            
            console.log(`\n${analysis}\n`);
        }
        
    } catch (err) {
        console.error(`Error during testing: ${err.message}`);
    } finally {
        await browser.close();
    }
    
    return results;
}

/**
 * Generate overall visual design report
 */
async function generateDesignReport(allResults) {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 GENERATING VISUAL DESIGN REPORT...');
    console.log('═'.repeat(60));
    
    const summaryPrompt = `Je bent een senior game UI/UX consultant.

Analyseer de feedback van 4 testers over de visuele design van MazeChase:

${allResults.map(r => `
=== ${r.tester} (${r.age} jaar) ===
${r.analyses.map(a => `[${a.scenario}]: ${a.analysis}`).join('\n\n')}
`).join('\n')}

Maak een PRIORITEITEN RAPPORT voor visuele verbeteringen:

## 🔴 KRITIEKE VISUELE ISSUES
(Issues die de game onprofessioneel maken)

## 🟡 BELANGRIJKE VERBETERINGEN
(Verbeteringen voor betere user experience)

## 🟢 POLISH & DETAILS
(Nice-to-have visuele verfijningen)

## 🎨 STIJLGIDS AANBEVELINGEN
- Kleurenpalet suggesties
- Typography suggesties  
- Iconografie suggesties
- Animatie suggesties

## CONCRETE IMPLEMENTATIE TAKEN
Top 5 specifieke taken om de visuele kwaliteit te verhogen.

Focus op Kurzgesagt-style flat vector design: egale vlakken, dikke contouren, geometrische vormen.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: summaryPrompt }],
            max_tokens: 2000,
            temperature: 0.7
        });
        
        return response.choices[0].message.content;
    } catch (err) {
        return `[Report generation failed: ${err.message}]`;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('🎨 MazeChase Vision AI Game Tester');
    console.log('═'.repeat(60));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Screenshots: ${SCREENSHOT_DIR}`);
    console.log();
    
    const allResults = [];
    
    // Test with each persona
    for (const tester of VISION_TESTERS) {
        const results = await runVisualTests(tester);
        allResults.push(results);
        
        // Small delay between testers
        await new Promise(r => setTimeout(r, 2000));
    }
    
    // Generate overall report
    const designReport = await generateDesignReport(allResults);
    console.log(designReport);
    
    // Save results
    const outputPath = path.join(__dirname, 'vision-test-results.json');
    const output = {
        timestamp: new Date().toISOString(),
        testers: allResults,
        designReport
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
    
    return output;
}

// Run if called directly
if (require.main === module) {
    main()
        .then(() => {
            console.log('\n✅ Vision AI Testing Complete!');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Error:', err);
            process.exit(1);
        });
}

module.exports = { main, VISION_TESTERS };
