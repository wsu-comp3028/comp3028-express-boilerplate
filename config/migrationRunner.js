import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { initializeDb, closeDb } from './db.js';

const migrationsDir = path.join(import.meta.dirname, '../migrations');
const command = process.argv[2];

if (!['migrate', 'drop', 'destroy'].includes(command)) {
    console.error('Usage: npm run db:migrate or npm run db:drop (destroy is an alias for drop).');
    process.exitCode = 1;
} else {
    const db = initializeDb();
    try {
        if (command === 'migrate') {
            const files = (await readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort();
            for (const file of files) {
                console.log(`Applying migration: ${file}`);
                await db.query(await readFile(path.join(migrationsDir, file), 'utf8'));
            }
            console.log('All migrations applied successfully.');
        } else {
            const { rows } = await db.query(`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);
            for (const { table_name } of rows) {
                // Identifiers cannot use $1 parameters. Escape embedded double quotes.
                const identifier = '"' + table_name.replaceAll('"', '""') + '"';
                await db.query(`DROP TABLE IF EXISTS public.${identifier} CASCADE`);
                console.log(`Dropped table: ${table_name}`);
            }
        }
    } catch (error) {
        console.error('Database command failed:', error);
        process.exitCode = 1;
    } finally {
        await closeDb();
    }
}
