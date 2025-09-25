import jwt from 'jsonwebtoken';
import UserService from '../services/userService.js';
/**
 * Renders the index page with the specified title.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>} - A promise that resolves when the rendering is complete.
 */
export async function index(req, res, next) {
    res.render('home', { title: 'Express' });
}

/**
 * Handle login requests: validates credentials, manages session, and responds by rendering or redirecting.
 *
 * - If the request is not POST or required fields are missing, destroys any existing session and renders the login view.
 * - If credentials are valid, sets req.session.user and redirects (302) to /dashboard.
 * - On authentication failure or error, renders the login view with an error message.
 *
 * @async
 * @param {import('express').Request} req - Express request; expects body { username, password }.
 * @param {import('express').Response} res - Express response used to render views or issue redirects.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>} Resolves after rendering or redirecting.
 * @throws Will render the login view with an error message on authentication failure or unexpected errors.
 */
export async function login(req, res, next) {
    const { username, password } = req.body;
    if (req.method !== 'POST' || !username || !password) {
        req.session.destroy();
        return res.render('login', { message: '' });
    }
    try {
        const userService = new UserService();
        const user = await userService.validUserCredentials(username, password);
        if (user) {
            req.session.user = { id: user.id, username: user.username, role: user.role };
            res.redirect(302, '/dashboard');
        } else {
            throw new Error('Authentication: Invalid credentials');
        }
    } catch (err) {
        console.error(err);
        return res.render('login', { message: 'Invalid username or password' });
    }
}

/**
 * Handle login requests by validating credentials and issuing a JWT cookie.
 *
 * - If the request is not a POST or missing username/password, clears the 'token' cookie and renders the login page.
 * - If credentials are valid, sets a signed httpOnly 'token' cookie (short expiry) and redirects to /dashboard.
 * - On invalid credentials or other errors, renders the login page with an error message.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {Promise<void>} Resolves after sending a response (render or redirect).
 */
export async function loginjwt(req, res, next) {
    const { username, password } = req.body;
    if (req.method !== 'POST' || !username || !password) {
        res.clearCookie('token'); // Not bullet proof, but good enough for this example
        return res.render('login', { message: '' });
    }
    try {
        const userService = new UserService();
        const user = await userService.validUserCredentials(username, password);
        if (user) {
            res.cookie('token', jwt.sign({
                id: user.id,
                username: user.username,
                role: user.role
            },
                process.env.JWT_SECRET
            ),
                { httpOnly: true, expiresIn: '2m' });
            res.redirect(302, '/dashboard');
        } else {
            throw new Error('Authentication: Invalid credentials');
        }
    } catch (err) {
        console.error(err);
        return res.render('login', { message: 'Invalid username or password' });
    }
}

/**
 * Destroy the current session and redirect to the site root.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} Resolves after attempting to destroy the session and issuing a redirect.
 */
export async function logout(req, res, next) {
    req.session.destroy();
    res.redirect('/');
}


/**
 * Render the dashboard view with the username from the session.
 *
 * @async
 * @param {import('express').Request} req - Express request object (expects req.session.username).
 * @param {import('express').Response} res - Express response object used to render the template.
 * @param {import('express').NextFunction} next - Next middleware for error propagation.
 * @returns {Promise<void>} Resolves after rendering or forwards errors via next.
 */
export async function dashboard(req, res, next) {
    res.render('dashboard', { user: req.session.username });
}


/**
 * Render the "test" template with the current session username.
 *
 * @async
 * @param {import('express').Request} req - Express request; expects req.session.user.username.
 * @param {import('express').Response} res - Express response used to render the view.
 * @param {import('express').NextFunction} next - Next middleware function.
 * @returns {Promise<void>} Resolves once the view has been rendered.
 */
export async function test(req, res, next) {
    res.render('test', { username: req.session.user.username });
}

/**
 * Create a short-lived JWT for a mock user, set it as an HTTP-only cookie, and send a confirmation response.
 *
 * The token is signed with process.env.JWT_SECRET and expires in 2 minutes. The cookie is set as httpOnly,
 * secure when NODE_ENV === 'production', and sameSite 'strict'.
 *
 * @async
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} Resolves after sending the response.
 */
export async function createToken(req, res, next) {
    // mock user
    const user = {
        id: 1,
        username: 'brad',
    };
    const token = jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: '2m' });
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.send('Token created');
}

/**
 * Middleware that validates a JWT stored in cookies and attaches the decoded user to the request.
 *
 * @async
 * @param {import('express').Request} req - Express request; expects a cookie named "token".
 * @param {import('express').Response} res - Express response; sends a success message on valid token or a 401 on failure.
 * @param {import('express').NextFunction} next - Express next function (included for middleware signature, not used).
 * @returns {Promise<void>} Resolves after sending a response. On success sets `req.user = decoded.user` and sends a 200 message; on failure logs the error and sends 401 "Unauthorised access".
 */
export async function checkToken(req, res, next) {
    const token = req.cookies.token;
    try {
        if (!token) throw new Error('No Token Found');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        res.send(`Token is valid. User: ${req.user.username}`);
    } catch (err) {
        console.error(err);
        res.status(401).send('Unauthorised access');
    }
}





