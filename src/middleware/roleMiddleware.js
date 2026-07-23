'use strict';

/**
 * RestrictTo Middleware Factory
 * Restricts access to specified roles (e.g. 'admin', 'provider', 'customer')
 * @param {...string} allowedRoles - Roles allowed to access the route
 */
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
        data: {},
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`,
        data: {},
      });
    }

    next();
  };
};

module.exports = {
  restrictTo,
};
