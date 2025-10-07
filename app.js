import express from 'express';
import debug from 'debug';
import * as server from './config/server.js';
import { homeRouter } from './routes/home.js';
import authorise from './middleware/authorise.mjs';

// Setup debug module to spit out all messages
// Do `npn start` to see the debug messages
export const codeTrace = debug('comp3028:server');

// Start the app
export const app = express();
server.setup(app)

// Register any middleware here


// Register routers here
app.use('/', homeRouter);

// Not encouraged, but this is a simple example of how to register a route without a router.
app.get('/test', (req, res) => {
  res.send('Test');
});

// ####################################### No need to modify below this line #######################################
export let runningServer;
// Only start server if not in test mode
// This allows supertest to run without the server already listening
// run tests with "NODE_ENV=test node --test"
if(process.env.NODE_ENV === 'test') {
  codeTrace('Running in test mode - not starting server, just exporting app');
} else {
  // Start the server
  runningServer = app.listen(server.port, () => {
    console.log(`Example app listening on port http://127.0.0.1:${server.port}`);
  });
}
