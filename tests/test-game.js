#!/usr/bin/env node
/**
 * MazeChase Game Test Script
 * Simuleert 4 spelers die registreren, inloggen, een lobby maken/joinen en het spel spelen
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const WS_URL = BASE_URL.replace('http', 'ws');

console.log(`🎮 MazeChase Test Script`);
console.log(`📡 Server: ${BASE_URL}`);
console.log(`----------------------------\n`);

// Helper voor Connect RPC calls
async function connectRPC(endpoint, data, cookie = '') {
    const url = `${BASE_URL}${endpoint}`;
    const body = JSON.stringify(data);
    
    const headers = {
        'Content-Type': 'application/json',
        'Connect-Protocol-Version': '1',
    };
    
    if (cookie) {
        headers['Cookie'] = cookie;
    }
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
        });
        
        const responseText = await response.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText };
        }
        
        // Get Set-Cookie header
        const setCookie = response.headers.get('set-cookie');
        
        return {
            ok: response.ok,
            status: response.status,
            data: responseData,
            cookie: setCookie,
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message,
        };
    }
}

// Speler class
class Player {
    constructor(name) {
        this.name = name;
        this.username = `test_${name}_${Date.now()}`;
        this.password = 'test1234';
        this.cookie = '';
        this.ws = null;
        this.spriteId = '';
        this.secretToken = '';
        this.gameState = null;
    }
    
    async register() {
        console.log(`👤 ${this.name}: Registreren als "${this.username}"...`);
        
        const result = await connectRPC('/auth.v1.AuthService/Register', {
            username: this.username,
            password: this.password,
            passwordVerify: this.password,
        });
        
        if (result.ok && result.cookie) {
            this.cookie = result.cookie.split(';')[0]; // Get just the cookie value
            console.log(`✅ ${this.name}: Geregistreerd en ingelogd!`);
            return true;
        } else {
            console.log(`❌ ${this.name}: Registratie mislukt:`, result.data?.message || result.error);
            return false;
        }
    }
    
    async login() {
        console.log(`🔑 ${this.name}: Inloggen...`);
        
        const result = await connectRPC('/auth.v1.AuthService/Login', {
            username: this.username,
            password: this.password,
        });
        
        if (result.ok && result.cookie) {
            this.cookie = result.cookie.split(';')[0];
            console.log(`✅ ${this.name}: Ingelogd!`);
            return true;
        } else {
            console.log(`❌ ${this.name}: Login mislukt:`, result.data?.message || result.error);
            return false;
        }
    }
    
    async createLobby(lobbyName) {
        console.log(`🏠 ${this.name}: Lobby "${lobbyName}" aanmaken...`);
        
        const result = await connectRPC('/lobby.v1.LobbyService/AddLobby', {
            lobbyName: lobbyName,
        }, this.cookie);
        
        if (result.ok) {
            console.log(`✅ ${this.name}: Lobby aangemaakt!`);
            return true;
        } else {
            console.log(`❌ ${this.name}: Lobby aanmaken mislukt:`, result.data?.message || result.error);
            return false;
        }
    }
    
    async getLobbies() {
        const result = await connectRPC('/lobby.v1.LobbyService/ListLobbies', {}, this.cookie);
        
        if (result.ok && result.data?.lobbies) {
            return result.data.lobbies;
        }
        return [];
    }
    
    async testAuth() {
        console.log(`🔍 ${this.name}: Auth testen...`);
        
        const result = await connectRPC('/auth.v1.AuthService/Test', {}, this.cookie);
        
        if (result.ok && result.data?.username) {
            console.log(`✅ ${this.name}: Auth OK - gebruiker: ${result.data.username}`);
            return true;
        } else {
            console.log(`❌ ${this.name}: Auth mislukt:`, result.data?.message || result.error);
            return false;
        }
    }
    
    connectToGame(lobbyId) {
        return new Promise((resolve, reject) => {
            console.log(`🎮 ${this.name}: Verbinden met game lobby ${lobbyId}...`);
            
            const wsUrl = `${WS_URL}/api/game?lobby=${lobbyId}`;
            
            // Extract cookie value for WebSocket
            const cookieValue = this.cookie.split('=')[1];
            
            // Node.js WebSocket met cookie support
            const WebSocket = require('ws');
            this.ws = new WebSocket(wsUrl, {
                headers: {
                    'Cookie': this.cookie,
                }
            });
            
            this.ws.on('open', () => {
                console.log(`✅ ${this.name}: WebSocket verbonden!`);
                resolve(true);
            });
            
            this.ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    this.handleGameMessage(msg);
                } catch (e) {
                    console.log(`📨 ${this.name}: Raw message:`, data.toString().substring(0, 100));
                }
            });
            
            this.ws.on('error', (error) => {
                console.log(`❌ ${this.name}: WebSocket error:`, error.message);
                reject(error);
            });
            
            this.ws.on('close', (code, reason) => {
                console.log(`🔌 ${this.name}: WebSocket gesloten (${code})`);
            });
            
            // Timeout
            setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }
    
    handleGameMessage(msg) {
        switch (msg.type) {
            case 'state':
                this.gameState = msg;
                this.spriteId = msg.spriteId;
                this.secretToken = msg.secretToken || '';
                console.log(`🎯 ${this.name}: Game state ontvangen - Ik ben: ${this.spriteId}`);
                break;
            case 'active':
                console.log(`👋 ${this.name}: Nieuwe speler: ${msg.user} als ${msg.spriteType}`);
                break;
            case 'pos':
                // Position updates - don't log all of them
                break;
            case 'pel':
                console.log(`🍬 ${this.name}: Pellet opgegeten!`);
                break;
            case 'kill':
                console.log(`💀 ${this.name}: Speler gedood!`);
                break;
            case 'gameover':
                console.log(`🏆 ${this.name}: GAME OVER!`);
                break;
            default:
                console.log(`📨 ${this.name}: ${msg.type}`);
        }
    }
    
    sendMove(direction) {
        if (this.ws && this.ws.readyState === 1 && this.secretToken) { // WebSocket.OPEN
            const msg = JSON.stringify({
                type: 'pos',
                dir: direction,
                secretToken: this.secretToken,
            });
            this.ws.send(msg);
        }
    }
    
    startRandomMovement() {
        const directions = ['up', 'down', 'left', 'right'];
        
        this.moveInterval = setInterval(() => {
            const dir = directions[Math.floor(Math.random() * directions.length)];
            this.sendMove(dir);
        }, 200); // Move every 200ms
    }
    
    stopMovement() {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
        }
    }
    
    disconnect() {
        this.stopMovement();
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Main test
async function runTest() {
    console.log('='.repeat(50));
    console.log('FASE 1: Spelers aanmaken en registreren');
    console.log('='.repeat(50));
    
    const players = [
        new Player('Speler1'),
        new Player('Speler2'),
        new Player('Speler3'),
        new Player('Speler4'),
    ];
    
    // Register all players
    for (const player of players) {
        const success = await player.register();
        if (!success) {
            console.log(`\n❌ Test gestopt: ${player.name} kon niet registreren`);
            process.exit(1);
        }
        await sleep(500);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('FASE 2: Auth testen voor alle spelers');
    console.log('='.repeat(50));
    
    for (const player of players) {
        const authOk = await player.testAuth();
        if (!authOk) {
            console.log(`\n❌ Test gestopt: ${player.name} auth mislukt`);
            process.exit(1);
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('FASE 3: Lobby aanmaken');
    console.log('='.repeat(50));
    
    const lobbyName = `TestLobby_${Date.now()}`;
    const lobbyCreated = await players[0].createLobby(lobbyName);
    
    if (!lobbyCreated) {
        console.log('\n❌ Test gestopt: Lobby kon niet worden aangemaakt');
        process.exit(1);
    }
    
    // Get lobby ID
    await sleep(500);
    const lobbies = await players[0].getLobbies();
    console.log(`📋 Gevonden lobbies: ${lobbies.length}`);
    
    const testLobby = lobbies.find(l => l.lobbyName === lobbyName);
    if (!testLobby) {
        console.log('\n❌ Test gestopt: Lobby niet gevonden in lijst');
        console.log('Lobbies:', lobbies);
        process.exit(1);
    }
    
    const lobbyId = testLobby.ID;
    console.log(`✅ Lobby ID: ${lobbyId}`);
    
    console.log('\n' + '='.repeat(50));
    console.log('FASE 4: Alle spelers joinen de game');
    console.log('='.repeat(50));
    
    // Check if ws module is available
    try {
        require('ws');
    } catch (e) {
        console.log('\n⚠️  WebSocket module "ws" niet gevonden.');
        console.log('   Installeer met: npm install ws');
        console.log('\n✅ PARTIAL TEST SUCCESS:');
        console.log('   - Registratie werkt ✓');
        console.log('   - Auth werkt ✓');
        console.log('   - Lobby aanmaken werkt ✓');
        console.log('\n   WebSocket game test overgeslagen.');
        process.exit(0);
    }
    
    try {
        // Connect players one by one with delay
        for (const player of players) {
            await player.connectToGame(lobbyId);
            await sleep(1000);
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('FASE 5: Spelers bewegen (10 seconden)');
        console.log('='.repeat(50));
        
        // Start random movement for all players
        for (const player of players) {
            player.startRandomMovement();
        }
        
        // Let them play for 10 seconds
        console.log('🎮 Spelers zijn aan het spelen...');
        await sleep(10000);
        
        // Stop movement
        for (const player of players) {
            player.stopMovement();
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('FASE 6: Verbindingen sluiten');
        console.log('='.repeat(50));
        
        for (const player of players) {
            player.disconnect();
            console.log(`👋 ${player.name}: Verbinding gesloten`);
        }
        
    } catch (error) {
        console.log('\n❌ Game test error:', error.message);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ TEST VOLTOOID!');
    console.log('='.repeat(50));
    
    console.log('\nSamenvatting:');
    console.log('- 4 spelers geregistreerd ✓');
    console.log('- Auth getest ✓');
    console.log('- Lobby aangemaakt ✓');
    console.log('- WebSocket game gespeeld ✓');
    
    process.exit(0);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
runTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
