import createError from 'http-errors';
import helmet from 'helmet';
import logger from 'morgan';
import express from 'express';
import path from 'path';

const configuredPort = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
    throw new RangeError('PORT must be an integer between 1 and 65535.');
}

export const host = process.env.HOST || '127.0.0.1';
export const port = configuredPort;


/**
 * Set up the server with boilerplate middleware
 * 
 * @param {Object} app - The Express application object.
 */
export function setup (app) {
    const isDevelopment = app.get('env') === 'development';

    // Register bootstrap middleware
    app.disable('x-powered-by');
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                'upgrade-insecure-requests': isDevelopment ? null : [],
            },
        },
    }));
    app.use(logger(isDevelopment ? 'dev' : 'combined'));
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: false, limit: '100kb', parameterLimit: 1000 }));
    app.use(express.static(path.join(import.meta.dirname, '..', 'public'), {
        dotfiles: 'ignore',
    }));

    // view engine setup
    app.set('views', path.join(import.meta.dirname, '..', 'views'));
    app.set('view engine', 'ejs');
}

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
        const status = err.status || 500;
        const isDevelopment = req.app.get('env') === 'development';

        // Set locals, only providing error details in development
        res.locals.message = status >= 500 && !isDevelopment
            ? 'Internal Server Error'
            : err.message;
        res.locals.status = status;
        res.locals.error = isDevelopment ? err : null;
    
        // Render the error page
        res.status(status);
        res.render('error', { title: 'Error' });
    });
}
