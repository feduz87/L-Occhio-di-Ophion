# Phase 3A - Gemini Setup Instructions

## 🚀 Quick Setup (5 minutes)

### 1. Get API Key
Visit: https://makersuite.google.com/app/apikeys
- Create new API key
- Copy the key

### 2. Add to .env
```bash
# Add this line to your .env file
GEMINI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Optional configuration (with defaults)
GEMINI_MODEL=gemini-2.0-pro-exp-12-05
GEMINI_TIMEOUT=30000
GEMINI_FALLBACK=true
```

### 3. Install Dependency
```bash
npm install @google/generative-ai
```

### 4. Test Service
```bash
npm run test server/services/gemini.test.js
```

### 5. Verify Health
```bash
# Start server
npm start

# Check health endpoint
curl http://localhost:3000/api/health
```

---

## 🔧 Configuration Options

### GEMINI_API_KEY
**Required** when `GEMINI_FALLBACK=false`
```
GEMINI_API_KEY=sk-proj-xxxxxxxxxxxxxx
```

### GEMINI_MODEL
**Default:** `gemini-2.0-pro-exp-12-05`
```
# Options:
GEMINI_MODEL=gemini-2.0-pro-exp-12-05      # Recommended (latest)
GEMINI_MODEL=gemini-1.5-pro                # Alternative
```

### GEMINI_TIMEOUT
**Default:** `30000` (30 seconds)
```
GEMINI_TIMEOUT=30000   # Max wait for API response
```

### GEMINI_FALLBACK
**Default:** `true` (enable fallback mode)
```
GEMINI_FALLBACK=true   # Use mock responses if API down
GEMINI_FALLBACK=false  # Fail if API down (production)
```

---

## 📊 Service Features

### What Gemini Service Provides
- ✅ Dialogue generation (NPC conversations)
- ✅ Combat descriptions (vivid action scenes)
- ✅ Narrative generation (scene descriptions)
- ✅ Prompt caching (90% token savings)
- ✅ Fallback mode (game playable without API)
- ✅ Statistics tracking (requests, cache, tokens)
- ✅ Health checks (API readiness)

### Example Usage
```javascript
import { generateDialogue, generateCombatDescription } from './services/gemini.js';

// NPC Dialogue
const npc = { name: 'Armorer', type: 'MERCHANT', affinity: 0.5 };
const response = await generateDialogue(npc, {}, 'Do you have swords?');
// → "Of course, friend! I have the finest blades in the realm."

// Combat Description
const encounter = {
  playerName: 'Aragorn',
  playerClass: 'Warrior',
  enemyName: 'Goblin',
  action: 'attack',
  location: 'Dark Forest'
};
const description = await generateCombatDescription(encounter);
// → "You swing your sword in a wide arc! The goblin scrambles to dodge..."
```

---

## 🧪 Testing

### Unit Tests
```bash
npm test server/services/gemini.test.js
```

Tests cover:
- ✅ API initialization
- ✅ Text generation
- ✅ Dialogue generation
- ✅ Combat descriptions
- ✅ Error handling
- ✅ Caching behavior
- ✅ Statistics tracking
- ✅ Health checks

### Manual Testing

**Test Dialogue:**
```bash
# Start server
npm start

# In another terminal, make a request
curl -X POST http://localhost:3000/api/npcs/test/talk \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!"}'
```

**Check Health:**
```bash
curl http://localhost:3000/api/health
# Returns: { status: "ready", apiAvailable: true, ... }
```

---

## 🔐 Security Notes

### API Key Protection
- Never commit `.env` file
- Never share API keys in code
- Use environment variables only
- Rotate keys regularly

### Rate Limiting
- Global: 100 requests / 15 minutes
- Auth: 5 attempts / 15 minutes
- Protects API from abuse

### Cost Tracking
- Monitor token usage in Gemini console
- Set quota alerts
- Track cost per feature

---

## 📈 Monitoring

### Check Service Health
```bash
# Returns service status
curl http://localhost:3000/api/health

# Response:
{
  "status": "ready",
  "apiAvailable": true,
  "cacheSize": 5,
  "stats": {
    "requests": 42,
    "cached": 28,
    "fallbacks": 0,
    "errors": 0,
    "cacheHitRate": "66.67%",
    "fallbackRate": "0%"
  }
}
```

### Check Statistics
Service tracks:
- **requests:** Total API calls
- **cached:** Requests served from cache
- **fallbacks:** Requests using fallback responses
- **errors:** Failed API calls
- **cacheHitRate:** Percentage of cached requests (%)
- **fallbackRate:** Percentage of fallback usage (%)

---

## 🆘 Troubleshooting

### "API key not set" Error
**Solution:** Add `GEMINI_API_KEY` to `.env`
```bash
echo "GEMINI_API_KEY=sk-proj-..." >> .env
```

### "Authentication failed" Error
**Solution:** Verify API key is valid
1. Visit: https://makersuite.google.com/app/apikeys
2. Check key is active
3. Copy correct key to .env

### "Quota exceeded" Error
**Solution:** Wait or upgrade API plan
1. Check quota in Gemini console
2. Wait for quota reset
3. Consider upgrading plan

### Service using fallback mode
**Check:** Run `curl http://localhost:3000/api/health`
- If `apiAvailable: false`, API key issue
- If `fallbackRate > 0`, API is failing
- See logs for error details

---

## 📚 Documentation

### Gemini API Docs
- Official: https://ai.google.dev/docs
- Models: https://ai.google.dev/models
- Prompt Engineering: https://ai.google.dev/tutorials/prompt_engineering_best_practices

### Integration Points
- Phase 3B (Map Exploration): Travel endpoint calls IA for encounter descriptions
- Phase 3C (NPC System): NPC dialogue endpoint calls IA for responses
- Phase 3D (Combat): Combat action endpoint calls IA for action descriptions

---

## ✅ Verification Checklist

After setup, verify:
- [ ] API key added to .env
- [ ] Gemini SDK installed (`npm install @google/generative-ai`)
- [ ] Tests passing (`npm test server/services/gemini.test.js`)
- [ ] Health endpoint works (`curl http://localhost:3000/api/health`)
- [ ] Service initializes without errors
- [ ] Fallback mode works (remove API key, test still works)

---

## 🎯 Next Steps

After Phase 3A is complete:
1. Phase 3B (Map Exploration): Travel endpoints use IA for descriptions
2. Phase 3C (NPC + Dialogue): NPC endpoints use IA for conversations
3. Phase 3D (Combat): Combat endpoints use IA for descriptions

All these phases call the Gemini service automatically!

---

**Ready to build Phase 3A? Let's go! 🚀**
