const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
    const exp = Math.floor(Date.now()/1000)+3600;
    const access_token = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', Buffer.from(JSON.stringify({ sub: user.id, exp, role: 'authenticated' })).toString('base64url'), 'signature'].join('.');
    await page.addInitScript(({ user, exp, access_token }) => {
      localStorage.setItem('sb-pvsvswcfolyyjhzggbrx-auth-token', JSON.stringify({ access_token, refresh_token: 'test-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }));
    }, { user, exp, access_token });
    let items = [], templates = [{ id: 'target-1', title: 'Read 10 pages', tag: 'Reading', priority: 'medium', color: '#66845c', days: [0,1,2,3,4,5,6], archived_from: null }];
    let blocks = [{ id: 'block-1', title: 'Sleep', routine: 'weekday', start_time: '00:00:00', end_time: '05:30:00' }];
    let fail = false, serial = 0;
    await page.route('https://pvsvswcfolyyjhzggbrx.supabase.co/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const method = request.method();
      const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname.includes('/auth/')) return send(user);
      if (url.pathname.includes('/rpc/')) return fail ? send({ message: 'Function missing', code: 'PGRST202' }, 404) : send(null);
      const table = url.pathname.split('/').pop();
      if (table === 'profiles') return send(null, 201);
      let rows = table === 'task_items' ? items : table === 'task_templates' ? templates : blocks;
      const id = url.searchParams.get('id')?.replace('eq.', '');
      if (method === 'GET') {
        if (table === 'task_items') rows = rows.filter(row => row.task_date === url.searchParams.get('task_date')?.replace('eq.', ''));
        if (table === 'task_templates') rows = rows.filter(row => row.archived_from === null);
        return send(rows);
      }
      if (method === 'POST') {
        const data = request.postDataJSON();
        const row = { id: `new-${++serial}`, template_id: null, notes: '', completed_at: null, start_time: null, end_time: null, ...data };
        rows.push(row); return send({ id: row.id }, 201);
      }
      if (method === 'PATCH') { const row = rows.find(row => row.id === id); Object.assign(row, request.postDataJSON()); return send({ id }); }
      if (method === 'DELETE') {
        if (table === 'task_items') items = items.filter(row => row.id !== id);
        else blocks = blocks.filter(row => row.id !== id);
        return send({ id });
      }
      throw new Error(`Unexpected request: ${method} ${url}`);
    });
    await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('button', { name: 'Task manager', exact: true }).click();
    await page.getByRole('button', { name: 'Add task', exact: true }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
    await page.getByRole('button', { name: 'Add task', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Write project notes');
    await page.getByLabel('Tag', { exact: true }).fill('Learning');
    await page.getByLabel('Priority', { exact: true }).selectOption('high');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('heading', { name: 'Write project notes' }).waitFor();
    await page.getByRole('button', { name: 'Complete: Write project notes', exact: true }).click();
    await page.getByRole('button', { name: 'Mark incomplete: Write project notes', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Incomplete', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Write project notes' }).count(), 0);
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Write project notes', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Updated project notes');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('heading', { name: 'Updated project notes' }).waitFor();
    await page.getByRole('button', { name: 'Previous day' }).click();
    await page.getByRole('heading', { name: 'Updated project notes' }).waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
    assert.equal(await page.getByRole('heading', { name: 'Updated project notes' }).count(), 0);
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await page.getByRole('heading', { name: 'Updated project notes' }).waitFor();
    await page.getByRole('button', { name: 'Delete Updated project notes', exact: true }).click();
    await page.getByRole('button', { name: 'Delete item', exact: true }).click();
    await page.getByRole('heading', { name: 'A little room to begin.' }).waitFor();
    await page.getByRole('tab', { name: 'Repeating targets' }).click();
    await page.getByRole('button', { name: 'Edit target', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Read 12 pages');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('heading', { name: 'Read 12 pages' }).waitFor();
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await page.getByRole('button', { name: 'Archive target', exact: true }).click();
    await page.getByText('No active targets.').waitFor();
    await page.getByRole('tab', { name: 'Weekly routine' }).click();
    await page.getByRole('button', { name: 'Monday–Friday', exact: true }).click();
    await page.getByText('330 minutes', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Edit Sleep', exact: true }).click();
    await page.getByLabel('Start time', { exact: true }).fill('23:30');
    await page.getByLabel('End time', { exact: true }).fill('05:30');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.getByText('360 minutes', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of ['Weekly routine', 'Repeating targets', 'Daily tasks & history']) {
      await page.getByRole('tab', { name, exact: true }).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} must fit mobile`);
    }
    fail = true;
    await page.getByRole('button', { name: 'Previous day' }).click();
    await page.getByRole('alert').filter({ hasText: 'Task tables are not set up yet' }).waitFor();
    fail = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS (mock backend): task add/edit/complete/filter/delete; date history; target edit/archive; overnight routine edit; all views fit mobile; missing migration error and retry; no browser exceptions.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
