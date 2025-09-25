import bcrypt from 'bcrypt';
// mock user service
class UserService {
    users = [
        {
            id: 1,
            username: 'admin',
            password: '$2b$16$A5TOU0I1AC9S.7ZQZRSWFunfeyzjPA0ALDbv96UVhyDXeN3J7U/Oq',
            role: 'admin'
        },
        {
            id: 2,
            username: 'user',
            password: '$2b$16$A5TOU0I1AC9S.7ZQZRSWFunfeyzjPA0ALDbv96UVhyDXeN3J7U/Oq',
            role: 'user'
        }
    ];


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
        if(user) {
            const valid = await bcrypt.compare(password, user.password)
            return valid ? user : false;
        }
        return false;
    }
}
export default UserService;