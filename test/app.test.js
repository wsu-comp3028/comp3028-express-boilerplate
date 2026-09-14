import { test, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, rm } from 'node:fs/promises';
import { app } from '../app.js';
import { initializeDb, getDb, closeDb, createDbMiddleware } from '../config/db.js';

assert.equal(getDb(), undefined, 'Importing app must not initialise a database');
const pool = initializeDb({ host: 'example.invalid', max: 1, connectionTimeoutMillis: 2000 });
assert.equal(pool.options.host, 'example.invalid');
assert.equal(pool.options.connectionTimeoutMillis, 2000);
const query = mock.method(pool, 'query', async () => ({ rows: [{ username: 'TestUser' }] }));
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
after(async () => {
    await new Promise(resolve => server.close(resolve));
    mock.restoreAll();
    await closeDb();
    assert.equal(getDb(), undefined);
});

test('home, form, JSON and error pages survive the merge', async () => {
    for (const route of ['/', '/form', '/upload', '/test']) {
        assert.equal((await fetch(base + route)).status, 200);
    }
    const form = await fetch(base + '/submit', {
        method: 'POST', body: new URLSearchParams({ name: 'Alex' }),
    });
    assert.equal(await form.text(), 'Hello "Alex"');
    const json = await fetch(base + '/api/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alex' }),
    });
    assert.deepEqual(await json.json(), { title: 'Express' });
    assert.equal((await fetch(base + '/missing')).status, 404);
});

test('user routes consume pg rows and parameterise IDs', async () => {
    const all = await fetch(base + '/user');
    assert.equal(all.status, 200);
    assert.match(await all.text(), /TestUser/);
    assert.deepEqual(query.mock.calls.at(-1).arguments, ['SELECT * FROM users ORDER BY id']);
    const id = "1 OR 1=1";
    assert.equal((await fetch(base + '/user/' + encodeURIComponent(id))).status, 200);
    assert.deepEqual(query.mock.calls.at(-1).arguments, ['SELECT * FROM users WHERE id = $1', [id]]);
});

test('database failures use the production error handler', async () => {
    app.set('env', 'production');
    query.mock.mockImplementationOnce(async () => { throw new Error('private database detail'); });
    try {
        const response = await fetch(base + '/user');
        assert.equal(response.status, 500);
        const body = await response.text();
        assert.match(body, /Internal Server Error/);
        assert.doesNotMatch(body, /private database detail/);
    } finally {
        app.set('env', 'development');
    }
});

test('database middleware accepts injected clients', () => {
    const db = { query() {} };
    const req = {};
    createDbMiddleware({ db })(req, {}, error => assert.equal(error, undefined));
    assert.equal(req.db, db);
});

test('upload completes before returning a response', async () => {
    const filename = `test-upload-${process.pid}.txt`;
    const location = new URL(`../public/uploads/${filename}`, import.meta.url);
    const form = new FormData();
    form.append('file', new Blob(['upload example']), filename);
    try {
        const response = await fetch(base + '/upload', { method: 'POST', body: form });
        assert.equal(response.status, 200);
        assert.equal(await readFile(location, 'utf8'), 'upload example');
    } finally {
        await rm(location, { force: true });
    }
});
