import express from 'express';
import * as home from '../controllers/home.js';

export const homeRouter = express.Router()

// Below are all the routes for the home
homeRouter.get('/', home.index);
homeRouter.get('/form', home.form);
homeRouter.post('/submit', home.submit);
homeRouter.post('/api/data', home.getData);
homeRouter.get('/upload', home.uploadFile);
homeRouter.post('/upload', home.uploadFile);
homeRouter.get('/user', home.user);
homeRouter.get('/user/:id', home.user);



