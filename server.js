const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

const products = [
  {
    name: "151 Booster Bundle",
    url: "https://www.farmers.co.nz/toys/games-cards-puzzles/pokemon-trading-card-scarlet-violet-151-booster-bundle-6843904"
  },
  {
    name: "Prismatic Evolution Premium Box",
    url: "https://www.farmers.co.nz/toys/games-cards-puzzles/pokemon-trading-card-sv8-5-prismatic-evolution-super-premium-collection-6972261"
  }
];

let lastStatus = {};

async function checkProduct(product) {
  try {
    const res = await axios.get(product.url);
    const available = !res.data.includes('Unavailable');
    const timestamp = new Date().toLocaleTimeString();

    if (available && !lastStatus[product.name]) {
      await bot.sendMessage(CHAT_ID, `✅ ${product.name} is now available!\n${product.url}`);
      console.log(`[${timestamp}] ALERT SENT for: ${product.name}`);
    }

    lastStatus[product.name] = available;
    console.log(`[${timestamp}] Checked: ${product.name} - ${available ? '🟢 In Stock' : '🔴 Unavailable'}`);
  } catch (error) {
    console.log(`[${new Date().toLocaleTimeString()}] ❌ Error checking ${product.name}`);
  }
}

// 🔁 Automatic checker every 30 seconds (adjust as needed)
setInterval(() => {
  products.forEach(product => checkProduct(product));
}, 30000);

// 🌐 Keep the server alive with a simple dashboard
app.get('/', async (req, res) => {
  const checks = await Promise.all(products.map(p => checkProduct(p)));
  const statusHtml = checks.map(s => `<p>${s}</p>`).join('');
  res.send(`
    <html>
      <head><title>Farmers Bot Dashboard</title></head>
      <body style="font-family:sans-serif;">
        <h1>✨ Farmers Auto-Cart Bot</h1>
        ${statusHtml}
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Dashboard running on port ${PORT}`);
});
