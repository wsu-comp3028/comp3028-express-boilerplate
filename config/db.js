import { Pool } from 'pg';

let sharedPool;

// Pool uses PGHOST, PGPORT, PGDATABASE, PGUSER and PGPASSWORD from the environment.
export function initializeDb(config = {}) {
    if (!sharedPool) {
        sharedPool = new Pool({
            connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT ?? 5) * 1000,
            ...config,
        });
        sharedPool.on('error', (error) => {
            console.error('Unexpected database pool error:', error);
        });
    }
    return sharedPool;
}

export async function closeDb() {
    if (sharedPool) {
        await sharedPool.end();
        sharedPool = undefined;
    }
}

export function getDb() {
    return sharedPool;
}

// Resolve the pool at request time so tests can inject their own database.
export function createDbMiddleware(options = {}) {
    return (req, res, next) => {
        const db = options.db || getDb();
        if (!db) {
            return next(new Error('Database connection not initialized. Call initializeDb() first.'));
        }
        req.db = db;
        next();
    };
}

export const dbMiddleware = createDbMiddleware();
export default dbMiddleware;
