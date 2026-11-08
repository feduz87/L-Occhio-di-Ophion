const classes = {
  knight: { name: 'Cavaliere', health: 36, attack: 7, description: 'Una lama salda e uno scudo fedele.' },
  mage: { name: 'Arcanista', health: 27, attack: 10, description: 'La magia antica brucia nelle tue mani.' },
  ranger: { name: 'Ranger', health: 31, attack: 8, description: 'Occhi vigili e colpi che non falliscono.' }
};

const enemies = [
  { name: 'Lupo di bruma', description: 'Un ringhio rompe il silenzio tra gli alberi.', health: 18, attack: 5, xp: 12 },
  { name: 'Goblin delle radici', description: 'Una creatura armata di ferraglia ti sbarra il passo.', health: 22, attack: 4, xp: 14 },
  { name: "Corvo d'ombra", description: 'Ali nere scendono in picchiata dalla nebbia.', health: 16, attack: 6, xp: 13 },
  { name: 'Guardiano di pietra', description: 'Una figura scolpita si anima con un cupo scricchiolio.', health: 27, attack: 5, xp: 18 }
];

const elements = Object.fromEntries([
  'setup', 'adventure', 'hero-form', 'hero-name', 'hero-class', 'hero-title', 'hero-class-name',
  'hero-level', 'hero-health-text', 'hero-health-meter', 'hero-xp-text', 'hero-xp-meter',
  'potion-count', 'encounter-label', 'enemy-title', 'enemy-description', 'enemy-health-text',
  'enemy-health-meter', 'turn-indicator', 'actions', 'attack-button', 'potion-button',
  'defend-button', 'next-button', 'battle-log', 'restart-button'
].map((id) => [id, document.getElementById(id)]));

let hero;
let enemy;
let encounter = 0;
let potions = 3;
let turn = 'player';
let gameOver = false;
let enemyTurnTimeout;

elements['hero-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  const selectedClass = classes[elements['hero-class'].value];
  hero = {
    name: elements['hero-name'].value.trim() || 'Viandante',
    class: selectedClass,
    health: selectedClass.health,
    maxHealth: selectedClass.health,
    attack: selectedClass.attack,
    level: 1,
    xp: 0
  };
  encounter = 0;
  potions = 3;
  elements.setup.hidden = true;
  elements.adventure.hidden = false;
  startEncounter();
});

elements['attack-button'].addEventListener('click', () => {
  if (!isPlayerTurn()) return;
  const damage = Math.max(1, hero.attack + randomInt(-2, 2) + Math.floor((hero.level - 1) / 2));
  enemy.health = Math.max(0, enemy.health - damage);
  addLog(`${hero.name} attacca ${enemy.name} e infligge ${damage} danni.`);
  updateStatus();
  if (enemy.health === 0) winEncounter();
  else enemyTurn();
});

elements['potion-button'].addEventListener('click', () => {
  if (!isPlayerTurn() || potions === 0 || hero.health === hero.maxHealth) return;
  const healing = Math.min(14, hero.maxHealth - hero.health);
  hero.health += healing;
  potions -= 1;
  addLog(`${hero.name} usa una pozione e recupera ${healing} punti salute.`);
  updateStatus();
  enemyTurn();
});

elements['defend-button'].addEventListener('click', () => {
  if (!isPlayerTurn()) return;
  addLog(`${hero.name} si prepara a parare il prossimo colpo.`);
  enemyTurn(true);
});

elements['next-button'].addEventListener('click', startEncounter);
elements['restart-button'].addEventListener('click', () => {
  window.clearTimeout(enemyTurnTimeout);
  elements.adventure.hidden = true;
  elements.setup.hidden = false;
  elements['hero-name'].focus();
});

function isPlayerTurn() {
  return turn === 'player' && !gameOver;
}

function startEncounter() {
  encounter += 1;
  const template = enemies[randomInt(0, enemies.length - 1)];
  const maxHealth = template.health + Math.floor((encounter - 1) / 3) * 3;
  enemy = { ...template, health: maxHealth, maxHealth };
  turn = 'player';
  gameOver = false;
  elements['actions'].hidden = false;
  elements['next-button'].hidden = true;
  elements['turn-indicator'].textContent = 'Scegli un’azione';
  elements['encounter-label'].textContent = `Incontro ${encounter}`;
  elements['enemy-title'].textContent = enemy.name;
  elements['enemy-description'].textContent = enemy.description;
  elements['battle-log'].replaceChildren();
  addLog(`${enemy.description} ${hero.name}, è il tuo turno.`);
  updateStatus();
}

function enemyTurn(defending = false) {
  turn = 'enemy';
  elements['turn-indicator'].textContent = 'Il nemico si muove…';
  setActionsDisabled(true);
  enemyTurnTimeout = window.setTimeout(() => {
    enemyTurnTimeout = undefined;
    if (gameOver) return;
    const damage = Math.max(1, enemy.attack + randomInt(-1, 1) - (defending ? 4 : 0));
    hero.health = Math.max(0, hero.health - damage);
    const damageLabel = damage === 1 ? 'danno' : 'danni';
    addLog(`${enemy.name} colpisce ${hero.name} per ${damage} ${damageLabel}${defending ? ', ma la parata attutisce il colpo' : ''}.`);
    updateStatus();
    if (hero.health === 0) {
      endGame();
      return;
    }
    turn = 'player';
    elements['turn-indicator'].textContent = 'Scegli un’azione';
    setActionsDisabled(false);
  }, 450);
}

function winEncounter() {
  hero.xp += enemy.xp;
  addLog(`${enemy.name} è sconfitto. Hai guadagnato ${enemy.xp} punti esperienza.`);
  const xpToLevel = hero.level * 25;
  if (hero.xp >= xpToLevel) {
    hero.xp -= xpToLevel;
    hero.level += 1;
    hero.maxHealth += 5;
    hero.health = Math.min(hero.maxHealth, hero.health + 5);
    hero.attack += 1;
    addLog(`Livello ${hero.level}! La tua salute massima aumenta e i tuoi attacchi sono più forti.`);
  }
  turn = 'ended';
  elements['turn-indicator'].textContent = 'Nemico sconfitto';
  elements['actions'].hidden = true;
  elements['next-button'].hidden = false;
  updateStatus();
}

function endGame() {
  gameOver = true;
  turn = 'ended';
  elements['turn-indicator'].textContent = 'Avventura terminata';
  elements['actions'].hidden = true;
  elements['next-button'].hidden = true;
  addLog(`${hero.name} cade nella nebbia dopo ${encounter} ${encounter === 1 ? 'incontro' : 'incontri'}. Ricomincia per tentare di nuovo.`);
}

function updateStatus() {
  elements['hero-title'].textContent = hero.name;
  elements['hero-class-name'].textContent = hero.class.description;
  elements['hero-level'].textContent = `Liv. ${hero.level}`;
  elements['hero-health-text'].textContent = `${hero.health} / ${hero.maxHealth}`;
  elements['hero-health-meter'].style.width = `${(hero.health / hero.maxHealth) * 100}%`;
  elements['hero-xp-text'].textContent = `${hero.xp} / ${hero.level * 25}`;
  elements['hero-xp-meter'].style.width = `${(hero.xp / (hero.level * 25)) * 100}%`;
  elements['potion-count'].textContent = potions;
  elements['enemy-health-text'].textContent = `${enemy.health} / ${enemy.maxHealth}`;
  elements['enemy-health-meter'].style.width = `${(enemy.health / enemy.maxHealth) * 100}%`;
  elements['potion-button'].disabled = potions === 0 || hero.health === hero.maxHealth || turn !== 'player';
}

function setActionsDisabled(disabled) {
  elements['attack-button'].disabled = disabled;
  elements['defend-button'].disabled = disabled;
  elements['potion-button'].disabled = disabled || potions === 0 || hero.health === hero.maxHealth;
}

function addLog(message) {
  const entry = document.createElement('p');
  entry.textContent = message;
  elements['battle-log'].prepend(entry);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
