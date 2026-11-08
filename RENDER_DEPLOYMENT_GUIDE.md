# 🚀 GUIDA DEPLOYMENT SU RENDER - L'Occhio di Ophion

## ✨ IN 5 MINUTI - DA ZERO A ONLINE!

Questa è la **guida più semplice** per lanciare il gioco su Render (gratuito, sempre online).

---

## 📋 PREREQUISITI

✅ Account GitHub (il tuo repository)  
✅ Account Render (gratuito: https://render.com)  
✅ Niente da installare localmente!

---

## 🎯 STEP 1: Prepara GitHub

Se il tuo progetto non è su GitHub:

```bash
git remote add origin https://github.com/TUO_USERNAME/L-Occhio-di-Ophion.git
git branch -M main
git push -u origin main
```

Se è già su GitHub, assicurati che sia aggiornato:

```bash
git add .
git commit -m "Add frontend and deployment config"
git push
```

---

## 🌐 STEP 2: Crea Account Render

1. Vai a: https://render.com
2. Clicca "Sign up" (usa GitHub per velocizzare)
3. Autorizza Render ad accedere ai tuoi repo GitHub

---

## 🔧 STEP 3: Deploy Automatico

### Opzione A: Deploy con Click (CONSIGLIATO - IL PIÙ VELOCE)

1. Torna su Render
2. Nel dashboard, clicca: **"New +"** → **"Web Service"**
3. Seleziona il repo: `L-Occhio-di-Ophion`
4. Compila:
   - **Name:** `occhio-di-ophion`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (gratuito)

5. Scorri in basso, clicca: **"Create Web Service"**

6. **Aspetta 3-5 minuti** - Render build automaticamente!

7. Una volta completato, vedrai:
   ```
   ✓ Build successful
   ✓ Service live at: https://occhio-di-ophion.onrender.com
   ```

8. **Clicca il link** e gioca! 🎮

### Opzione B: Deploy con Blueprint (Avanzato)

Se Render.yaml non viene rilevato automaticamente:

1. Nel dashboard Render
2. Clicca: **"New +"** → **"Blueprint"**
3. Seleziona il repo
4. Render legge automaticamente `render.yaml`
5. Clicca: **"Apply"**

---

## 🔑 STEP 4: Configura Variabili Ambiente

Dopo il deploy:

1. Nel dashboard, clicca il tuo servizio: `occhio-di-ophion`
2. Vai a: **"Environment"** (colonna sinistra)
3. Aggiungi variabili:

```
NODE_ENV = production
PORT = 3000
LOG_LEVEL = info
JWT_SECRET = (generato automaticamente)
GEMINI_API_KEY = (facoltativo - vedi sotto)
CORS_ORIGIN = https://occhio-di-ophion.onrender.com
```

4. Clicca: **"Save"** - il servizio restart automaticamente

---

## 🗄️ STEP 5: Configura Database PostgreSQL

### Opzione A: Database Render Gratuito

1. Nel dashboard Render, clicca: **"New +"** → **"PostgreSQL"**
2. Compila:
   - **Name:** `occhio-di-ophion-db`
   - **Database:** `ophion_game`
   - **User:** `ophion_user`
   - **Region:** Scegli il più vicino
   - **Instance Type:** `Free` (gratuito)

3. Clicca: **"Create Database"**

4. Aspetta che sia pronto, copia la **connection string** (simile a):
   ```
   postgresql://ophion_user:PASSWORD@localhost:5432/ophion_game
   ```

5. Nel tuo Web Service (occhio-di-ophion):
   - Vai a: **"Environment"**
   - Aggiungi: `DATABASE_URL` = (la connection string copiata)
   - Clicca: **"Save"**

### Opzione B: Database Esterno (PostgreSQL.org)

Se preferisci un provider esterno:

1. Vai a: https://www.postgresql.org/download/
2. Scegli un hosting (ElephantSQL, Heroku Postgres, AWS RDS free tier)
3. Copia la connection string
4. Metti in `DATABASE_URL` su Render

---

## 🌱 STEP 6: Inizializza Database

Il database ha bisogno dello schema SQL. Render lo farà automaticamente con lo script di init:

1. Vai al Web Service (occhio-di-ophion)
2. Clicca: **"Shell"** (in alto)
3. Esegui:
   ```bash
   npm run db:init
   npm run db:seed
   ```

4. Dovresti vedere: `✓ Database initialized successfully`

---

## ✅ STEP 7: Verifica che Tutto Funzioni

### URL Pubblico:
```
https://occhio-di-ophion.onrender.com
```

### Testa l'API:
```
https://occhio-di-ophion.onrender.com/api/health
```

Dovresti ottenere:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-11-09T..."
}
```

### Apri il Gioco in Chrome:
```
https://occhio-di-ophion.onrender.com
```

Vedrai lo schermo di login! 🎮

---

## 🔐 OPTIONAL: Google Gemini API (per NPC IA)

Se vuoi attivare i dialoghi IA:

1. Vai a: https://ai.google.dev/
2. Clicca: **"Get API Key"**
3. Crea un progetto
4. Copia la chiave API
5. Su Render, aggiungi variabile:
   ```
   GEMINI_API_KEY = (la tua chiave)
   ```
6. Il servizio restart e gli NPC avranno dialoghi IA!

---

## 🎮 USA IL GIOCO

### Accedi:
1. Apri: https://occhio-di-ophion.onrender.com
2. Crea account (email + password)
3. Crea personaggio (scegli razza/classe)
4. Gioca! Esplora, combatti, salva

### Accedi da Mobile:
- Smartphone: stessa URL nel browser
- Funziona come PWA (installabile)

---

## 🆘 RISOLUZIONE PROBLEMI

### "Service failed to deploy"
- Clicca il servizio → "Logs"
- Leggi l'errore
- Common: NODE_ENV non impostato, npm dependencies missing
- Soluzione: Richecka environment variables

### "Cannot connect to database"
- DATABASE_URL non impostato?
- Verifica la connection string su Render PostgreSQL
- Ripeti STEP 5

### "Gioco carica ma non accede"
- Controlla console browser (F12 → Console)
- Vedi errori API?
- Verifica CORS_ORIGIN in Render environment
- Dovrebbe essere: `https://occhio-di-ophion.onrender.com`

### "Free tier expired"
- Render free tier ha limite di ore/mese
- Upgrade a Hobby plan ($7/mese) per servizio always-on
- O riavvia manualmente quando scade

---

## 📈 NEXT STEPS (OPZIONALI)

1. **Custom Domain:**
   - Compra dominio (Namecheap, GoDaddy, etc.)
   - Su Render → Settings → "Custom Domain"
   - Punta DNS a Render

2. **Monitoring:**
   - Su Render → "Alerts" → Setup alerts per downtime
   - Monitora CPU/RAM usage

3. **Backups:**
   - Render PostgreSQL esegue backup automatici
   - Per dati critici: esporta SQL periodicamente

4. **Upgrade Infrastructure:**
   - Se il gioco cresce: Hobby plan ($7) o Standard
   - Render scala automaticamente

---

## 📞 SUPPORTO

- Render Help: https://render.com/docs
- GitHub Issues: Apri issue nel repo
- Email: support@render.com

---

## 🎉 FATTO!

**Il tuo gioco è ONLINE e accessibile da Chrome di tutto il mondo!**

```
https://occhio-di-ophion.onrender.com
```

Buon divertimento! 🚀🎮

---

**Versione:** 1.0  
**Ultimo aggiornamento:** 2024-11-09  
**Autore:** Copilot AI
