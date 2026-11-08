# 🤖 Phase 3A: IA Integration Module - BRIEFING

**Objective:** Build reusable Gemini API service for NPC dialogue, combat descriptions, and narrative generation.

**Duration:** 2-3 hours  
**Status:** 🚀 READY TO START

---

## 🎯 What We're Building

A standalone IA service that:
1. Wraps Google Generative AI (Gemini)
2. Manages prompt caching (saves tokens)
3. Generates game content (dialogue, descriptions, narratives)
4. Falls back gracefully (API down, quota exceeded)
5. Integrates seamlessly into Phase 3B (Map) and 3C (NPC)

**Why?**
- IA is used by NPC dialogue, combat, narrative - making it a module now avoids refactoring later
- Prompt caching saves ~90% tokens on repeated requests
- Fallback ensures game playable even if API goes down

---

## 📋 Task Breakdown

### Task 1: Gemini API Wrapper Service (40 min)

**File:** `server/services/gemini.js`

**What to implement:**
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
export async function initializeGemini() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-pro-exp-12-05' });
}

// Generate text (basic)
export async function generateText(prompt, context = {}) {
  // 1. Build system prompt (game context)
  // 2. Call Gemini API
  // 3. Parse response
  // 4. Return text
}

// Generate NPC dialogue
export async function generateDialogue(npc, context, playerMessage) {
  // 1. NPC personality prompt
  // 2. Affinity modifier (relationship affects tone)
  // 3. Call generateText()
  // 4. Return dialogue
}

// Generate combat description
export async function generateCombatDescription(combatContext) {
  // 1. Battle situation prompt
  // 2. Character stats + enemies
  // 3. Call generateText()
  // 4. Return vivid description
}

// Error handling & logging
export async function handleGeminiError(error) {
  if (error.message.includes('quota')) {
    return { fallback: true, reason: 'API quota exceeded' };
  }
  if (error.message.includes('auth')) {
    return { fallback: true, reason: 'Authentication failed' };
  }
  throw error;
}
```

**Key Features:**
- ✅ Initialize once at startup
- ✅ Automatic error handling
- ✅ Fallback text generation
- ✅ Request logging
- ✅ Token counting (for caching)

---

### Task 2: Prompt Caching Infrastructure (30 min)

**What to implement:**
1. System prompt (game context, immersive RPG setting)
2. Cache configuration (TTL, key strategy)
3. Token counting (estimate cost)
4. Cache headers (enable on Gemini)

**System Prompt Example:**
```
You are the Dungeon Master for an epic fantasy RPG called "L'Occhio di Ophion".
You are immersive, narrative-focused, and create vivid descriptions.
The game world is magical, dangerous, and full of wonder.
Respond as the DM, creating engaging roleplay content.
Always maintain the player's agency and make consequences meaningful.
```

**Why Caching Matters:**
- System prompt ~500 tokens
- Repeated to every request
- With caching: cached after 1st request (saves 500 tokens per call)
- Typical savings: 90% of system prompt tokens

**Implementation:**
```javascript
const SYSTEM_PROMPT = `You are the Dungeon Master for an epic fantasy RPG...`;
const CACHE_TTL = 3600; // 1 hour
const CACHE_KEY_STRATEGY = 'npc-type:affinity:location';

export async function generateDialogueWithCache(npc, context, message) {
  const cacheKey = `${npc.type}:${npc.affinity}:${context.location}`;
  
  // Check cache
  if (cache.has(cacheKey) && !cache.isExpired(cacheKey)) {
    const cachedPrompt = cache.get(cacheKey);
    return generateText(message, cachedPrompt);
  }
  
  // Generate new
  const systemPrompt = buildNPCSystemPrompt(npc, context);
  const response = await generateText(message, systemPrompt);
  
  // Store in cache
  cache.set(cacheKey, systemPrompt, CACHE_TTL);
  
  return response;
}
```

---

### Task 3: Configuration & Secrets Management (20 min)

**Environment Variables (.env):**
```
# Gemini API
GEMINI_API_KEY=sk-proj-xxxxxxxxxxxx
GEMINI_MODEL=gemini-2.0-pro-exp-12-05
GEMINI_TIMEOUT=30000
GEMINI_FALLBACK=true

# Caching
CACHE_ENABLED=true
CACHE_TTL=3600
CACHE_MAX_SIZE=100
```

**Validation at startup:**
```javascript
export function validateGeminiConfig() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set in .env');
  }
  
  if (!process.env.GEMINI_MODEL) {
    console.warn('GEMINI_MODEL not set, using default: gemini-2.0-pro-exp-12-05');
  }
  
  if (process.env.GEMINI_FALLBACK !== 'true') {
    console.warn('⚠️  GEMINI_FALLBACK disabled - game will fail if API unavailable');
  }
}
```

---

### Task 4: Testing Harness (20 min)

**File:** `server/services/gemini.test.js`

**What to test:**
```javascript
describe('Gemini Service', () => {
  
  it('should initialize API client', async () => {
    const model = await initializeGemini();
    expect(model).toBeDefined();
  });
  
  it('should generate text with fallback if API down', async () => {
    process.env.GEMINI_FALLBACK = 'true';
    const text = await generateText('test prompt');
    expect(text).toBeTruthy();
  });
  
  it('should generate NPC dialogue', async () => {
    const npc = { name: 'Armorer', type: 'merchant', affinity: 0.5 };
    const dialogue = await generateDialogue(npc, {}, 'Do you have swords?');
    expect(dialogue).toContain('sword'); // Should reference player's question
  });
  
  it('should handle API errors gracefully', async () => {
    const error = new Error('API quota exceeded');
    const result = await handleGeminiError(error);
    expect(result.fallback).toBe(true);
  });
  
  it('should cache responses', async () => {
    const npc = { id: '1', type: 'sage' };
    const response1 = await generateDialogue(npc, {}, 'Hello');
    const response2 = await generateDialogue(npc, {}, 'Hello');
    // Both should be fast (2nd from cache)
    expect(response1).toBeTruthy();
    expect(response2).toBeTruthy();
  });
  
});
```

**Mock Responses (for testing without API):**
```javascript
const MOCK_RESPONSES = {
  dialogue: 'Welcome, adventurer! How can I help you?',
  combat: 'The goblin lunges at you with a snarling grimace!',
  narrative: 'The ancient tower looms before you, shrouded in mist.',
};

export function getMockResponse(type) {
  return MOCK_RESPONSES[type] || 'You hear a sound in the distance.';
}
```

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│           Phase 3B (Map) + 3C (NPC)                 │
│     Travel endpoints, NPC dialogue endpoints        │
└────────────────────┬────────────────────────────────┘
                     │ calls
                     ▼
┌─────────────────────────────────────────────────────┐
│      Phase 3A: IA Integration Service               │
│  ┌─────────────────────────────────────────────┐   │
│  │ generateDialogue(npc, context, message)     │   │
│  │ generateCombatDescription(encounter)        │   │
│  │ generateNarrative(setting)                  │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │                               │
│  ┌─────────────────┴─────────────────────────┐    │
│  │ Gemini API Wrapper                        │    │
│  ├──────────────────────────────────────────┤    │
│  │ - Initialize client                      │    │
│  │ - Build prompts (system + user)          │    │
│  │ - Send request                           │    │
│  │ - Handle errors                          │    │
│  │ - Fallback to mock responses             │    │
│  └──────────────────┬──────────────────────┘    │
│                     │                            │
│  ┌─────────────────┴─────────────────────────┐   │
│  │ Prompt Caching Layer                      │   │
│  ├──────────────────────────────────────────┤   │
│  │ - Cache system prompts (500 tokens save) │   │
│  │ - TTL management (1 hour default)        │   │
│  │ - Token counting                         │   │
│  │ - Cache hit rate tracking                │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                     │ uses
                     ▼
┌─────────────────────────────────────────────────────┐
│      Google Generative AI (Gemini)                  │
│   gemini-2.0-pro-exp-12-05 (or latest)             │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Expected Outcomes

**After Phase 3A:**
- ✅ Gemini service module ready for integration
- ✅ Can generate dialogue, descriptions, narratives
- ✅ ~90% token savings via caching
- ✅ Graceful fallback (game works without API)
- ✅ Comprehensive test coverage
- ✅ Ready for Phase 3B (Map endpoints can call IA)

**Token Efficiency:**
- Without caching: ~600 tokens per request (300 system + 300 user/response)
- With caching: ~60 tokens per request (300 cached, 60 user/response)
- **90% savings** = ~$0.01 per request instead of $0.10

---

## 🚀 Immediate Next Steps

**1. Install Gemini SDK:**
```bash
npm install @google/generative-ai
```

**2. Get API Key:**
- Go to https://makersuite.google.com/app/apikeys
- Create new API key
- Add to .env: `GEMINI_API_KEY=sk-proj-...`

**3. Start building Phase 3A:**
```bash
# Create service file
touch server/services/gemini.js

# Build 4 tasks in sequence:
# 1. Gemini wrapper (40 min)
# 2. Prompt caching (30 min)
# 3. Config + secrets (20 min)
# 4. Tests (20 min)
```

**4. Test integration:**
```bash
npm run test:watch
# Watch: server/services/gemini.test.js
```

**5. Ready for Phase 3B:**
```bash
# After Phase 3A complete:
# - Map endpoints can call generateDialogue()
# - Combat system can call generateCombatDescription()
# - Any narrative generation uses IA service
```

---

## 🔗 Integration Points (Future Phases)

**Phase 3B - Map Exploration:**
```javascript
// Travel endpoint calls IA
POST /api/characters/:id/travel
  → Encounter generated with IA description
  → "You travel for 8 hours through dense forest..."
```

**Phase 3C - NPC Dialogue:**
```javascript
// Talk to NPC endpoint calls IA
POST /api/npcs/:id/talk
  → NPC response generated with IA
  → "I'm looking for someone brave enough to..."
```

**Phase 3D - Combat:**
```javascript
// Combat action endpoint calls IA
POST /api/combat/:id/action
  → Action description generated with IA
  → "You swing your sword in a wide arc..."
```

---

## 🎯 Success Criteria

Phase 3A is **COMPLETE** when:
- [ ] server/services/gemini.js implemented (all 4 tasks)
- [ ] server/services/gemini.test.js passing
- [ ] Prompt caching working (token savings verified)
- [ ] Fallback handling tested (no API key scenario)
- [ ] Error handling comprehensive (quota, auth, timeout)
- [ ] Documentation updated (API.md, code comments)
- [ ] Can be called from Phase 3B services
- [ ] Ready for `npm run test:integration` on Phase 3B

**Estimated Time:** 2-3 hours  
**Difficulty:** Medium (IA API integration + caching logic)  
**Risk:** Low (no database changes, standalone module)

---

## 📝 Files to Create/Modify

**Create:**
- ✅ `server/services/gemini.js` (main service)
- ✅ `server/services/gemini.test.js` (tests)

**Modify:**
- ✅ `.env` (add GEMINI_API_KEY)
- ✅ `package.json` (add @google/generative-ai)
- ✅ `API.md` (document IA endpoints - for reference)
- ✅ `PHASE_3A_IA_INTEGRATION.md` (this file)

**No changes to:**
- Database schema (IA is stateless)
- Authentication (IA doesn't need auth)
- Character system (IA is additional, not core)

---

## 🔐 Security Notes

✅ **Safe to implement now:**
- API key stored in .env (not committed)
- Rate limiting applies to all endpoints (protects IA too)
- Fallback mode if API quota exceeded
- No sensitive data sent to API (only game content)

⚠️ **For production:**
- Use environment-specific API keys
- Log token usage per user
- Implement cost tracking
- Set quota alerts (Gemini console)
- Rotate API keys regularly

---

## 📚 Reference Documentation

- Gemini API Docs: https://ai.google.dev/docs
- Prompt Caching: https://ai.google.dev/docs/caching
- Generative AI SDK: https://github.com/google/generative-ai-js
- API Key Setup: https://makersuite.google.com/app/apikeys

---

**Ready to start? Let's build Phase 3A! 🚀**
