# Express boilerplate — data sources

An ES module Express application with form, JSON, file-upload and PostgreSQL examples.

## Setup

Use Node 24.15 or later in the Node 24 series and npm 12.0.2 or later, as specified in `package.json` (`.nvmrc` selects Node 24).

```sh
npm ci
cp .env.example .env
```

Create a PostgreSQL database, then edit the `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `PGPASSWORD` values in `.env` to match it. `PGCONNECT_TIMEOUT` sets the connection timeout in seconds (default: 5). The example assumes a local database named `comp3028`; database creation is separate from table migrations. Replace the example password with your local credentials.

```sh
npm run db:migrate
npm start
```

Open http://127.0.0.1:3000 (or the configured `HOST` and `PORT`). Examples include `/form`, `/upload`, `/user` and `/user/1`; the home page calls `/api/data` using browser fetch.

## Structure

- `app.js` constructs the app and registers middleware, routes and error handling. Importing it opens neither an HTTP listener nor a database connection.
- `server.js` initialises the shared `pg` pool, checks the connection, then starts listening. SIGINT/SIGTERM stop the listener and close the pool.
- `config/bootstrap.js` configures Express, Helmet, request parsing, file uploads and error pages.
- `config/db.js` provides the shared pool and injectable database middleware. `initializeDb(config)` accepts `pg` pool options; otherwise `pg` uses the environment. Controllers use `req.db.query(text, values)` and read `result.rows`.

## Migrations

`npm run db:migrate` executes SQL files in filename order using the same `.env` configuration as the server. This teaching runner has no migration-history table: run it against an empty database. Re-running the scripts can fail on existing indexes or seed records. Failures return a non-zero exit code; earlier successful files remain applied.

`npm run db:drop` **deletes all tables in the configured database's public schema with CASCADE**. Use only with a disposable teaching database. The runner also accepts the legacy `destroy` alias. SQL files are trusted project files, not user input.

## Checks

```sh
npm test
```

The tests exercise HTTP routes, parameterised user queries, database error handling, injection and uploads with a stubbed pool. They do not require PostgreSQL. Validate the migration scripts separately against a disposable PostgreSQL database.
