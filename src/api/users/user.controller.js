const admin = require('../../config/firebase.config');
const AppError = require('../../utils/AppError');
const catchAsync = require('../../utils/catchAsync');
const userService = require('./user.service');

const register = catchAsync(async (req, res) => {
	// Frontend already created/authenticated the user with Firebase and sends an ID token.
	// Besides the token, the body may include profile fields to persist in our DB.
	const { idToken, ...profile } = req.body;
	const decoded = await admin.auth().verifyIdToken(idToken);
	const user = await userService.getOrCreateUserFromDecoded(decoded, profile);
	res.status(201).json({ user });
});

const login = catchAsync(async (req, res, next) => {
	const { idToken } = req.body;
	const decoded = await admin.auth().verifyIdToken(idToken);
	// On login we expect the user to already exist in our DB
	try {
		const user = await userService.findByFirebaseUid(decoded.uid);
		return res.json({ user });
	} catch (err) {
		// If not found, surface a clear error instructing client to register
		if (err?.statusCode === 404) {
			return next(new AppError(404, 'Usuario no registrado. Debe registrarse primero.'));
		}
		return next(err);
	}
});

const getByUid = catchAsync(async (req, res, next) => {
	const { uid } = req.params;
	// Only allow self access
	if (!req.user || req.user.firebase_uid !== uid) {
		return next(new AppError(403, 'Prohibido'));
	}
	const user = await userService.findByFirebaseUid(uid);
	res.json({ user });
});

const updateProfile = catchAsync(async (req, res, next) => {
	// Auth required; trust req.user.uid for identity and require matching email in body
	if (!req.user) return next(new AppError(401, 'No autenticado'));
	const { email, uid, ...changes } = req.body;

	// Optional: ensure uid in body matches authenticated user to catch client mistakes
	if (uid && uid !== req.user.firebase_uid) return next(new AppError(403, 'No esta autorizado para modificar este usuario'));

	const updated = await userService.updateProfileByUidAndEmail(req.user.firebase_uid, email, changes);
	res.json({ user: updated });
});

module.exports = { register, login, getByUid, updateProfile };
