// API Base URL - si adatta automaticamente all'ambiente
const API_BASE = getAPIBase();

function getAPIBase() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return `${window.location.protocol}//${window.location.host}/api`;
}

// Global state
let gameState = {
    token: localStorage.getItem('token'),
    user: null,
    character: null,
    currentLocation: null,
    inCombat: false,
    gameData: {}
};

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    try {
        // Controlla se c'è un token salvato
        if (gameState.token) {
            // Carica i dati dell'utente
            const user = await apiCall('/auth/me', 'GET');
            gameState.user = user;
            showCharacterSelection();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Init error:', error);
        showLoginScreen();
    } finally {
        hideScreen('loading-screen');
    }
}

// ============================================================================
// SCREEN MANAGEMENT
// ============================================================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}

function hideScreen(screenId) {
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.remove('active');
    }
}

function showElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('show');
    }
}

function hideElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.add('hidden');
        el.classList.remove('show');
    }
}

// ============================================================================
// API COMMUNICATION
// ============================================================================

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (gameState.token) {
        options.headers['Authorization'] = `Bearer ${gameState.token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

function showNotification(message, type = 'success') {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = `notification ${type === 'error' ? 'error' : 'success'}`;
    notif.classList.remove('hidden');

    setTimeout(() => {
        notif.classList.add('hidden');
    }, 3000);
}

function showMessage(elementId, message, type = 'error') {
    const msgEl = document.getElementById(elementId);
    msgEl.textContent = message;
    msgEl.className = `message show ${type}`;
}

// ============================================================================
// AUTH SCREENS
// ============================================================================

function showLoginScreen() {
    showScreen('login-screen');
}

function showRegisterForm() {
    showElement('register-form-container');
}

function hideRegisterForm() {
    hideElement('register-form-container');
    document.getElementById('register-form').reset();
}

// Login Form
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await apiCall('/auth/login', 'POST', { email, password });
        gameState.token = response.token;
        gameState.user = response.user;

        localStorage.setItem('token', response.token);
        
        showCharacterSelection();
        showNotification('Login avvenuto con successo!', 'success');
    } catch (error) {
        showMessage('login-message', error.message, 'error');
    }
});

// Register Form
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (password.length < 8) {
        showMessage('login-message', 'Password deve essere almeno 8 caratteri', 'error');
        return;
    }

    try {
        const response = await apiCall('/auth/register', 'POST', {
            username,
            email,
            password,
        });

        gameState.token = response.token;
        gameState.user = response.user;

        localStorage.setItem('token', response.token);

        hideRegisterForm();
        showCharacterSelection();
        showNotification('Registrazione avvenuta! Benvenuto!', 'success');
    } catch (error) {
        showMessage('login-message', error.message, 'error');
    }
});

// ============================================================================
// CHARACTER SELECTION & CREATION
// ============================================================================

async function showCharacterSelection() {
    showScreen('character-screen');

    try {
        const characters = await apiCall('/characters', 'GET');
        const list = document.getElementById('characters-list');
        list.innerHTML = '';

        if (characters.length === 0) {
            list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nessun personaggio. Creane uno!</p>';
        } else {
            characters.forEach(char => {
                const card = document.createElement('div');
                card.className = 'character-card';
                card.innerHTML = `
                    <h3>${char.name}</h3>
                    <p>Razza: ${char.race}</p>
                    <p>Classe: ${char.class}</p>
                    <p>Livello: ${char.level || 1}</p>
                `;
                card.onclick = () => selectCharacter(char.id);
                list.appendChild(card);
            });
        }
    } catch (error) {
        showNotification('Errore nel caricamento dei personaggi', 'error');
    }
}

function showCharacterCreation() {
    showScreen('creation-screen');
}

function showCharacterSelection() {
    showScreen('character-screen');
}

document.getElementById('creation-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('char-name').value;
    const race = document.getElementById('char-race').value;
    const characterClass = document.getElementById('char-class').value;

    try {
        const character = await apiCall('/characters', 'POST', {
            name,
            race,
            class: characterClass,
        });

        gameState.character = character;
        showNotification('Personaggio creato!', 'success');
        showGame();
    } catch (error) {
        showMessage('creation-message', error.message, 'error');
    }
});

async function selectCharacter(characterId) {
    try {
        const character = await apiCall(`/characters/${characterId}`, 'GET');
        gameState.character = character;
        showGame();
    } catch (error) {
        showNotification('Errore nel caricamento del personaggio', 'error');
    }
}

// ============================================================================
// GAME SCREEN
// ============================================================================

function showGame() {
    showScreen('game-screen');
    updatePlayerInfo();
    loadMap();
}

function updatePlayerInfo() {
    if (!gameState.character) return;

    document.getElementById('player-name').textContent = gameState.character.name;
    document.getElementById('player-level').textContent = gameState.character.level || 1;
    document.getElementById('player-exp').textContent = gameState.character.experience || 0;

    const maxHp = gameState.character.max_hp || 100;
    const currentHp = gameState.character.hp || maxHp;
    const healthPercent = (currentHp / maxHp) * 100;

    document.getElementById('health-fill').style.width = `${healthPercent}%`;
    document.getElementById('health-text').textContent = `${currentHp}/${maxHp} HP`;
}

async function loadMap() {
    try {
        const data = await apiCall('/map/current', 'GET');
        gameState.currentLocation = data;

        // Mostra la mappa
        const grid = document.getElementById('map-grid');
        grid.innerHTML = '';

        for (let i = 0; i < 64; i++) {
            const tile = document.createElement('div');
            tile.className = 'map-tile';
            tile.textContent = '□';
            if (i === 31) {
                tile.classList.add('active');
                tile.textContent = '⊚';
            }
            grid.appendChild(tile);
        }

        // Aggiorna info locazione
        document.getElementById('location-name').textContent = data.name || 'Sconosciuta';
        document.getElementById('location-desc').textContent = data.description || 'Una location misteriosa';

        // Azioni disponibili
        const actions = document.getElementById('location-actions');
        actions.innerHTML = `
            <button class="action-btn" onclick="travelToLocation()">Viaggia</button>
            <button class="action-btn" onclick="exploreArea()">Esplora</button>
            <button class="action-btn" onclick="restoreHP()">Riposa</button>
        `;
    } catch (error) {
        console.error('Map load error:', error);
    }
}

function travelToLocation() {
    showNotification('Sistema di viaggio in arrivo...', 'success');
}

function exploreArea() {
    showNotification('Hai iniziato l\'esplorazione!', 'success');
    startRandomEncounter();
}

function restoreHP() {
    if (gameState.character) {
        gameState.character.hp = gameState.character.max_hp || 100;
        updatePlayerInfo();
        showNotification('Hai riposto e recuperato HP!', 'success');
    }
}

async function startRandomEncounter() {
    try {
        // Simula un incontro casuale
        showElement('combat-view');
        hideElement('map-view');
        
        const combat = await apiCall('/combat/start', 'POST', {
            character_id: gameState.character.id,
        });

        gameState.inCombat = true;
        updateCombatUI(combat);
    } catch (error) {
        console.error('Combat error:', error);
        showNotification('Errore nell\'avvio del combattimento', 'error');
    }
}

function updateCombatUI(combat) {
    // Aggiorna UI combattimento
    document.getElementById('player-combat-name').textContent = gameState.character.name;
    document.getElementById('enemy-name').textContent = combat.enemy?.name || 'Nemico';

    const playerHealth = gameState.character.hp / gameState.character.max_hp * 100;
    const enemyHealth = combat.enemy?.hp / combat.enemy?.max_hp * 100 || 50;

    document.getElementById('player-health-fill').style.width = `${playerHealth}%`;
    document.getElementById('enemy-health-fill').style.width = `${enemyHealth}%`;

    // Bottoni azioni
    const actions = document.getElementById('combat-actions');
    actions.innerHTML = `
        <button class="action-btn" onclick="performAction('attack')">Attacca</button>
        <button class="action-btn" onclick="performAction('defend')">Difendi</button>
        <button class="action-btn" onclick="performAction('ability')">Abilità</button>
        <button class="action-btn" onclick="performAction('item')">Oggetto</button>
    `;
}

async function performAction(action) {
    try {
        const result = await apiCall('/combat/action', 'POST', {
            character_id: gameState.character.id,
            action,
        });

        addCombatLog(`Hai usato: ${action}`);

        if (result.victory) {
            addCombatLog('Hai vinto il combattimento!');
            showNotification('Vittoria!', 'success');
            endCombat();
        } else if (result.defeat) {
            addCombatLog('Sei stato sconfitto...');
            showNotification('Sconfitta!', 'error');
            endCombat();
        }
    } catch (error) {
        addCombatLog(`Errore: ${error.message}`);
    }
}

function addCombatLog(message) {
    const log = document.getElementById('combat-log');
    const entry = document.createElement('div');
    entry.className = 'combat-log-entry';
    entry.textContent = message;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function endCombat() {
    gameState.inCombat = false;
    hideElement('combat-view');
    showElement('map-view');
    updatePlayerInfo();
    loadMap();
}

// ============================================================================
// MENU
// ============================================================================

function showMenu() {
    showScreen('menu-screen');
}

function closeMenu() {
    showScreen('game-screen');
}

function showSettings() {
    showNotification('Impostazioni in arrivo...', 'success');
}

function showStats() {
    showNotification('Statistiche: Liv ' + (gameState.character?.level || 1), 'success');
}

function saveGame() {
    try {
        apiCall(`/checkpoint`, 'POST', {
            character_id: gameState.character.id,
            data: gameState.character,
        });
        showNotification('Gioco salvato!', 'success');
    } catch (error) {
        showNotification('Errore nel salvataggio', 'error');
    }
}

function logout() {
    gameState.token = null;
    gameState.user = null;
    gameState.character = null;

    localStorage.removeItem('token');

    showLoginScreen();
    document.getElementById('login-form').reset();
    showNotification('Disconnesso', 'success');
}

// ============================================================================
// INIT ON LOAD
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    init();
});
