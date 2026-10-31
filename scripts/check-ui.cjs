// Uses the browser tooling bundled with this workspace; no application dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('heading', { name: 'Welcome back.' }).waitFor();
    assert.equal(await page.getByRole('navigation').count(), 0, 'Signed-out user must not see the workspace');
    await page.getByRole('button', { name: 'New here? Create an account' }).click();
    await page.getByRole('heading', { name: 'Start your next chapter.' }).waitFor();
    assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('minlength'), '8');
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByRole('heading', { name: 'A fresh start.' }).waitFor();
    assert.equal(await page.locator('input[type=password]').count(), 0);
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile layout must not overflow');
    assert.deepEqual(errors, []);
    console.log('PASS: signed-out route guard, auth mode switching, password constraints, mobile overflow, no browser exceptions.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
