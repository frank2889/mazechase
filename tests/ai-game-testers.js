/**
 * AI Game Testers - 4 personas evalueren MazeChase
 * 
 * Gebruikt OpenAI GPT-4 om het spel te evalueren vanuit 4 verschillende perspectieven:
 * 1. Emma (8 jaar) - Kind perspectief
 * 2. Tim (16 jaar) - Tiener gamer perspectief  
 * 3. Sandra (38 jaar) - Moeder/Familie perspectief
 * 4. Peter (45 jaar) - Nostalgische gamer perspectief
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const OpenAI = require('openai');
const WebSocket = require('ws');
const https = require('https');
const http = require('http');

const BASE_URL = process.env.GAME_URL || 'http://localhost:8080';

// OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID
});

// 4 AI Tester Personas
const TESTERS = [
    {
        name: "Emma",
        age: 8,
        username: "emma_gamer",
        password: "emma1234",
        persona: `Je bent Emma, een 8-jarig meisje dat van games houdt. Je speelt graag Roblox en Mario Kart.
        Je vindt het leuk als games:
        - Kleurrijk en vrolijk zijn
        - Makkelijk te begrijpen zijn
        - Leuke geluiden hebben
        - Je kunt winnen zonder te moeilijk
        Je wordt snel gefrustreerd als iets te moeilijk is of als je niet begrijpt wat je moet doen.
        Evalueer het spel vanuit het perspectief van een kind.`
    },
    {
        name: "Tim", 
        age: 16,
        username: "tim_pro",
        password: "tim12345",
        persona: `Je bent Tim, een 16-jarige tiener en ervaren gamer. Je speelt competitieve games zoals Fortnite en Valorant.
        Je vindt het belangrijk dat games:
        - Uitdagend zijn
        - Goede graphics hebben
        - Competitief element hebben
        - Smooth controls hebben
        - Niet te "kinderachtig" aanvoelen
        Je bent kritisch op gameplay en wilt dat skills beloond worden.
        Evalueer het spel vanuit het perspectief van een tiener gamer.`
    },
    {
        name: "Sandra",
        age: 38,
        username: "sandra_mom",
        password: "sandra123",
        persona: `Je bent Sandra, een 38-jarige moeder van 2 kinderen (8 en 12 jaar). Je zoekt games die je samen met je gezin kunt spelen.
        Je vindt het belangrijk dat games:
        - Geschikt zijn voor alle leeftijden
        - Niet te gewelddadig zijn
        - Sociale interactie stimuleren
        - Niet te lang duren (max 15-20 min per potje)
        - Makkelijk te leren maar moeilijk te masteren
        Je denkt aan bordspellen zoals Catan en Ticket to Ride.
        Evalueer het spel vanuit het perspectief van een ouder die family game nights organiseert.`
    },
    {
        name: "Peter",
        age: 45,
        username: "peter_retro",
        password: "peter1234",
        persona: `Je bent Peter, een 45-jarige nostalgische gamer. Je speelde vroeger Pac-Man, Space Invaders en Tetris in de arcade.
        Je vindt het belangrijk dat games:
        - Dat retro gevoel hebben
        - Simpele maar verslavende gameplay hebben
        - High scores en leaderboards hebben
        - Snelle sessies mogelijk maken
        - Die klassieke arcade spanning geven
        Je vergelijkt moderne games vaak met de klassiekers.
        Evalueer het spel vanuit het perspectief van een retro gaming fan.`
    }
];

// Game state om te beschrijven aan de AI
const GAME_DESCRIPTION = `
MazeChase is een 3D multiplayer maze game geïnspireerd door Pac-Man maar met een twist:

CONCEPT:
- 4 spelers: 1 Runner (gele Pac-Man-achtig karakter) en 3 Chasers (spoken/ghosts)
- De Runner moet pellets verzamelen en ontsnappen aan de Chasers
- Chasers proberen de Runner te vangen
- Power-ups maken de Runner tijdelijk in staat om Chasers te vangen

SPELREGELS:
- Runner wint als alle pellets verzameld zijn OF alle 3 Chasers gevangen worden
- Chasers winnen als ze de Runner vangen
- Spelduur: 3 minuten max
- Solo mode speelt tegen 3 AI bots

FEATURES:
- 3D graphics met Babylon.js
- 4 verschillende visuele thema's (Neon Night, Cyber Arcade, Sunset Maze, Ghost Forest)
- Minimap in de hoek
- Score popups bij het verzamelen van pellets
- Leaderboard
- Touch controls voor mobiel

CONTROLS:
- WASD of pijltjestoetsen om te bewegen
- Continue beweging (houd ingedrukt)

UI FLOW:
1. Login/Register pagina
2. Lobby - hier kies je game mode en kun je solo of multiplayer spelen
3. Game pagina met 3D view
4. Game over scherm met scores
`;

// HTTP request helper
function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const req = protocol.request(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            ...options
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Get cookies from response
                const cookies = res.headers['set-cookie'] || [];
                resolve({ 
                    status: res.statusCode, 
                    data, 
                    headers: res.headers,
                    cookies: cookies.map(c => c.split(';')[0]).join('; ')
                });
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// Register a test user
async function registerUser(username, password) {
    try {
        const response = await httpRequest(`${BASE_URL}/auth.v1.AuthService/Register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                password, 
                passwordVerify: password 
            })
        });
        
        if (response.status === 200) {
            console.log(`✅ Registered user: ${username}`);
            return { success: true, cookies: response.cookies };
        } else if (response.data.includes('al in gebruik')) {
            // User exists, try login
            return await loginUser(username, password);
        }
        return { success: false, error: response.data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Login a user
async function loginUser(username, password) {
    try {
        const response = await httpRequest(`${BASE_URL}/auth.v1.AuthService/Login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (response.status === 200) {
            console.log(`✅ Logged in: ${username}`);
            return { success: true, cookies: response.cookies };
        }
        return { success: false, error: response.data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Create a new lobby for testing
async function createLobby(cookies, lobbyName) {
    try {
        const response = await httpRequest(`${BASE_URL}/lobby.v1.LobbyService/CreateLobby`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify({ name: lobbyName })
        });
        
        if (response.status === 200) {
            const data = JSON.parse(response.data);
            console.log(`✅ Created lobby: ${lobbyName} (ID: ${data.id})`);
            return { success: true, lobbyId: data.id };
        }
        return { success: false, error: response.data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Test the game flow as a user
async function testGameFlow(tester, cookies) {
    const observations = [];
    
    // 0. Create a unique lobby for this tester
    const lobbyName = `AITest_${tester.username}_${Date.now()}`;
    const lobbyResult = await createLobby(cookies, lobbyName);
    let lobbyId = 1; // fallback
    
    if (lobbyResult.success) {
        lobbyId = lobbyResult.lobbyId;
        observations.push({
            phase: 'Lobby creatie',
            success: true,
            details: `Lobby "${lobbyName}" aangemaakt (ID: ${lobbyId})`
        });
    } else {
        observations.push({
            phase: 'Lobby creatie',
            success: false,
            details: `Kon geen lobby maken: ${lobbyResult.error}, gebruik fallback lobby 1`
        });
    }
    
    // 1. Test lobby page
    try {
        const lobbyRes = await httpRequest(`${BASE_URL}/lobby/`, {
            headers: { Cookie: cookies }
        });
        observations.push({
            phase: 'Lobby laden',
            success: lobbyRes.status === 200,
            details: lobbyRes.status === 200 ? 'Lobby pagina laadt correct' : `Error: ${lobbyRes.status}`
        });
    } catch (err) {
        observations.push({ phase: 'Lobby laden', success: false, details: err.message });
    }
    
    // 2. Test game assets
    try {
        const mapRes = await httpRequest(`${BASE_URL}/gassets/map.json`);
        observations.push({
            phase: 'Game assets',
            success: mapRes.status === 200,
            details: mapRes.status === 200 ? 'Map.json laadt correct' : `Error: ${mapRes.status}`
        });
    } catch (err) {
        observations.push({ phase: 'Game assets', success: false, details: err.message });
    }
    
    // 3. Test WebSocket connection and game start
    const wsObservations = await new Promise((resolve) => {
        const obs = [];
        const wsUrl = BASE_URL.replace('http', 'ws');
        // Use the unique lobby created for this tester
        
        try {
            const ws = new WebSocket(`${wsUrl}/api/game?lobby=${lobbyId}&single=true`, {
                headers: { Cookie: cookies }
            });
            
            let messageCount = 0;
            let hasState = false;
            let hasBots = false;
            let botCount = 0;
            
            ws.on('open', () => {
                obs.push({ phase: 'WebSocket', success: true, details: 'Verbinding gemaakt' });
            });
            
            ws.on('message', (data) => {
                messageCount++;
                try {
                    const msg = JSON.parse(data.toString());
                    
                    if (msg.type === 'state') {
                        hasState = true;
                        obs.push({ 
                            phase: 'Game State', 
                            success: true, 
                            details: `Ontvangen als ${msg.spriteType}, isHost: ${msg.isHost}` 
                        });
                    }
                    
                    if (msg.type === 'active' && msg.user?.startsWith('Bot')) {
                        botCount++;
                        if (botCount === 3) {
                            hasBots = true;
                            obs.push({ 
                                phase: 'Bot AI', 
                                success: true, 
                                details: '3 bots zijn toegevoegd aan het spel' 
                            });
                        }
                    }
                    
                    if (msg.type === 'pos') {
                        // Bots bewegen
                        if (!obs.find(o => o.phase === 'Bot Movement')) {
                            obs.push({
                                phase: 'Bot Movement',
                                success: true,
                                details: 'Bots bewegen actief door de maze'
                            });
                        }
                    }
                } catch (e) {}
            });
            
            ws.on('error', (err) => {
                obs.push({ phase: 'WebSocket', success: false, details: err.message });
            });
            
            // Close after 3 seconds
            setTimeout(() => {
                ws.close();
                
                if (!hasState) {
                    obs.push({ phase: 'Game State', success: false, details: 'Geen game state ontvangen' });
                }
                if (!hasBots) {
                    obs.push({ phase: 'Bot AI', success: false, details: `Slechts ${botCount} bots gezien` });
                }
                
                obs.push({
                    phase: 'Berichten',
                    success: messageCount > 10,
                    details: `${messageCount} berichten ontvangen in 3 seconden`
                });
                
                resolve(obs);
            }, 3000);
            
        } catch (err) {
            obs.push({ phase: 'WebSocket', success: false, details: err.message });
            resolve(obs);
        }
    });
    
    return [...observations, ...wsObservations];
}

// Get AI evaluation of the game
async function getAIEvaluation(tester, observations) {
    const observationText = observations.map(o => 
        `- ${o.phase}: ${o.success ? '✅' : '❌'} ${o.details}`
    ).join('\n');
    
    const prompt = `${tester.persona}

Je hebt zojuist MazeChase getest. Hier is wat je hebt waargenomen:

GAME BESCHRIJVING:
${GAME_DESCRIPTION}

TECHNISCHE TEST RESULTATEN:
${observationText}

Geef je feedback als ${tester.name} (${tester.age} jaar):

1. EERSTE INDRUK (1-10): Hoe aantrekkelijk ziet het spel eruit?
2. GAMEPLAY (1-10): Hoe leuk is het spelconcept?
3. MOEILIJKHEIDSGRAAD (1-10): Is het goed gebalanceerd voor jouw leeftijd?
4. FAMILY-VRIENDELIJK (1-10): Geschikt om samen te spelen?
5. VERSLAVEND (1-10): Zou je het opnieuw willen spelen?

STERKE PUNTEN (top 3):
VERBETERPUNTEN (top 3):
CONCRETE SUGGESTIES (minimaal 2):

Schrijf alsof je echt ${tester.name} bent, met je eigen taalgebruik en perspectief.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 1000
        });
        
        return response.choices[0].message.content;
    } catch (err) {
        console.error(`AI Error for ${tester.name}:`, err.message);
        return `[AI Evaluation failed: ${err.message}]`;
    }
}

// Generate improvement suggestions based on all feedback
async function generateImprovementPlan(allFeedback) {
    const prompt = `Je bent een game designer die feedback van 4 testers moet analyseren.

FEEDBACK VAN TESTERS:
${allFeedback.map(f => `
=== ${f.tester.name} (${f.tester.age} jaar) ===
${f.evaluation}
`).join('\n')}

HUIDIGE GAME BESCHRIJVING:
${GAME_DESCRIPTION}

Analyseer de feedback en maak een PRIORITEITEN LIJST van verbeteringen:

## PRIORITEIT 1 - KRITIEK (Moet nu gefixed)
Lijst van issues die het spel onbruikbaar of niet leuk maken.

## PRIORITEIT 2 - BELANGRIJK (Voor volgende versie)  
Features die het spel significant leuker maken.

## PRIORITEIT 3 - NICE TO HAVE (Toekomstige updates)
Extra features voor polish.

## CONCRETE IMPLEMENTATIE SUGGESTIES
Geef voor de top 5 verbeteringen concrete technische suggesties hoe dit geïmplementeerd kan worden.

## BALANS AANBEVELINGEN
Specifieke aanbevelingen voor game balancing (snelheid, timing, scores, etc.)

Focus op het creëren van een family game die zowel kinderen (8+) als volwassenen aanspreekt, met een bordspel-achtig gevoel maar toch competitief zoals Catan.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000
        });
        
        return response.choices[0].message.content;
    } catch (err) {
        console.error('AI Error for improvement plan:', err.message);
        return `[AI Analysis failed: ${err.message}]`;
    }
}

// Main test function
async function runAIGameTesters() {
    console.log('🎮 MazeChase AI Game Testers\n');
    console.log('=' .repeat(60));
    
    const allFeedback = [];
    
    for (const tester of TESTERS) {
        console.log(`\n🧪 Testing as ${tester.name} (${tester.age} jaar)...`);
        console.log('-'.repeat(40));
        
        // Register/Login
        const authResult = await registerUser(tester.username, tester.password);
        if (!authResult.success) {
            console.log(`❌ Auth failed: ${authResult.error}`);
            continue;
        }
        
        // Test game flow
        console.log('📋 Testing game flow...');
        const observations = await testGameFlow(tester, authResult.cookies);
        
        for (const obs of observations) {
            console.log(`  ${obs.success ? '✅' : '❌'} ${obs.phase}: ${obs.details}`);
        }
        
        // Get AI evaluation
        console.log('🤖 Getting AI evaluation...');
        const evaluation = await getAIEvaluation(tester, observations);
        
        console.log(`\n💬 ${tester.name}'s Feedback:`);
        console.log(evaluation);
        
        allFeedback.push({ tester, observations, evaluation });
        
        // Small delay between testers
        await new Promise(r => setTimeout(r, 1000));
    }
    
    // Generate improvement plan
    console.log('\n' + '='.repeat(60));
    console.log('📊 GENERATING IMPROVEMENT PLAN...');
    console.log('='.repeat(60));
    
    const improvementPlan = await generateImprovementPlan(allFeedback);
    console.log(improvementPlan);
    
    // Save results to file
    const results = {
        timestamp: new Date().toISOString(),
        testers: allFeedback.map(f => ({
            name: f.tester.name,
            age: f.tester.age,
            observations: f.observations,
            evaluation: f.evaluation
        })),
        improvementPlan
    };
    
    const fs = require('fs');
    const outputPath = require('path').join(__dirname, 'ai-test-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
    
    return results;
}

// Run if called directly
if (require.main === module) {
    runAIGameTesters()
        .then(() => {
            console.log('\n✅ AI Game Testing Complete!');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Error:', err);
            process.exit(1);
        });
}

module.exports = { runAIGameTesters, TESTERS };
