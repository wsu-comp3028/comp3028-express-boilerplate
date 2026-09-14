import express from 'express';
import * as bootstrap from './config/bootstrap.js';
import { dbMiddleware } from './config/db.js';
import { homeRouter } from './routes/home.js';

// Construct the app without starting the HTTP server.
export const app = express();
bootstrap.setup(app);

// Register any middleware here
app.use(dbMiddleware);

// Register routers here
app.use('/', homeRouter);

// Not encouraged, but this is a simple example of how to register a route without a router.
app.get('/test', (req, res) => {
  res.send('Test');
});

// Register error handling after all routes.
bootstrap.errorHandling(app);
