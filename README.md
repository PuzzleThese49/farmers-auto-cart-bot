# Farmers Auto-Cart Bot

This bot:
- Automatically checks Farmers product pages
- Tries to add `90% of available stock` to cart
- Sends you a Telegram alert when it does
- Repeats every 1–3.5 seconds

## Setup

1. Rename `.env.template` to `.env` and fill in your:
   - `TELEGRAM_TOKEN`
   - `TELEGRAM_CHAT_ID`

2. Run locally:

```
npm install
node server.js
```

3. Or deploy on Railway using the button in Railway’s dashboard.

4. Dashboard will run on your chosen port (default is 3000)
