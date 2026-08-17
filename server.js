import debug from 'debug';
import { app } from './app.js';
import { host, port } from './config/bootstrap.js';

export const codeTrace = debug('comp3028:server');

export const runningServer = app.listen(port, host, (error) => {
  if (error) {
    console.error('Unable to start the server:', error);
    process.exitCode = 1;
    return;
  }

  const address = runningServer.address();
  const listeningPort = typeof address === 'object' && address ? address.port : port;
  const url = `http://${host}:${listeningPort}`;

  console.log(`Example app listening at ${url}`);
  codeTrace(`Server started at ${url}`);
});
