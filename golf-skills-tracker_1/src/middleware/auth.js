function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect('/login/admin');
}

function requirePupil(req, res, next) {
  if (req.session && req.session.pupilId) {
    return next();
  }
  return res.redirect('/login/pupil');
}

module.exports = { requireAdmin, requirePupil };
