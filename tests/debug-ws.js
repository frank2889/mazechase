#!/usr/bin/env node
/**
 * Debug WebSocket connection en message flow
 */

const WebSocket = require('ws');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const WS_URL = BASE_URL.replace('http', 'ws');

console.log('MazeChase WebSocket Debug');
console.log(`Server: ${BASE_URL}`);
console.log('----------------------------\n');

// 1. Eerst registreren/inloggen
async function login() {
    const username = 'debugtest' + Date.now();
    const password = 'test123';
    
    console.log(`1. Registreren als ${username}...`);
    
    // Probeer login met bestaand account
    console.log('   Trying login with existing account (frank/frank123)...');
    const loginRes = await fetch(`${BASE_URL}/auth.v1.AuthService/Login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Connect-Protocol-Version': '1',
        },
        body: JSON.stringify({ username: 'frank', password: 'frank123' }),
    });
    
    let loginCookie = loginRes.headers.get('set-cookie');
    if (loginRes.ok && loginCookie) {
        console.log(`   Login OK!`);
        return { username: 'frank', cookie: loginCookie };
    }
    
    // Probeer registratie
    console.log('   Login failed, trying register...');
    const registerRes = await fetch(`${BASE_URL}/auth.v1.AuthService/Register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Connect-Protocol-Version': '1',
        },
        body: JSON.stringify({ username, password }),
    });
    
    const regCookie = registerRes.headers.get('set-cookie');
    if (registerRes.ok && regCookie) {
        console.log(`   Registered: ${username}`);
        return { username, cookie: regCookie };
    }
    
    const text = await registerRes.text();
    console.log(`   Both failed. Response: ${text.substring(0, 200)}`);
    throw new Error('Cannot login or register');
}

// 2. Lobby maken
async function createLobby(cookie) {
    console.log('\n2. Lobby aanmaken...');
    
    const res = await fetch(`${BASE_URL}/lobby.v1.LobbyService/AddLobby`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Connect-Protocol-Version': '1',
            'Cookie': cookie,
        },
        body: JSON.stringify({ lobbyName: 'Debug Test' }),
    });
    
    const text = await res.text();
    console.log(`   Response: ${text.substring(0, 200)}`);
    
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.log(`   Parse error: ${e.message}`);
        throw new Error('Cannot parse lobby response');
    }
    
    if (data.lobbyId) {
        console.log(`   Lobby ID: ${data.lobbyId}`);
        return data.lobbyId;
    }
    
    // Fallback: list lobbies
    const listRes = await fetch(`${BASE_URL}/lobby.v1.LobbyService/ListLobbies`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Connect-Protocol-Version': '1',
            'Cookie': cookie,
        },
        body: JSON.stringify({}),
    });
    const listData = await listRes.json();
    if (listData.lobbies && listData.lobbies.length > 0) {
        const lobbyId = listData.lobbies[0].id;
        console.log(`   Using existing lobby ID: ${lobbyId}`);
        return lobbyId;
    }
    
    throw new Error('Could not create or find lobby');
}

// 3. WebSocket verbinden
async function connectGame(lobbyId, cookie) {
    console.log(`\n3. WebSocket verbinden met lobby ${lobbyId}...`);
    
    const wsUrl = `${WS_URL}/api/game?lobby=${lobbyId}`;
    console.log(`   URL: ${wsUrl}`);
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl, {
            headers: {
                'Cookie': cookie,
            },
        });
        
        const messages = [];
        
        ws.on('open', () => {
            console.log('   WebSocket CONNECTED!');
        });
        
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            messages.push(msg);
            console.log(`   MESSAGE [${msg.type}]: ${JSON.stringify(msg).substring(0, 200)}`);
            
            if (msg.type === 'state') {
                console.log('\n4. State message ontvangen!');
                console.log(`   spriteId: ${msg.spriteId}`);
                console.log(`   spriteType: ${msg.spriteType}`);
                console.log(`   username: ${msg.username}`);
                console.log(`   activePlayers: ${JSON.stringify(msg.activePlayers)}`);
                console.log(`   secretToken: ${msg.secretToken ? 'present' : 'MISSING!'}`);
                
                // Stuur pos message om te testen
                setTimeout(() => {
                    console.log('\n5. Stuur pos message...');
                    const posMsg = {
                        type: 'pos',
                        secretToken: msg.secretToken,
                        x: 110,
                        y: 220,
                        dir: 'right',
                    };
                    ws.send(JSON.stringify(posMsg));
                    console.log(`   Sent: ${JSON.stringify(posMsg)}`);
                }, 1000);
                
                // Wacht op bots
                setTimeout(() => {
                    console.log('\n6. Wachten op bots (10 sec delay)...');
                }, 5000);
                
                // Check na 15 seconden
                setTimeout(() => {
                    console.log('\n7. Alle ontvangen messages:');
                    for (const m of messages) {
                        console.log(`   - ${m.type}: ${JSON.stringify(m).substring(0, 100)}`);
                    }
                    ws.close();
                    resolve(messages);
                }, 15000);
            }
        });
        
        ws.on('error', (err) => {
            console.error(`   WebSocket ERROR: ${err.message}`);
            reject(err);
        });
        
        ws.on('close', () => {
            console.log('   WebSocket CLOSED');
        });
    });
}

// Main
async function main() {
    try {
        const { username, cookie } = await login();
        if (!cookie) {
            console.error('FOUT: Geen cookie ontvangen!');
            return;
        }
        
        const lobbyId = await createLobby(cookie);
        const messages = await connectGame(lobbyId, cookie);
        
        console.log('\n========== SAMENVATTING ==========');
        const msgTypes = messages.map(m => m.type);
        console.log(`Ontvangen message types: ${msgTypes.join(', ')}`);
        
        const hasState = msgTypes.includes('state');
        const hasActive = msgTypes.includes('active');
        const hasPos = msgTypes.includes('pos');
        
        console.log(`\n- state message: ${hasState ? 'OK' : 'ONTBREEKT!'}`);
        console.log(`- active message (bots): ${hasActive ? 'OK' : 'Geen bots gezien'}`);
        console.log(`- pos messages: ${hasPos ? 'OK' : 'Geen beweging gezien'}`);
        
        if (hasState && hasActive && hasPos) {
            console.log('\nALLE TESTS GESLAAGD!');
        } else {
            console.log('\nSommige tests gefaald, check de output hierboven.');
        }
        
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
