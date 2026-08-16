const express = require('express');
const multer = require('multer');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const { rows: pupilCount } = await query('SELECT COUNT(*)::int AS c FROM pupils');
    const { rows: challengeCount } = await query('SELECT COUNT(*)::int AS c FROM challenges');
    const { rows: scoreCount } = await query('SELECT COUNT(*)::int AS c FROM scores');
    res.render('admin/dashboard', {
      title: 'Coach dashboard',
      pupilCount: pupilCount[0].c,
      challengeCount: challengeCount[0].c,
      scoreCount: scoreCount[0].c,
    });
  } catch (err) {
    next(err);
  }
});

// ---- Pupils ----
router.get('/pupils', async (req, res, next) => {
  try {
    const { rows: pupils } = await query('SELECT id, name, created_at FROM pupils ORDER BY name ASC');
    res.render('admin/pupils', { title: 'Manage pupils', pupils, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/pupils', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.redirect('/admin/pupils');
    await query('INSERT INTO pupils (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    res.redirect('/admin/pupils');
  } catch (err) {
    next(err);
  }
});

router.post('/pupils/:id/edit', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (name) {
      await query('UPDATE pupils SET name = $1 WHERE id = $2', [name, req.params.id]);
    }
    res.redirect('/admin/pupils');
  } catch (err) {
    if (err && err.code === '23505') {
      const { rows: pupils } = await query('SELECT id, name, created_at FROM pupils ORDER BY name ASC');
      return res.status(400).render('admin/pupils', {
        title: 'Manage pupils',
        pupils,
        error: 'Another pupil already has that name — please use something to tell them apart (e.g. add a surname initial).',
      });
    }
    next(err);
  }
});

router.post('/pupils/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM pupils WHERE id = $1', [req.params.id]);
    res.redirect('/admin/pupils');
  } catch (err) {
    next(err);
  }
});

// ---- Challenges ----
router.get('/challenges', async (req, res, next) => {
  try {
    const { rows: challenges } = await query(
      'SELECT id, name, description, higher_is_better, image_data IS NOT NULL AS has_image, calib1_value IS NOT NULL AND calib2_value IS NOT NULL AS is_calibrated FROM challenges ORDER BY created_at DESC'
    );
    res.render('admin/challenges', { title: 'Manage challenges', challenges });
  } catch (err) {
    next(err);
  }
});

router.get('/challenges/new', (req, res) => {
  res.render('admin/challenge-form', {
    title: 'New challenge',
    challenge: null,
    error: null,
  });
});

router.post('/challenges', upload.single('image'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const higherIsBetter = req.body.higher_is_better === 'true';
    if (!name || !name.trim()) {
      return res.status(400).render('admin/challenge-form', {
        title: 'New challenge',
        challenge: null,
        error: 'Please give the challenge a name.',
      });
    }

    const calib = parseCalibration(req.body);

    const imageData = req.file ? req.file.buffer : null;
    const imageMime = req.file ? req.file.mimetype : null;

    const { rows } = await query(
      `INSERT INTO challenges
        (name, description, higher_is_better, image_data, image_mime,
         calib1_value, calib1_x, calib1_y, calib2_value, calib2_x, calib2_y)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        name.trim(),
        description || null,
        higherIsBetter,
        imageData,
        imageMime,
        calib.v1,
        calib.x1,
        calib.y1,
        calib.v2,
        calib.x2,
        calib.y2,
      ]
    );

    res.redirect(`/admin/challenges/${rows[0].id}/edit`);
  } catch (err) {
    next(err);
  }
});

router.get('/challenges/:id/edit', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM challenges WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.redirect('/admin/challenges');
    res.render('admin/challenge-form', {
      title: 'Edit challenge',
      challenge: rows[0],
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/challenges/:id', upload.single('image'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const higherIsBetter = req.body.higher_is_better === 'true';
    const calib = parseCalibration(req.body);

    if (!name || !name.trim()) {
      const { rows } = await query('SELECT * FROM challenges WHERE id = $1', [req.params.id]);
      return res.status(400).render('admin/challenge-form', {
        title: 'Edit challenge',
        challenge: rows[0] || null,
        error: 'Please give the challenge a name.',
      });
    }

    if (req.file) {
      await query(
        `UPDATE challenges SET
           name=$1, description=$2, higher_is_better=$3,
           image_data=$4, image_mime=$5,
           calib1_value=$6, calib1_x=$7, calib1_y=$8,
           calib2_value=$9, calib2_x=$10, calib2_y=$11,
           updated_at=now()
         WHERE id=$12`,
        [
          name.trim(),
          description || null,
          higherIsBetter,
          req.file.buffer,
          req.file.mimetype,
          calib.v1,
          calib.x1,
          calib.y1,
          calib.v2,
          calib.x2,
          calib.y2,
          req.params.id,
        ]
      );
    } else {
      await query(
        `UPDATE challenges SET
           name=$1, description=$2, higher_is_better=$3,
           calib1_value=$4, calib1_x=$5, calib1_y=$6,
           calib2_value=$7, calib2_x=$8, calib2_y=$9,
           updated_at=now()
         WHERE id=$10`,
        [
          name.trim(),
          description || null,
          higherIsBetter,
          calib.v1,
          calib.x1,
          calib.y1,
          calib.v2,
          calib.x2,
          calib.y2,
          req.params.id,
        ]
      );
    }

    res.redirect(`/admin/challenges/${req.params.id}/edit`);
  } catch (err) {
    next(err);
  }
});

router.post('/challenges/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM challenges WHERE id = $1', [req.params.id]);
    res.redirect('/admin/challenges');
  } catch (err) {
    next(err);
  }
});

// ---- All scores (moderation view) ----
router.get('/scores', async (req, res, next) => {
  try {
    const { rows: scores } = await query(
      `SELECT s.id, s.value, s.comment, s.created_at, s.updated_at, p.name AS pupil_name, c.name AS challenge_name
       FROM scores s
       JOIN pupils p ON p.id = s.pupil_id
       JOIN challenges c ON c.id = s.challenge_id
       ORDER BY s.created_at DESC
       LIMIT 200`
    );
    res.render('admin/scores', { title: 'All submitted scores', scores });
  } catch (err) {
    next(err);
  }
});

router.post('/scores/:id/delete', async (req, res, next) => {
  try {
    await query('DELETE FROM scores WHERE id = $1', [req.params.id]);
    res.redirect('/admin/scores');
  } catch (err) {
    next(err);
  }
});

function parseCalibration(body) {
  const toNum = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
  return {
    v1: toNum(body.calib1_value),
    x1: toNum(body.calib1_x),
    y1: toNum(body.calib1_y),
    v2: toNum(body.calib2_value),
    x2: toNum(body.calib2_x),
    y2: toNum(body.calib2_y),
  };
}

module.exports = router;
