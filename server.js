import debug from 'debug';
import { app } from './app.js';
import { host, port } from './config/bootstrap.js';
import { initializeDb, closeDb } from './config/db.js';

export const codeTrace = debug('comp3028:server');
export let runningServer;

try {
  await initializeDb().query('SELECT 1');
  runningServer = app.listen(port, host, (error) => {
    if (error) return;
    const address = runningServer.address();
    console.log(`Example app listening at http://${host}:${address.port}`);
    codeTrace('Server started');
  });
  runningServer.on('error', async (error) => {
    console.error('Unable to start the server:', error);
    process.exitCode = 1;
    await closeDb();
  });
} catch (error) {
  console.error('Unable to connect to the database:', error);
  process.exitCode = 1;
  await closeDb();
}

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (runningServer?.listening) {
    await new Promise((resolve, reject) => {
      runningServer.close(error => error ? reject(error) : resolve());
    });
  }
  await closeDb();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    shutdown().catch(error => {
      console.error('Unable to shut down cleanly:', error);
      process.exitCode = 1;
    });
  });
}
