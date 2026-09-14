import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function run(file, args = []) {
    return spawnSync(process.execPath, [file, ...args], {
        encoding: 'utf8', timeout: 10000,
        env: { ...process.env, PGHOST: '127.0.0.1', PGPORT: '1', PGCONNECT_TIMEOUT: '1' },
    });
}

test('app import exits without opening a listener or a database', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./app.js')"], {
        encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
});

test('migration runner rejects unknown commands', () => {
    const result = run('config/migrationRunner.js', ['unknown']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
});

test('migration connection failure exits unsuccessfully and closes the pool', () => {
    const result = run('config/migrationRunner.js', ['migrate']);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Database command failed/);
});

test('server connection failure exits without starting HTTP', () => {
    const result = run('server.js');
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unable to connect to the database/);
    assert.doesNotMatch(result.stdout, /Example app listening/);
});
