import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, mock, test } from 'node:test';
import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import UserService from '../services/userService.js';

process.env.NODE_ENV = 'test';
process.env.HOST = '127.0.0.1';
process.env.PORT = '3000';
process.env.SESSION_SECRET = 'session-secret-for-tests-only';
process.env.JWT_SECRET = 'jwt-secret-for-tests-only';

const { app } = await import('../app.js');
const bootstrap = await import('../config/bootstrap.js');
let server;
let baseUrl;

before(async () => {
    // Keep the real credential validation and bcrypt comparison, using known test users.
    const password = await bcrypt.hash('fixture-password', 4);
    mock.method(UserService.prototype, 'getUser', async (username) => {
        if (!['admin', 'user'].includes(username)) throw new Error('Unknown test user');
        return { id: username === 'admin' ? 1 : 2, username, role: username, password };
    });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    mock.restoreAll();
    if (server) await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
});

function request(path, options = {}) {
    return fetch(`${baseUrl}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(5000), ...options });
}

function cookies(response) {
    return response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
}

function login(path, username = 'admin', password = 'fixture-password') {
    return request(path, { method: 'POST', body: new URLSearchParams({ username, password }) });
}

test('login forms render without a request body and post to the correct auth endpoint', async () => {
    for (const path of ['/login', '/login/jwt']) {
        const response = await request(path);
        assert.equal(response.status, 200);
        assert.ok((await response.text()).includes(`action="${path}"`));
        const emptyPost = await request(path, { method: 'POST' });
        assert.equal(emptyPost.status, 200);
        assert.ok((await emptyPost.text()).includes(`action="${path}"`));
    }
});

test('invalid credentials retain the right login form without authenticating', async () => {
    for (const path of ['/login', '/login/jwt']) {
        for (const [username, password] of [['admin', 'wrong-password'], ['missing', 'fixture-password']]) {
            const response = await login(path, username, password);
            assert.equal(response.status, 200);
            const html = await response.text();
            assert.match(html, /Invalid username or password/);
            assert.ok(html.includes(`action="${path}"`));
            assert.equal(response.headers.get('set-cookie'), null);
        }
    }
});

test('anonymous requests cannot access session pages', async () => {
    for (const path of ['/dashboard', '/test']) {
        const response = await request(path);
        assert.equal(response.status, 302);
        assert.equal(response.headers.get('location'), '/login');
    }
});

test('admin session survives redirects, renders the username, and is destroyed on logout', async () => {
    const response = await login('/login');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/dashboard');
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
    const headers = { cookie: cookies(response) };
    const dashboard = await request('/dashboard', { headers });
    assert.equal(dashboard.status, 200);
    assert.match(await dashboard.text(), /This is the admin dashboard/);
    const sessionPage = await request('/test', { headers });
    assert.equal(sessionPage.status, 200);
    assert.match(await sessionPage.text(), /session is working admin/);
    const logout = await request('/logout', { headers });
    assert.equal(logout.status, 302);
    assert.equal(logout.headers.get('location'), '/');
    assert.match(cookies(logout), /connect\.sid=; token=/);
    assert.equal((await request('/dashboard', { headers })).status, 302);
});

test('regular users can view the session example but cannot access the admin dashboard', async () => {
    const response = await login('/login', 'user');
    const headers = { cookie: cookies(response) };
    const dashboard = await request('/dashboard', { headers });
    assert.equal(dashboard.status, 302);
    assert.equal(dashboard.headers.get('location'), '/login');
    const sessionPage = await request('/test', { headers });
    assert.equal(sessionPage.status, 200);
    assert.match(await sessionPage.text(), /session is working user/);
});

test('JWT login issues an expiring cookie accepted by the token check endpoint', async () => {
    const response = await login('/login/jwt');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/checktoken');
    const cookie = cookies(response);
    const decoded = jwt.verify(cookie.slice('token='.length), process.env.JWT_SECRET);
    assert.deepEqual(decoded.user, { id: 1, username: 'admin', role: 'admin' });
    assert.equal(decoded.exp - decoded.iat, 120);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(response.headers.get('set-cookie'), /Max-Age=120/i);
    const check = await request('/checktoken', { headers: { cookie } });
    assert.equal(check.status, 200);
    assert.match(await check.text(), /Token is valid. User: admin/);
    assert.equal((await request('/dashboard', { headers: { cookie } })).status, 302);
});

test('mock tokens work; missing, invalid, and expired tokens are rejected', async () => {
    const response = await request('/token');
    assert.equal(response.status, 200);
    const check = await request('/checktoken', { headers: { cookie: cookies(response) } });
    assert.equal(check.status, 200);
    assert.match(await check.text(), /User: brad/);
    const expired = jwt.sign({ user: { username: 'admin' } }, process.env.JWT_SECRET, { expiresIn: -1 });
    for (const cookie of ['', 'token=invalid', `token=${expired}`]) {
        assert.equal((await request('/checktoken', { headers: { cookie } })).status, 401);
    }
});

test('bootstrap serves templates and CSS, applies headers and body limits, and renders 404s', async () => {
    const home = await request('/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Welcome to Express/);
    assert.equal(home.headers.get('x-powered-by'), null);
    assert.ok(home.headers.get('content-security-policy'));
    assert.equal((await request('/stylesheets/style.css')).status, 200);
    const missing = await request('/missing-page');
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Status Code: 404/);
    assert.equal((await request('/.env')).status, 404);
    const oversized = await request('/login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'a'.repeat(102401) }),
    });
    assert.equal(oversized.status, 413);
    const malformed = await request('/login', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    });
    assert.equal(malformed.status, 400);
});

test('async errors render details only in development', async t => {
    for (const env of ['development', 'production']) {
        const errorApp = express();
        errorApp.set('env', env);
        bootstrap.setup(errorApp);
        errorApp.get('/failure', async () => { throw new Error('private-fixture-detail'); });
        bootstrap.errorHandling(errorApp);
        const errorServer = errorApp.listen(0, '127.0.0.1');
        t.after(() => new Promise(resolve => errorServer.close(resolve)));
        await once(errorServer, 'listening');
        const response = await fetch(`http://127.0.0.1:${errorServer.address().port}/failure`);
        assert.equal(response.status, 500);
        const html = await response.text();
        if (env === 'development') assert.match(html, /private-fixture-detail/);
        else {
            assert.match(html, /Internal Server Error/);
            assert.doesNotMatch(html, /private-fixture-detail|Stack:/);
        }
    }
});
