const { chromium } = require('playwright');
const express = require('express');
const path = require('path');

async function run() {
  const app = express();
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  const server = app.listen(9876, async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
      console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`[Browser Page Error] ${error.message} \n ${error.stack}`);
    });
    
    console.log("Navigating to app...");
    await page.goto('http://localhost:9876');
    await page.waitForTimeout(1000);
    
    console.log("Clicking Diagnostics toggle...");
    await page.$eval('#log-drawer-toggle', el => el.click());
    await page.waitForTimeout(500);
    
    let isHidden = await page.$eval('#relay-log-drawer', el => el.getAttribute('aria-hidden'));
    let transform = await page.$eval('#relay-log-drawer', el => window.getComputedStyle(el).transform);
    console.log(`After Opening - aria-hidden: ${isHidden}, transform: ${transform}`);
    
    console.log("Clicking Close button...");
    await page.$eval('#relay-log-close', el => el.click());
    await page.waitForTimeout(500);
    
    isHidden = await page.$eval('#relay-log-drawer', el => el.getAttribute('aria-hidden'));
    transform = await page.$eval('#relay-log-drawer', el => window.getComputedStyle(el).transform);
    console.log(`After Closing (Close Button) - aria-hidden: ${isHidden}, transform: ${transform}`);

    console.log("Opening again...");
    await page.$eval('#log-drawer-toggle', el => el.click());
    await page.waitForTimeout(500);

    console.log("Clicking Document Body...");
    await page.$eval('body', el => el.click());
    await page.waitForTimeout(500);

    isHidden = await page.$eval('#relay-log-drawer', el => el.getAttribute('aria-hidden'));
    transform = await page.$eval('#relay-log-drawer', el => window.getComputedStyle(el).transform);
    console.log(`After Closing (Body Click) - aria-hidden: ${isHidden}, transform: ${transform}`);

    await browser.close();
    server.close();
  });
}

run().catch(console.error);
