const AppError = require('../utils/AppError');

function validate(schema) {
	return (req, res, next) => {
		try {
			schema.parse({
				body: req.body,
				params: req.params,
				query: req.query,
			});
			next();
		} catch (e) {
			const message = e?.errors?.map((x) => x.message).join(', ') || 'Solicitud inválida';
			next(new AppError(400, message));
		}
	};
}

module.exports = validate;
