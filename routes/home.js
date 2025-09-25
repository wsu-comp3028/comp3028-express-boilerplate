import express from 'express';
import * as home from '../controllers/home.js';
import authorise from '../middleware/authorise.mjs';

export const homeRouter = express.Router()

// Below are all the routes for the home
homeRouter.get('/', home.index);
homeRouter.all('/login', home.login);
homeRouter.get('/logout', home.logout);
homeRouter.get('/dashboard', authorise(['admin']), home.dashboard);
homeRouter.get('/test', home.test);
homeRouter.get('/token', home.createToken);
homeRouter.get('/checktoken', home.checkToken);
homeRouter.all('/login/jwt', home.loginjwt);
