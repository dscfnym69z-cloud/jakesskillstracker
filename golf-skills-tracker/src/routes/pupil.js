const express = require('express');
const { query } = require('../db');
const { requirePupil } = require('../middleware/auth');

const router = express.Router();

router.use(requirePupil);

router.get('/', async (req, res, next) => {
    try {
          const { rows: challenges } = await query(
                  'SELECT id, name, description, higher_is_better FROM challenges ORDER BY created_at DESC'
                );
          res.render('pupil/dashboard', {
                  title: 'Skills challenges',
                  challenges,
                  pupilName: req.session.pupilName,
          });
    } catch (err) {
          next(err);
    }
});

router.post('/challenges/:id/scores', async (req, res, next) => {
    try {
          const value = Number(req.body.value);
          if (Number.isNaN(value)) {
                  return res.redirect('/pupil');
          }
          const comment = (req.body.comment || '').trim() || null;
          await query('INSERT INTO scores (pupil_id, challenge_id, value, comment) VALUES ($1,$2,$3,$4)', [
                  req.session.pupilId,
                  req.params.id,
                  value,
                  comment,
                ]);
          res.redirect(`/pupil/history/${req.params.id}`);
    } catch (err) {
          next(err);
    }
});

router.get('/history/:challengeId', async (req, res, next) => {
    try {
          const { rows: challengeRows } = await query('SELECT * FROM challenges WHERE id = $1', [
                  req.params.challengeId,
                ]);
          if (!challengeRows.length) return res.redirect('/pupil');
          const challenge = challengeRows[0];

      const { rows: scores } = await query(
              `SELECT id, value, comment, created_at, updated_at FROM scores
                     WHERE pupil_id = $1 AND challenge_id = $2
                            ORDER BY created_at DESC`,
              [req.session.pupilId, req.params.challengeId]
            );

      res.render('pupil/history', {
              title: `${challenge.name} - your history`,
              challenge,
              scores,
      });
    } catch (err) {
          next(err);
    }
});

router.post('/scores/:scoreId/edit', async (req, res, next) => {
    try {
          const value = Number(req.body.value);
          const comment = (req.body.comment || '').trim() || null;
          const { rows } = await query('SELECT challenge_id FROM scores WHERE id = $1 AND pupil_id = $2', [
                  req.params.scoreId,
                  req.session.pupilId,
                ]);
          if (!rows.length) return res.redirect('/pupil');
          if (!Number.isNaN(value)) {
                  await query(
                            'UPDATE scores SET value = $1, comment = $2, updated_at = now() WHERE id = $3 AND pupil_id = $4',
                            [value, comment, req.params.scoreId, req.session.pupilId]
                          );
          }
          res.redirect(`/pupil/history/${rows[0].challenge_id}`);
    } catch (err) {
          next(err);
    }
});

router.post('/scores/:scoreId/delete', async (req, res, next) => {
    try {
          const { rows } = await query('SELECT challenge_id FROM scores WHERE id = $1 AND pupil_id = $2', [
                  req.params.scoreId,
                  req.session.pupilId,
                ]);
          if (!rows.length) return res.redirect('/pupil');
          await query('DELETE FROM scores WHERE id = $1 AND pupil_id = $2', [
                  req.params.scoreId,
                  req.session.pupilId,
                ]);
          res.redirect(`/pupil/history/${rows[0].challenge_id}`);
    } catch (err) {
          next(err);
    }
});

// ---- Key page: reference graphs with this pupil's best score plotted ----
router.get('/key', async (req, res, next) => {
    try {
          const { rows: challenges } = await query(
                  `SELECT c.id, c.name, c.description, c.higher_is_better,
                                c.image_data IS NOT NULL AS has_image,
                                              c.calib1_value, c.calib1_x, c.calib1_y,
                                                            c.calib2_value, c.calib2_x, c.calib2_y,
                                                                          (SELECT MAX(s.value) FROM scores s WHERE s.pupil_id = $1 AND s.challenge_id = c.id AND c.higher_is_better) AS best_high,
                                                                                        (SELECT MIN(s.value) FROM scores s WHERE s.pupil_id = $1 AND s.challenge_id = c.id AND NOT c.higher_is_better) AS best_low
                                                                                               FROM challenges c
                                                                                                      ORDER BY c.created_at DESC`,
                  [req.session.pupilId]
                );

      const items = challenges.map((c) => {
              const best = c.higher_is_better ? c.best_high : c.best_low;
              const calibrated =
                        c.calib1_value !== null &&
                        c.calib2_value !== null &&
                        c.calib1_x !== null &&
                        c.calib1_y !== null &&
                        c.calib2_x !== null &&
                        c.calib2_y !== null;

                                         let marker = null;
              if (best !== null && best !== undefined && calibrated) {
                        marker = computeMarkerPosition(c, Number(best));
              }

                                         return {
                                                   id: c.id,
                                                   name: c.name,
                                                   description: c.description,
                                                   higher_is_better: c.higher_is_better,
                                                   has_image: c.has_image,
                                                   best,
                                                   calibrated,
                                                   marker,
                                         };
      });

      res.render('pupil/key', {
              title: 'Key: how you compare',
              items,
      });
    } catch (err) {
          next(err);
    }
});

function computeMarkerPosition(challenge, value) {
    const { calib1_value: v1, calib1_x: x1, calib1_y: y1, calib2_value: v2, calib2_x: x2, calib2_y: y2 } =
          challenge;
    if (v2 === v1) {
          return { x: clampPct(x1), y: clampPct(y1), outOfRange: false };
    }
    const t = (value - v1) / (v2 - v1);
    const x = x1 + t * (x2 - x1);
    const y = y1 + t * (y2 - y1);
    const outOfRange = t < -0.02 || t > 1.02;
    return { x: clampPct(x), y: clampPct(y), outOfRange };
}

function clampPct(n) {
    return Math.min(100, Math.max(0, n));
}

module.exports = router;
