const { UserRestaurant, UserOrganization } = require('../../models');

function checkSuperadmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Superadmin only.' });
}

async function checkEditorOrAdmin(req, res, next) {
  try {
    const { restaurantId } = req.body;

    // Ensure the user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    // Check if the user is an editor for the restaurant
    const userRest = await UserRestaurant.findOne({
      where: { userId: req.user.id, restaurantId, role: 'edit' },
    });

    // Check if the user is part of the organization that owns the restaurant
    const userOrg = await UserOrganization.findOne({
      where: { userId: req.user.id, organizationId: req.body.organizationId },
    });

    if (!userRest && !userOrg) {
      return res.status(403).json({
        error:
          'Access denied. Only editors or organization members can perform this action.',
      });
    }

    next();
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while checking permissions.' });
  }
}

async function checkAdmin(req, res, next) {
  try {
    const { organizationId } = req.body;

    // Ensure the user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    // Check if the user is part of the organization
    const userOrg = await UserOrganization.findOne({
      where: { userId: req.user.id, organizationId },
    });

    if (!userOrg) {
      return res.status(403).json({
        error:
          'Access denied. Only organization members can perform this action.',
      });
    }

    next();
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while checking admin privileges.' });
  }
}

module.exports = {
  checkSuperadmin,
  checkEditorOrAdmin,
  checkAdmin,
};
