require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');
const expressLayouts = require('express-ejs-layouts');

const { initSchema } = require('./db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const pupilRoutes = require('./routes/pupil');
const imageRoutes = require('./routes/images');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'dev-secret-change-me'],
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
  })
);

// Make session available in every view
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/pupil', pupilRoutes);
app.use('/images', imageRoutes);

app.get('/', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  if (req.session && req.session.pupilId) return res.redirect('/pupil');
  res.render('home', { title: 'Golf Skills Challenges' });
});

app.use((req, res) => {
  res.status(404).render('404', { title: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Something went wrong', error: err });
});

const PORT = process.env.PORT || 3000;

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Golf skills tracker running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database schema:', err);
    process.exit(1);
  });
