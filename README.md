# COMP3028 Express authentication examples

An Express 5 application using ES modules, EJS views, session authentication, role-based authorisation, and JWT cookies.

## Setup

Use Node.js `>=24.15.0 <25` and npm `>=12.0.2`. The repository includes `.nvmrc` for Node 24 and specifies npm 12.0.2 in `package.json`.

```sh
nvm install
nvm use
npm install --global npm@12.0.2
npm ci
cp .env.example .env
```

Set `SESSION_SECRET` and `JWT_SECRET` in `.env` to different random values. Generate each value with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Then run:

```sh
npm start
```

The start command loads `.env` using Node's native environment-file support. Existing environment variables take precedence. `HOST` defaults to `127.0.0.1`, and `PORT` defaults to `3000` and must be an integer from 1 to 65535. Both auth secrets are required. `.env` is ignored by Git.

## Application structure

- `app.js` constructs and exports the Express app without opening a listener, in every environment.
- `server.js` starts the HTTP server and reports startup errors.
- `config/bootstrap.js` sets up security headers, logging, body parsing, static files, cookies, sessions, and EJS. Error handling is registered after the routes.
- `routes/home.js`, `controllers/home.js`, and `middleware/authorise.mjs` provide the authentication examples and access checks.
- `services/userService.js` provides mock `admin` and `user` accounts with bcrypt password hashes. Use the password associated with those teaching examples, or replace the mock hashes with hashes for a password you choose.

Import `{ app }` from `app.js` in tests. The `runningServer` and `codeTrace` exports now belong to `server.js`; importing that file starts the listener.

## Authentication examples

| Route | Behaviour |
| --- | --- |
| `/login` | GET displays the session login form; POST checks credentials and redirects to `/dashboard`. |
| `/dashboard` | Requires an `admin` session and displays the logged-in username. |
| `/test` | Requires an `admin` or `user` session and displays the session username. |
| `/login/jwt` | GET displays the JWT login form; POST sets a signed token cookie and redirects to `/checktoken`. |
| `/token` | Creates a token for the mock user `brad` without a login, for demonstrating JWTs. |
| `/checktoken` | Verifies the token cookie and displays its username, or returns HTTP 401. |
| `/logout` | Destroys the session, clears session and token cookies, and redirects home. |

The session and JWT flows are separate examples: a JWT does not grant access to the session-protected dashboard. Sessions use a one-minute cookie lifetime. JWTs and their cookies expire after two minutes. JWT cookies require HTTPS when `NODE_ENV=production`.

This is a teaching application: it uses mock users and the default in-memory session store. The `/token` demonstration deliberately bypasses credentials. Production deployments need a persistent session store and an appropriate authentication design.

## Tests

```sh
npm test
```

The tests use Node's built-in test runner and open temporary localhost listeners. They provide their own secrets and credential fixtures, exercising real bcrypt comparisons, session cookies, role checks, and JWT signing/verification without requiring your `.env` or changing the mock account hashes.

Coverage includes bodyless login requests under Express 5, startup with `.env`, port errors, importing the app without a listener, logout, token expiry, static files, request-size limits, and development/production error rendering.
