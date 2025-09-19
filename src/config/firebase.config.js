const admin = require('firebase-admin');
const path = require('path');

const usingEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (!admin.apps.length) {
	if (usingEmulator) {
		// When using the Auth Emulator, no service account is required
		admin.initializeApp();
		// eslint-disable-next-line no-console
		console.log(`[Firebase] Auth Emulator enabled at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
	} else {
		const rawPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json';
		const credentialsPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const serviceAccount = require(credentialsPath);
		admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
		});
		// eslint-disable-next-line no-console
		console.log('[Firebase] Production token verification enabled');
	}
}

module.exports = admin;
