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

app.use('/api/users', usersRoutes);
app.use('/api/categories', categoryRoutes);

app.use(errorHandler);

module.exports = app;
