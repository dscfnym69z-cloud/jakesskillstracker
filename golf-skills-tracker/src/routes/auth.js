const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login-choice', { title: 'Log in' });
});

// ---- Admin login ----
router.get('/login/admin', (req, res) => {
  res.render('login-admin', { title: 'Coach login', error: null });
});

router.post('/login/admin', (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.ADMIN_USERNAME || 'coach';
  const validPass = process.env.ADMIN_PASSWORD || 'password';

  if (username === validUser && password === validPass) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  return res.status(401).render('login-admin', {
    title: 'Coach login',
    error: 'Incorrect username or password.',
  });
});

// ---- Pupil login (name only, no password) ----
router.get('/login/pupil', async (req, res, next) => {
  try {
    const { rows: pupils } = await query('SELECT id, name FROM pupils ORDER BY name ASC');
    res.render('login-pupil', { title: 'Pupil login', pupils, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/login/pupil', async (req, res, next) => {
  try {
    const { pupilId } = req.body;
    const { rows } = await query('SELECT id, name FROM pupils WHERE id = $1', [pupilId]);
    if (!rows.length) {
      const { rows: pupils } = await query('SELECT id, name FROM pupils ORDER BY name ASC');
      return res.status(400).render('login-pupil', {
        title: 'Pupil login',
        pupils,
        error: 'Please select your name from the list.',
      });
    }
    req.session.pupilId = rows[0].id;
    req.session.pupilName = rows[0].name;
    return res.redirect('/pupil');
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

module.exports = router;
