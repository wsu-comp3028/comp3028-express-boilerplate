import path from 'path';

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
 * Renders the form page with the specified page title.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
 */
export async function form(req, res, next) {
    res.render('form', { title: 'Express' });
}

/**
 * Handles the form submission and sends a response with the name.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
 */
export async function submit(req, res, next) {
    console.log(`The name is: ${req.body.name}`);
    res.send(`Hello "${req.body.name}"`);
}

/**
 * Retrieves data from the request body and sends a JSON response.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
 */
export async function getData(req, res, next) {
    console.log(`The name is: ${req.body.name}`);
    res.json({ title: 'Express' });
}

/**
 * Handles both GET and POST requests, and sends a response if the file upload
 * was successful.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
 */
export async function uploadFile(req, res, next) {
    let msg = "No file uploaded";
    if (req.files) {
        msg = `File uploaded successfully: ${req.files.file.name}`;
        await req.files.file.mv(
            path.join(import.meta.dirname, '../public/uploads', path.basename(req.files.file.name))
        );
    }
    res.render('fileUpload', {msg: msg});
}

export async function user(req, res, next) {
    try {
        const id = req.params.id;
        const result = id === undefined
            ? await req.db.query('SELECT * FROM users ORDER BY id')
            : await req.db.query('SELECT * FROM users WHERE id = $1', [id]);
        res.render('user', { users: result.rows });
    } catch (error) {
        next(error);
    }
}
