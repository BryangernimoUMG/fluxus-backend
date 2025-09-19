const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/error.handler');
const usersRoutes = require('./api/users/user.routes');
const categoryRoutes = require('./api/categories/category.routes');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

// Basic health and root endpoints for uptime checks
app.get('/', (_req, res) => {
	res.json({ ok: true, name: 'fluxus-backend', version: '1.0.0' });
});
app.get('/healthz', (_req, res) => res.send('ok'));

app.use('/api/users', usersRoutes);
app.use('/api/categories', categoryRoutes);

app.use(errorHandler);

module.exports = app;
