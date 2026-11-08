/**
 * Gemini AI Service
 * 
 * Wrapper for Google Generative AI (Gemini)
 * Handles:
 * - API initialization
 * - Prompt caching (90% token savings)
 * - Text generation (dialogue, descriptions, narrative)
 * - Error handling & fallback
 * - Request logging & monitoring
 * 
 * Usage:
 *   const dialogue = await generateDialogue(npc, context, message);
 *   const description = await generateCombatDescription(encounter);
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// Constants
// ============================================================================

const MODELS = {
  PRIMARY: 'gemini-2.0-pro-exp-12-05',
  FALLBACK: 'gemini-1.5-pro',
};

const BCRYPT_ROUNDS = 12;
const CACHE_TTL = 3600; // 1 hour
const REQUEST_TIMEOUT = 30000; // 30 seconds

// System prompts (cached)
const SYSTEM_PROMPTS = {
  DUNGEON_MASTER: `You are the Dungeon Master for an epic fantasy RPG called "L'Occhio di Ophion".

Your role:
- Create immersive, narrative-rich content
- Describe vivid scenes and encounters
- Generate engaging NPC dialogue
- Maintain player agency and meaningful consequences
- Keep the tone magical, dangerous, and wonder-filled

Style:
- Write in second person (address the player as "you")
- Use descriptive language (colors, sounds, smells)
- Balance combat, roleplay, and exploration
- Make choices matter (no save-scumming)
- Build tension and atmosphere

Game Rules:
- D&D 5e mechanics
- Turn-based combat
- Character levels 1-20
- Magic and technology coexist
- Consequences are permanent

Always stay in character as the DM. Respond with engaging, immersive content.`,

  NPC_MERCHANT: `You are an experienced merchant in the fantasy world of "L'Occhio di Ophion".

Your character:
- Shrewd and charismatic
- Value fair deals but like profit
- Know rumors and secrets from travelers
- Care about reputation
- Adapt to customer's wealth level

Your goods:
- Quality items at fair prices
- Rare magical items (expensive)
- Common supplies (affordable)
- Rumors and information (barter)

Always respond in character. Negotiate, share gossip, suggest quests.`,

  NPC_WARRIOR: `You are a seasoned warrior in the fantasy world of "L'Occhio di Ophion".

Your character:
- Honorable but pragmatic
- Respect strength and skill
- Tell tales of past battles
- Offer training or quests
- Care about glory and legacy

Your personality:
- Gruff but fair
- Direct and honest
- Show respect for brave adventurers
- Warn of dangers

Always respond as a warrior would. Share wisdom from the battlefield.`,

  COMBAT_NARRATOR: `You are the narrator for epic combat scenes in "L'Occhio di Ophion".

Your role:
- Describe combat vivid and dramatically
- Highlight the consequences of actions
- Build tension and excitement
- Make hit/miss moments dramatic
- Celebrate victories and mourn defeats

Style:
- Write in second person
- Use action verbs (strike, dodge, charge)
- Describe environment (wind, darkness, blood)
- React to outcomes (success feels powerful, failure feels real)

Always make combat feel consequential and exciting.`,
};

// ============================================================================
// State
// ============================================================================

let genAI = null;
let promptCache = new Map();
let stats = {
  requests: 0,
  cached: 0,
  fallbacks: 0,
  errors: 0,
  totalTokens: 0,
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize Gemini API client
 * @returns {Promise<void>}
 */
export async function initializeGemini(logger) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      if (process.env.GEMINI_FALLBACK !== 'false') {
        logger?.warn('⚠️  GEMINI_API_KEY not set - using fallback mode');
        genAI = null;
        return;
      }
      throw new Error('GEMINI_API_KEY required but not set in .env');
    }

    genAI = new GoogleGenerativeAI(apiKey);
    logger?.info('✅ Gemini API initialized');
  } catch (error) {
    if (process.env.GEMINI_FALLBACK !== 'false') {
      logger?.warn('⚠️  Gemini initialization failed, using fallback:', error.message);
      genAI = null;
    } else {
      throw error;
    }
  }
}

/**
 * Validate Gemini configuration
 * @param {object} logger - Logger instance
 */
export function validateGeminiConfig(logger) {
  if (!process.env.GEMINI_API_KEY) {
    if (process.env.GEMINI_FALLBACK === 'false') {
      throw new Error('GEMINI_API_KEY not set and GEMINI_FALLBACK disabled');
    }
    logger?.warn('⚠️  GEMINI_API_KEY not set - IA will use fallback responses');
  }

  if (!process.env.GEMINI_MODEL) {
    logger?.info('Using default model: ' + MODELS.PRIMARY);
  }
}

// ============================================================================
// Prompt Caching
// ============================================================================

/**
 * Get or create system prompt from cache
 * @param {string} promptType - Type of prompt (DUNGEON_MASTER, NPC_MERCHANT, etc.)
 * @returns {string} System prompt
 */
function getSystemPrompt(promptType) {
  const key = `system:${promptType}`;

  if (promptCache.has(key)) {
    stats.cached++;
    return promptCache.get(key);
  }

  const prompt = SYSTEM_PROMPTS[promptType] || SYSTEM_PROMPTS.DUNGEON_MASTER;
  promptCache.set(key, prompt);

  return prompt;
}

/**
 * Cache a prompt response
 * @param {string} key - Cache key
 * @param {string} response - Response to cache
 */
function cacheResponse(key, response) {
  promptCache.set(key, { response, timestamp: Date.now() });
}

/**
 * Get cached response if fresh
 * @param {string} key - Cache key
 * @returns {string|null} Cached response or null
 */
function getCachedResponse(key) {
  if (!promptCache.has(key)) return null;

  const cached = promptCache.get(key);
  const age = Date.now() - cached.timestamp;

  if (age > CACHE_TTL * 1000) {
    promptCache.delete(key);
    return null;
  }

  stats.cached++;
  return cached.response;
}

// ============================================================================
// Text Generation
// ============================================================================

/**
 * Generate text using Gemini
 * @param {string} prompt - User prompt
 * @param {string} systemPromptType - System prompt type
 * @param {number} maxTokens - Max tokens in response
 * @returns {Promise<string>} Generated text
 */
export async function generateText(prompt, systemPromptType = 'DUNGEON_MASTER', maxTokens = 500) {
  stats.requests++;

  // Check if API is available
  if (!genAI) {
    stats.fallbacks++;
    return generateFallbackText(prompt, systemPromptType);
  }

  try {
    const systemPrompt = getSystemPrompt(systemPromptType);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || MODELS.PRIMARY,
    });

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\n${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.8, // Creative but consistent
        topP: 0.95,
        topK: 40,
      },
    });

    const text = response.response.text();
    stats.totalTokens += response.response.usageMetadata?.totalTokenCount || 0;

    return text;
  } catch (error) {
    return handleGeminiError(error, prompt);
  }
}

/**
 * Generate NPC dialogue
 * @param {object} npc - NPC object {name, type, affinity}
 * @param {object} context - Game context {location, timeOfDay}
 * @param {string} playerMessage - What the player said
 * @returns {Promise<string>} NPC response
 */
export async function generateDialogue(npc, context, playerMessage) {
  const promptType = `NPC_${(npc.type || 'MERCHANT').toUpperCase()}`;
  
  const prompt = `
The player says to you: "${playerMessage}"

Your NPC stats:
- Name: ${npc.name}
- Type: ${npc.type}
- Affinity with player: ${npc.affinity || 0} (out of 1.0)
- Mood: ${npc.mood || 'neutral'}

Game context:
- Location: ${context.location || 'tavern'}
- Time: ${context.timeOfDay || 'noon'}

Respond as this NPC character. Keep response short (1-3 sentences). Stay in character.`;

  return generateText(prompt, promptType, 200);
}

/**
 * Generate combat description
 * @param {object} encounter - Encounter data
 * @returns {Promise<string>} Combat description
 */
export async function generateCombatDescription(encounter) {
  const prompt = `
Combat Scenario:
- Player character: ${encounter.playerName} (${encounter.playerClass} Level ${encounter.playerLevel})
- Enemy: ${encounter.enemyName} (${encounter.enemyType})
- Action: ${encounter.action} (e.g., "attack", "cast spell", "dodge")
- Player stats: HP ${encounter.playerHP}/${encounter.playerHPMax}, AC ${encounter.playerAC}
- Enemy stats: HP ${encounter.enemyHP}/${encounter.enemyHPMax}, AC ${encounter.enemyAC}
- Location: ${encounter.location}
- Previous events: ${encounter.narrative || 'None'}

Describe the action vividly in 2-3 sentences. Make it dramatic and consequential.`;

  return generateText(prompt, 'COMBAT_NARRATOR', 300);
}

/**
 * Generate narrative description
 * @param {object} setting - Setting data
 * @returns {Promise<string>} Narrative description
 */
export async function generateNarrative(setting) {
  const prompt = `
Setting Description:
- Location: ${setting.location}
- Environment: ${setting.environment}
- Time: ${setting.time}
- Weather: ${setting.weather}
- NPCs present: ${setting.npcs?.join(', ') || 'None'}
- Mood/atmosphere: ${setting.mood}

Describe this setting vividly in 3-4 sentences. Use sensory details (sights, sounds, smells).`;

  return generateText(prompt, 'DUNGEON_MASTER', 300);
}

// ============================================================================
// Fallback Generation
// ============================================================================

/**
 * Fallback text generation (when API unavailable)
 * @param {string} prompt - User prompt
 * @param {string} promptType - System prompt type
 * @returns {string} Fallback response
 */
function generateFallbackText(prompt, promptType) {
  const fallbacks = {
    DUNGEON_MASTER: [
      'You venture deeper into the dungeon, your torch casting dancing shadows on ancient stone walls. The air grows colder as you hear the faint sound of dripping water echoing through the darkness.',
      'The scene unfolds before you with quiet intensity. Dust motes dance in the light as you survey your surroundings, each detail revealing secrets of ages past.',
      'Time seems to stand still in this moment. Around you, the world holds its breath, waiting for your next move.',
    ],
    NPC_MERCHANT: [
      'The merchant eyes you with practiced interest. "Welcome, friend. I have many goods that might interest an adventurer like yourself."',
      '"Ah, a customer! I deal in quality items and honest prices. What catches your eye today?"',
      'The seller grins widely. "You look like someone who appreciates fine craftsmanship. Let me show you my best wares."',
    ],
    NPC_WARRIOR: [
      'The warrior nods respectfully. "You look capable. Few have what it takes to survive in these lands. What brings you to seek my counsel?"',
      '"I can tell you\'ve seen some action. There\'s a look in your eyes—the look of someone who\'s faced death and lived to tell about it."',
      'The fighter crosses their arms, regarding you with a mixture of respect and caution. "You\'ve got the bearing of an adventurer. What do you need?"',
    ],
    COMBAT_NARRATOR: [
      'Steel rings against steel as you strike your opponent! The clash sends sparks flying into the air, both combatants seeking advantage.',
      'You move with practiced precision, your muscles coiling like springs before you unleash your attack! Your enemy scrambles to defend.',
      'The moment seems to stretch as you commit to your action. Your opponent reacts, and the outcome hangs in the balance!',
    ],
  };

  const fallbackList = fallbacks[promptType] || fallbacks.DUNGEON_MASTER;
  return fallbackList[Math.floor(Math.random() * fallbackList.length)];
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle Gemini API errors
 * @param {Error} error - Error object
 * @param {string} prompt - Original prompt (for context)
 * @returns {string} Fallback response
 */
function handleGeminiError(error, prompt) {
  stats.errors++;

  const message = error.message.toLowerCase();

  if (message.includes('quota')) {
    console.warn('⚠️  Gemini API quota exceeded, using fallback');
  } else if (message.includes('auth')) {
    console.warn('⚠️  Gemini authentication failed, using fallback');
  } else if (message.includes('timeout')) {
    console.warn('⚠️  Gemini request timeout, using fallback');
  } else {
    console.warn('⚠️  Gemini error:', error.message);
  }

  return generateFallbackText(prompt, 'DUNGEON_MASTER');
}

// ============================================================================
// Monitoring & Stats
// ============================================================================

/**
 * Get service statistics
 * @returns {object} Statistics
 */
export function getStats() {
  return {
    ...stats,
    cacheHitRate: stats.requests > 0 ? (stats.cached / stats.requests * 100).toFixed(2) + '%' : '0%',
    fallbackRate: stats.requests > 0 ? (stats.fallbacks / stats.requests * 100).toFixed(2) + '%' : '0%',
    avgTokensPerRequest: stats.requests > 0 ? Math.round(stats.totalTokens / stats.requests) : 0,
  };
}

/**
 * Reset statistics
 */
export function resetStats() {
  stats = {
    requests: 0,
    cached: 0,
    fallbacks: 0,
    errors: 0,
    totalTokens: 0,
  };
}

/**
 * Clear prompt cache
 */
export function clearCache() {
  promptCache.clear();
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Health check - verify API is ready
 * @returns {object} Health status
 */
export function getHealth() {
  return {
    status: genAI ? 'ready' : 'fallback',
    apiAvailable: genAI !== null,
    cacheSize: promptCache.size,
    stats: getStats(),
  };
}
