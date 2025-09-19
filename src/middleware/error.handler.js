/* eslint-disable no-unused-vars */
const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
	const status = err.statusCode || 500;
	const message = err.message || 'Error interno del servidor';
	if (process.env.NODE_ENV !== 'production') {
		// Basic log
		// eslint-disable-next-line no-console
		console.error(err);
	}
	res.status(status).json({ status, message });
}

module.exports = errorHandler;
