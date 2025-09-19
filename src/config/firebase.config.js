const admin = require('firebase-admin');

const usingEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

function readServiceAccount() {
	// Prefer explicit JSON content
	let json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
	if (!json && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
		// Support base64-encoded value to avoid quoting issues in dashboards
		const buf = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
		json = buf.toString('utf8');
	}
	if (!json && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		// As a last resort, allow Admin SDK to read from file path (good for local dev)
		return null; // returning null signals to use application default credentials
	}
	if (!json) return null;

	try {
		const sa = JSON.parse(json);
		if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
		return sa;
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[Firebase] Invalid service account JSON in env var');
		throw e;
	}
}

if (!admin.apps.length) {
	if (usingEmulator) {
		admin.initializeApp();
		// eslint-disable-next-line no-console
		console.log(`[Firebase] Auth Emulator enabled at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
	} else {
		const sa = readServiceAccount();
		if (sa) {
			admin.initializeApp({ credential: admin.credential.cert(sa) });
			// eslint-disable-next-line no-console
			console.log('[Firebase] Initialized with service account from env');
		} else {
			// Fallback to ADC (GOOGLE_APPLICATION_CREDENTIALS) for local dev
			admin.initializeApp();
			// eslint-disable-next-line no-console
			console.log('[Firebase] Initialized with application default credentials');
		}
	}
}

module.exports = admin;
