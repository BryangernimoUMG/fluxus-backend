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
			// Prefer ZodError.issues if available for clearer messages
			const issues = e?.issues || e?.errors;
			const message = Array.isArray(issues)
				? issues
					  .map((x) => {
						  const path = Array.isArray(x.path) && x.path.length ? `(${x.path.join('.')}) ` : '';
						  return `${path}${x.message}`;
					  })
					  .join(', ')
				: e?.message || 'Solicitud inválida';
			next(new AppError(400, message));
		}
	};
}

module.exports = validate;
