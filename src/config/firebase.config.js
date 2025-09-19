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
		// Support three modes:
		// 1) FIREBASE_SERVICE_ACCOUNT_JSON contains raw JSON (string)
		// 2) FIREBASE_SERVICE_ACCOUNT_BASE64 contains base64-encoded JSON
		// 3) GOOGLE_APPLICATION_CREDENTIALS points to a file path (default)
		let serviceAccountObj = null;

		const jsonInline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
		const jsonBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

		try {
			if (jsonInline) {
				serviceAccountObj = JSON.parse(jsonInline);
			} else if (jsonBase64) {
				const jsonStr = Buffer.from(jsonBase64, 'base64').toString('utf8');
				serviceAccountObj = JSON.parse(jsonStr);
			}
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error('[Firebase] Invalid service account JSON provided in env. Falling back to file path.', e);
		}

		if (!serviceAccountObj) {
			const rawPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json';
			const credentialsPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			serviceAccountObj = require(credentialsPath);
		}

		// Ensure private_key has proper newlines when coming through env
		if (serviceAccountObj.private_key) {
			serviceAccountObj.private_key = serviceAccountObj.private_key.replace(/\\n/g, '\n');
		}

		admin.initializeApp({
			credential: admin.credential.cert(serviceAccountObj),
		});
		// eslint-disable-next-line no-console
		console.log('[Firebase] Production token verification enabled');
	}
}

module.exports = admin;
