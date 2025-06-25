// server.js
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
require('dotenv').config();

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

let lastChecked = {};

const productUrls = [
  'https://www.farmers.co.nz/toys/games-cards-puzzles/pokemon-trading-card-scarlet-violet-151-booster-bundle-6843904',
  'https://www.farmers.co.nz/toys/games-cards-puzzles/pokemon-trading-card-sv8-5-prismatic-evolution-super-premium-collection-6972261'
];

app.get('/', (req, res) => {
  const statusHtml = productUrls.map(url => `
    <p><strong>${url}</strong><br>
    Status: ${lastChecked[url]?.status || 'Waiting...'}<br>
    Last Checked: ${lastChecked[url]?.time || 'Not yet'}</p>
  `).join('');

  res.send(\`
    <html>
      <head><title>Farmers Bot Dashboard</title></head>
      <body style="font-family:sans-serif;">
        <h1>✨ Farmers Auto-Cart Bot</h1>
        ${statusHtml}
      </body>
    </html>
  \`);
});

async function sendTelegram(msg) {
  return axios.post(\`https://api.telegram.org/bot\${process.env.TELEGRAM_TOKEN}/sendMessage\`, {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: msg
  });
}

async function tryAddFromPage(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    const qtyInput = await page.$('input[name^="Quantity_"]');
    if (!qtyInput) throw new Error('Quantity input not found');

    const attr = await page.evaluate(el => el.getAttribute('data-bv-lessthan-value'), qtyInput);
    const sku = await page.evaluate(el => el.name.split('_')[1], qtyInput);
    if (!attr || !sku) throw new Error('Missing SKU or max quantity');

    const maxQty = parseInt(attr) - 1;
    const qtyToAdd = Math.floor(maxQty * 0.9);
    if (qtyToAdd < 1) throw new Error('Calculated quantity too low');

    const formData = new URLSearchParams();
    formData.append("SKU", sku);
    formData.append(`Quantity_${sku}`, qtyToAdd.toString());
    formData.append("addToCartBehavior", "expresscart");

    const res = await page.evaluate(async (formDataStr) => {
      const response = await fetch("https://www.farmers.co.nz/INTERSHOP/web/WFS/Farmers-Shop-Site/en_NZ/-/NZD/ViewExpressShop-AddProduct", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formDataStr,
        credentials: "include"
      });
      return response.status;
    }, formData.toString());

    if (res === 200) {
      lastChecked[url] = { status: \`✅ Added \${qtyToAdd} to cart\`, time: new Date().toLocaleString() };
      await sendTelegram(\`✅ [\${sku}] Added \${qtyToAdd} to cart\`);
    } else {
      lastChecked[url] = { status: \`⚠️ Failed (status \${res})\`, time: new Date().toLocaleString() };
      await sendTelegram(\`⚠️ [\${sku}] Add to cart failed (status \${res})\`);
    }
  } catch (err) {
    lastChecked[url] = { status: \`❌ Error: \${err.message}\`, time: new Date().toLocaleString() };
    await sendTelegram(\`❌ [\${url}] Error: \${err.message}\`);
  }

  await browser.close();
}

function getRandomDelay(min = 1000, max = 3500) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function loopProducts() {
  for (const url of productUrls) {
    await tryAddFromPage(url);
    await new Promise(r => setTimeout(r, getRandomDelay()));
  }
  setTimeout(loopProducts, getRandomDelay());
}

loopProducts();

app.listen(port, () => console.log(`🚀 Dashboard running on port ${port}`));
