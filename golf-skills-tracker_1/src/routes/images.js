const express = require('express');
const { query } = require('../db');

const router = express.Router();

// Public (but unguessable-ish only by id) route to serve a challenge's key
// graph image. Both admin and pupils need to see this, and pupils have no
// password, so we don't gate it behind login - it's just a graph image.
router.get('/challenges/:id/image', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT image_data, image_mime FROM challenges WHERE id = $1', [
      req.params.id,
    ]);
    if (!rows.length || !rows[0].image_data) return res.status(404).end();
    res.set('Content-Type', rows[0].image_mime || 'image/png');
    res.set('Cache-Control', 'private, max-age=300');
    res.send(rows[0].image_data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
