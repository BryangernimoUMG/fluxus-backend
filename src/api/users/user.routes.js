const express = require('express');
const { register, login, getByUid, updateProfile } = require('./user.controller');
const validate = require('../../middleware/validate.request');
const { registerSchema, loginSchema, getByUidSchema, updateProfileSchema } = require('./user.validation');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/:uid', authenticate, validate(getByUidSchema), getByUid);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);

module.exports = router;
