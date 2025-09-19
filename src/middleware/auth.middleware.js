const admin = require('../config/firebase.config');
const prisma = require('../config/prisma.client');
const AppError = require('../utils/AppError');

async function authenticate(req, res, next) {
	try {
		const header = req.headers.authorization || '';
		const [scheme, token] = header.split(' ');
		if (scheme !== 'Bearer' || !token) {
			return next(new AppError(401, 'Token no provisto'));
		}

		const decoded = await admin.auth().verifyIdToken(token);
		const firebaseUid = decoded.uid;

		const dbUser = await prisma.usuarios.findUnique({ where: { firebase_uid: firebaseUid } });
		if (!dbUser) {
			return next(new AppError(403, 'Usuario no registrado'));
		}

		req.user = dbUser;
		req.token = decoded;
		return next();
	} catch (err) {
		return next(new AppError(401, 'Token inválido'));
	}
}

module.exports = { authenticate };
