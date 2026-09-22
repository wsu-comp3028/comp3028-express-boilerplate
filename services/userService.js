import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
const keyLength = 64;
const scryptOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

// mock user service
// Demo password is `demo-password`
class UserService {
    users = [
        {
            id: 1,
            username: 'admin',
            password: 'scrypt$ea5fddcea0093f02a3deb5e307ea5057$da7c5fb003991db2b59f2895e870e02e3560f4bac76febe7bf99a77835647ea5a3745aeb2d77d3fb04a1c3aaba3a474cb4a43a23560806e529016e3644e4f289',
            role: 'admin'
        },
        {
            id: 2,
            username: 'user',
            password: 'scrypt$67ac9eb5fb19171b7b5dba02ff497119$0fed3ecc6e965d5409e50018cbdd74a9cedb857e1b3101440908eba0cdfdeceb1017171c4743b2608f45f82c56de995b080119d11bff8960e28542bb107e0df1',
            role: 'user'
        }
    ];

    /**
     * Hash a password with a random 16-byte salt.
     * Stored format: scrypt$<salt in hex>$<derived key in hex>.
     * All stored hashes use the scrypt parameters defined above.
     *
     * @param {string} password - Plaintext password to hash.
     * @returns {Promise<string>} Salt and hash suitable for the user's password field.
     */
    static async hashPassword(password) {
        if (typeof password !== 'string') {
            throw new TypeError('Password must be a string');
        }
        const salt = randomBytes(16);
        const hash = await deriveKey(password, salt, keyLength, scryptOptions);
        return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
    }


    /**
     * Retrieve a user by username.
     *
     * @async
     * @param {string} username - The username to find.
     * @returns {Promise<Object>} Resolves with the user object when found.
     * @throws {Error} If no user matches the given username ("Authentication: User not found").
     */
    async getUser(username) {
        return new Promise((resolve, reject) => {
            const user = this.users.find(user => user.username === username);
            return user ? resolve(user) : reject(new Error('Authentication: User not found'));
        });
    }

    /**
     * Validate user credentials by fetching the user and comparing the provided password to the stored hash.
     *
     * @param {string} username - Username to fetch.
     * @param {string} password - Plaintext password to verify.
     * @returns {Promise<Object|false>} Resolves to the user object if credentials are valid, otherwise false.
     */
    async validUserCredentials(username, password) {
        const user = await this.getUser(username);
        if (!user || typeof password !== 'string' || typeof user.password !== 'string') {
            return false;
        }

        // Validate the format before decoding so malformed hashes cannot be truncated.
        const parts = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i.exec(user.password);
        if (!parts || parts[0] !== user.password) return false;

        const salt = Buffer.from(parts[1], 'hex');
        const storedHash = Buffer.from(parts[2], 'hex');
        const suppliedHash = await deriveKey(password, salt, keyLength, scryptOptions);
        return timingSafeEqual(storedHash, suppliedHash) ? user : false;
    }
}
export default UserService;
