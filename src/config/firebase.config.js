const admin = require('firebase-admin');

const usingEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (!admin.apps.length) {
	if (usingEmulator) {
		// When using the Auth Emulator, no service account is required
		admin.initializeApp();
		// eslint-disable-next-line no-console
		console.log(`[Firebase] Auth Emulator enabled at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
	} else {
		const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
		if (!json) {
			throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required but not set');
		}
		let serviceAccount;
		try {
			serviceAccount = JSON.parse(json);
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error('[Firebase] Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
			throw e;
		}
		if (serviceAccount.private_key) {
			serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
		}
		admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
		});
		// eslint-disable-next-line no-console
		console.log('[Firebase] Production token verification enabled');
	}
}

module.exports = admin;
