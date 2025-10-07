import postgres from 'postgres';

// Create a single shared connection that can be reused
let sharedConnection = null;

/**
 * Initialize the database connection
 * This should be called once when the app starts
 */
export  function initializeDb(config = {}) {
    if (!sharedConnection) {
        sharedConnection =  postgres({
            host: 'localhost',
            port: 5432,
            database: 'postgres',
            username: 'postgres',
            password: 'postgres'
        });
    }
    return sharedConnection;
}

/**
 * Close the database connection
 * This should be called when the app shuts down or in test cleanup
 */
export async function closeDb() {
    if (sharedConnection) {
        await sharedConnection.end();
        sharedConnection = null;
    }
}

/**
 * Get the current database connection
 */
export function getDb() {
    return sharedConnection;
}

/**
 * Database middleware factory that accepts a database connection
 * @param {Object} options - Configuration options
 * @param {Function} options.db - Database connection to use (defaults to shared connection)
 * @returns {Function} Express middleware function
 */
export function createDbMiddleware(options = {}) {
    return (req, res, next) => {
        // Get the database connection at request time, not at middleware creation time
        const db = options.db || getDb();
        
        if (!db) {
            throw new Error('Database connection not initialized. Call initializeDb() first.');
        }
        req.db = db;
        next();
    };
}

/**
 * Default middleware using the shared connection
 */
export const dbMiddleware = createDbMiddleware();

export default dbMiddleware;
