const { z } = require('zod');

const registerSchema = z.object({
	body: z
		.object({
			idToken: z.string().min(10),
			// Optional profile fields to persist in our DB at registration time
			nombre: z.string().min(1).max(100).optional(),
			foto_url: z.string().url().optional(),
			fotoUrl: z.string().url().optional(),
			// Currency is required on registration, but we allow either key casing
			moneda_base: z.string().length(3).optional(),
			monedaBase: z.string().length(3).optional(),
			configuraciones: z.any().optional(),
		})
		.superRefine((data, ctx) => {
			const currency = data.moneda_base || data.monedaBase;
			if (!currency) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['moneda_base'],
					message: 'moneda_base es obligatoria en el registro',
				});
			}
		}),
});

const loginSchema = z.object({
	body: z.object({
		idToken: z.string().min(10),
	}),
});

const getByUidSchema = z.object({
	params: z.object({
		uid: z.string().min(6),
	}),
});

const updateProfileSchema = z.object({
	body: z.object({
		// For redundancy we accept uid & email in the body, but we will ignore uid in favor of req.user
		uid: z.string().min(6),
		email: z.string().email(),
		nombre: z.string().min(1).max(100).optional(),
		foto_url: z.string().url().optional(),
		fotoUrl: z.string().url().optional(),
		moneda_base: z.string().length(3).optional(),
		monedaBase: z.string().length(3).optional(),
		configuraciones: z.any().optional(),
	}).refine((data) => {
		return (
			data.nombre !== undefined ||
			data.foto_url !== undefined ||
			data.fotoUrl !== undefined ||
			data.moneda_base !== undefined ||
			data.monedaBase !== undefined ||
			data.configuraciones !== undefined
		);
	}, { message: 'Debe proporcionar al menos un campo para actualizar' }),
});

module.exports = { registerSchema, loginSchema, getByUidSchema, updateProfileSchema };
