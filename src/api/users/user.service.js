const prisma = require('../../config/prisma.client');
const AppError = require('../../utils/AppError');
const { createDefaultCategoriesForUser } = require('../categories/category.seed.service');
const { createDefaultAccountsForUser } = require('../accounts/account.seed.service');

/**
 * Upserts a user using Firebase decoded token and optional profile payload from the client.
 * - Uses decoded.uid and decoded.email as the source of truth for identity.
 * - On create: stores firebase_uid, email and any provided profile fields.
 * - On existing user: updates only allowed fields if present in payload or token (name/picture).
 *
 * Allowed profile fields:
 *  - nombre?: string
 *  - foto_url?: string | fotoUrl?: string
 *  - moneda_base?: string | monedaBase?: string (3-letter code)
 *  - configuraciones?: any (JSON)
 */
async function getOrCreateUserFromDecoded(decoded, payload = {}) {
	const { uid, email, name, picture } = decoded;
	if (!uid || !email) {
		throw new AppError(400, 'Token sin uid o email');
	}

	// Normalize incoming payload keys (accept camelCase or snake_case)
	const normalized = {
		nombre: payload.nombre,
		foto_url: payload.foto_url || payload.fotoUrl,
		moneda_base: payload.moneda_base || payload.monedaBase,
		configuraciones: payload.configuraciones,
	};
	console.log('Normalized user data:', normalized);
	console.log('Decoded token data:', decoded);

	// If name/picture come from Firebase and client didn't send overrides, use them
	if (normalized.nombre == null && name) normalized.nombre = name;
	if (normalized.foto_url == null && picture) normalized.foto_url = picture;

	const existing = await prisma.usuarios.findUnique({ where: { firebase_uid: uid } });
	if (existing) {
		// Prepare selective update (avoid writing undefined values)
		const updateData = {};
		if (typeof normalized.nombre === 'string') updateData.nombre = normalized.nombre;
		if (typeof normalized.foto_url === 'string') updateData.foto_url = normalized.foto_url;
		if (typeof normalized.moneda_base === 'string') updateData.moneda_base = normalized.moneda_base.toUpperCase();
		if (normalized.configuraciones !== undefined) updateData.configuraciones = normalized.configuraciones;

		// If email from Firebase changed (rare), update it to keep in sync
		if (email && email !== existing.email) updateData.email = email;

		if (Object.keys(updateData).length === 0) {
			return existing;
		}
		const updated = await prisma.usuarios.update({ where: { firebase_uid: uid }, data: updateData });
		return updated;
	}

	// Create new user
	const createData = {
		firebase_uid: uid,
		email,
	};
	if (typeof normalized.nombre === 'string') createData.nombre = normalized.nombre;
	if (typeof normalized.foto_url === 'string') createData.foto_url = normalized.foto_url;
	if (typeof normalized.moneda_base === 'string') createData.moneda_base = normalized.moneda_base.toUpperCase();
	if (normalized.configuraciones !== undefined) createData.configuraciones = normalized.configuraciones;

	const created = await prisma.usuarios.create({ data: createData });

	// Create default items for the new user
	await Promise.all([
		createDefaultCategoriesForUser(created.id, prisma),
		createDefaultAccountsForUser(created, prisma)
	]);

	return created;
}

// Registration is handled by Firebase on the client. We don't create Firebase users here.

async function findByFirebaseUid(uid) {
	const user = await prisma.usuarios.findUnique({ where: { firebase_uid: uid } });
	if (!user) throw new AppError(404, 'Usuario no encontrado');
	return user;
}

/**
 * Update user profile fields based on both firebase_uid and email.
 * Only updates: nombre, foto_url, moneda_base, configuraciones, and always sets updated_at.
 */
async function updateProfileByUidAndEmail(firebaseUid, email, payload = {}) {
	if (!firebaseUid || !email) throw new AppError(400, 'Faltan identificadores de usuario');

	// Ensure the combination exists
	const existing = await prisma.usuarios.findFirst({ where: { firebase_uid: firebaseUid, email } });
	if (!existing) throw new AppError(404, 'Usuario no encontrado o email no coincide');

	const updateData = {};
	if (typeof payload.nombre === 'string') updateData.nombre = payload.nombre;
	const foto = payload.foto_url ?? payload.fotoUrl;
	if (typeof foto === 'string') updateData.foto_url = foto;
	const moneda = payload.moneda_base ?? payload.monedaBase;
	if (typeof moneda === 'string') updateData.moneda_base = moneda.toUpperCase();
	if (payload.configuraciones !== undefined) updateData.configuraciones = payload.configuraciones;

	if (Object.keys(updateData).length === 0) {
		throw new AppError(400, 'No hay cambios para actualizar');
	}

	updateData.updated_at = new Date();

	const updated = await prisma.usuarios.update({ where: { id: existing.id }, data: updateData });
	return updated;
}

module.exports = {
	getOrCreateUserFromDecoded,
	findByFirebaseUid,
	updateProfileByUidAndEmail
};