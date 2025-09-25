import createError from 'http-errors';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import express from 'express';
import path from 'path';
import session from 'express-session';
import 'dotenv/config';


// Set the server port
export const port = 3000;

/**
 * Set up the server with boilerplate middleware
 * 
 * @param {Object} app - The Express application object.
 */
export function setup (app) {
    // Register bootstrap middleware
    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(import.meta.dirname, '..', 'public')));
    
    app.use(session({ 
        secret: process.env.SESSION_SECRET, 
        saveUninitialized: false,
        resave: true,
        httpOnly: true,
        cookie: { maxAge: 60000 }
    }));

    
    // view engine setup
    app.set('views', path.join(import.meta.dirname, '..', 'views'));
    app.set('view engine', 'ejs');
};

/**
 * Handles error for the application.
 * 
 * @param {Object} app - The Express app object.
 */
export function errorHandling(app) {
    // catch 404 and forward to error handler
    app.use((req, res, next) => {
        next(createError(404));
    });

    // Default Error handler 
    app.use((err, req, res, next) => {
        // Set locals, only providing error details in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};
    
        // Render the error page
        res.status(err.status || 500);
        res.render('error', { title: 'Error' });
    });
}