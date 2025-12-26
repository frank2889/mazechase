// Test: 1 speler joint, wacht 12 seconden, check of bots zijn toegevoegd
const WebSocket = require('ws');
const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:8080';

function httpRequest(method, path, body = null, cookie = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (cookie) {
            options.headers['Cookie'] = `Authorization=${cookie}`;
        }

        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(options, (res) => {
            let data = '';
            const cookies = res.headers['set-cookie'];
            let authCookie = null;
            if (cookies) {
                for (const c of cookies) {
                    if (c.startsWith('Authorization=')) {
                        authCookie = c.split(';')[0].split('=')[1];
                    }
                }
            }
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ data: JSON.parse(data), cookie: authCookie, status: res.statusCode });
                } catch {
                    resolve({ data: data, cookie: authCookie, status: res.statusCode });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log('🎮 Bot Auto-Fill Test');
    console.log('='.repeat(50));
    
    const timestamp = Date.now();
    const username = `bottest_${timestamp}`;
    
    // 1. Register player
    console.log(`\n📝 Registreren als ${username}...`);
    const regRes = await httpRequest('POST', '/auth.v1.AuthService/Register', {
        username: username,
        password: 'test123',
        passwordVerify: 'test123'
    });
    
    if (!regRes.cookie) {
        console.log('❌ Registratie mislukt');
        return;
    }
    console.log('✅ Geregistreerd!');
    const authCookie = regRes.cookie;
    
    // 2. Create lobby
    console.log('\n🏠 Lobby aanmaken...');
    const lobbyRes = await httpRequest('POST', '/lobby.v1.LobbyService/CreateLobby', {
        name: `BotTestLobby_${timestamp}`
    }, authCookie);
    console.log('✅ Lobby aangemaakt!');
    
    // 3. Get lobby ID
    const listRes = await httpRequest('POST', '/lobby.v1.LobbyService/ListLobbies', {}, authCookie);
    console.log('Lobbies:', JSON.stringify(listRes.data));
    const lobbies = listRes.data.lobbies || [];
    // Find our lobby or use the last created one
    let lobby = lobbies.find(l => l.lobbyName?.includes('BotTestLobby'));
    if (!lobby && lobbies.length > 0) {
        lobby = lobbies[lobbies.length - 1];
    }
    if (!lobby) {
        console.log('❌ Lobby niet gevonden');
        return;
    }
    // ID can be string or number
    const lobbyId = lobby.ID || lobby.id;
    console.log(`📋 Lobby ID: ${lobbyId}`);
    
    // 4. Connect to WebSocket
    console.log('\n🎮 Verbinden met game...');
    const wsUrl = `ws://localhost:8080/api/game?lobby=${lobbyId}`;
    const ws = new WebSocket(wsUrl, {
        headers: { 'Cookie': `Authorization=${authCookie}` }
    });
    
    let myRole = '';
    let botsJoined = [];
    
    ws.on('open', () => {
        console.log('✅ WebSocket verbonden!');
        console.log('\n⏳ Wachten op bots (10 seconden)...');
    });
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            
            if (msg.type === 'state') {
                myRole = msg.spriteId;
                console.log(`🎯 Ik ben: ${myRole}`);
                
                // Check for existing bots in activePlayers
                if (msg.activePlayers) {
                    for (const [sprite, info] of Object.entries(msg.activePlayers)) {
                        if (info.username?.includes('Bot')) {
                            botsJoined.push({ sprite, username: info.username });
                            console.log(`🤖 Bot al aanwezig: ${info.username} als ${sprite}`);
                        }
                    }
                }
            } else if (msg.type === 'join' && msg.username?.includes('Bot')) {
                botsJoined.push({ sprite: msg.spriteId, username: msg.username });
                console.log(`🤖 Bot joined: ${msg.username} als ${msg.spriteId}`);
            } else if (msg.type === 'pos' && msg.spriteId) {
                // Bot movement - don't spam logs, just track
            }
        } catch (e) {
            // ignore
        }
    });
    
    ws.on('error', (err) => {
        console.log('❌ WebSocket error:', err.message);
    });
    
    // Wait 12 seconds for bots to be added
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTAAT:');
    console.log(`   Mijn rol: ${myRole}`);
    console.log(`   Bots toegevoegd: ${botsJoined.length}`);
    
    if (botsJoined.length === 3) {
        console.log('\n✅ SUCCES! 3 bots zijn automatisch toegevoegd!');
        botsJoined.forEach(b => console.log(`   - ${b.username} als ${b.sprite}`));
    } else if (botsJoined.length > 0) {
        console.log(`\n⚠️ ${botsJoined.length} bots toegevoegd (verwacht: 3)`);
    } else {
        console.log('\n❌ Geen bots toegevoegd');
    }
    
    // Cleanup
    ws.close();
    
    // Delete lobby
    await httpRequest('POST', '/lobby.v1.LobbyService/DeleteLobby', { id: lobbyId }, authCookie);
    console.log('\n🧹 Lobby verwijderd');
    console.log('='.repeat(50));
}

main().catch(console.error);
