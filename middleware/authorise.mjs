export default function authorise(roles) {
  return async function (req, res, next) {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.redirect(302, '/login');
    }
    next();
  }
}