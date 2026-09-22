import assert from 'node:assert/strict';
import { test } from 'node:test';
import UserService from '../services/userService.js';

test('both mock accounts accept the documented demo password and reject a wrong password', async () => {
    const service = new UserService();
    assert.notEqual(service.users[0].password.split('$')[1], service.users[1].password.split('$')[1]);
    for (const username of ['admin', 'user']) {
        const user = await service.validUserCredentials(username, 'demo-password');
        assert.equal(user.username, username);
        assert.equal(user.role, username);
        assert.equal(await service.validUserCredentials(username, 'wrong-password'), false);
    }
});

test('new hashes use unique salts and preserve Unicode passwords', async () => {
    const password = 'demo-pässword-🔑';
    const first = await UserService.hashPassword(password);
    const second = await UserService.hashPassword(password);
    assert.match(first, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    assert.notEqual(first.split('$')[1], second.split('$')[1]);
    const service = new UserService();
    for (const hash of [first, second]) {
        service.users[0].password = hash;
        assert.equal((await service.validUserCredentials('admin', password)).username, 'admin');
        assert.equal(await service.validUserCredentials('admin', 'demo-password-🔑'), false);
    }
});

test('malformed stored hashes and non-string passwords are rejected without comparison errors', async () => {
    const service = new UserService();
    const original = service.users[0].password;
    for (const hash of [
        undefined, null, 123, '', 'other-algorithm$hash',
        'scrypt$short$hash', original.slice(0, -2), `${original}00`, `${original}\n`,
        original.replace('scrypt$', 'scrypt$zz'),
        original.slice(0, -2) + 'zz',
    ]) {
        service.users[0].password = hash;
        assert.equal(await service.validUserCredentials('admin', 'demo-password'), false);
    }
    service.users[0].password = original;
    for (const password of [undefined, null, 123, {}, ['demo-password']]) {
        assert.equal(await service.validUserCredentials('admin', password), false);
        await assert.rejects(UserService.hashPassword(password), TypeError);
    }
});

test('unknown users retain the existing not-found error contract', async () => {
    await assert.rejects(new UserService().validUserCredentials('missing', 'demo-password'), {
        message: 'Authentication: User not found',
    });
});
