import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.join(import.meta.dirname, '..');
const env = {
    ...process.env, NODE_ENV: 'development', HOST: '127.0.0.1', PORT: '3000',
    SESSION_SECRET: 'session-secret-for-startup-tests', JWT_SECRET: 'jwt-secret-for-startup-tests',
};

test('importing app.js never starts a listener, including outside test mode', { timeout: 10000 }, async t => {
    const occupied = createServer().listen(0, '127.0.0.1');
    t.after(() => new Promise(resolve => occupied.close(resolve)));
    await once(occupied, 'listening');
    for (const mode of ['development', 'production', 'test']) {
        const result = await run(process.execPath, ['--input-type=module', '-e',
            "const { app } = await import('./app.js'); console.log(typeof app);"], {
            cwd: root, env: { ...env, NODE_ENV: mode, PORT: String(occupied.address().port) }, timeout: 3000,
        });
        assert.equal(result.stdout.trim(), 'function');
        assert.doesNotMatch(result.stderr, /EADDRINUSE/);
    }
});

test('startup validates the port and required auth secrets', async () => {
    for (const [name, value, message] of [
        ['PORT', 'invalid', /PORT must be an integer/],
        ['PORT', '65536', /PORT must be an integer/],
        ['SESSION_SECRET', '', /SESSION_SECRET must be set/],
        ['JWT_SECRET', '', /JWT_SECRET must be set/],
    ]) {
        await assert.rejects(run(process.execPath, ['server.js'], {
            cwd: root, env: { ...env, [name]: value }, timeout: 3000,
        }), err => err.code === 1 && message.test(err.stderr));
    }
});

test('server startup reports an occupied port and exits unsuccessfully', async t => {
    const occupied = createServer().listen(0, '127.0.0.1');
    t.after(() => new Promise(resolve => occupied.close(resolve)));
    await once(occupied, 'listening');
    await assert.rejects(run(process.execPath, ['server.js'], {
        cwd: root, env: { ...env, PORT: String(occupied.address().port) }, timeout: 3000,
    }), err => err.code === 1 && /Unable to start the server:/.test(err.stderr) && /EADDRINUSE/.test(err.stderr));
});

test('the start command loads .env and listens on the configured host and port', { timeout: 10000 }, async t => {
    const directory = await mkdtemp(path.join(tmpdir(), 'comp3028-auth-startup-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const reservation = createServer().listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    await writeFile(path.join(directory, '.env'), [
        'NODE_ENV=development', 'HOST=127.0.0.1', `PORT=${port}`,
        'SESSION_SECRET=env-session-test-secret', 'JWT_SECRET=env-jwt-test-secret',
    ].join('\n'));
    const childEnv = { ...process.env };
    for (const key of ['NODE_ENV', 'HOST', 'PORT', 'SESSION_SECRET', 'JWT_SECRET', 'DEBUG']) delete childEnv[key];
    const { scripts } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    assert.equal(scripts.start, 'node --env-file-if-exists=.env server.js');
    const child = spawn(process.execPath, ['--env-file-if-exists=.env', path.join(root, 'server.js')], {
        cwd: directory, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const closed = once(child, 'close');
    t.after(async () => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await closed;
    });
    const output = [];
    child.stderr.on('data', data => output.push(data.toString()));
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Server did not start: ${output.join('')}`)), 5000);
        child.on('error', err => { clearTimeout(timer); reject(err); });
        child.on('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output.join('')}`)); });
        child.stdout.on('data', data => {
            output.push(data.toString());
            if (output.join('').includes(`http://127.0.0.1:${port}`)) { clearTimeout(timer); resolve(); }
        });
    });
    const response = await fetch(`http://127.0.0.1:${port}/login`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Login Form/);
});
