const validateLocation = (req, res, next) => {
  const { userLat, userLng } = req.query;

  // Check if coordinates are provided
  if (!userLat || !userLng) {
    return res.status(400).json({
      error: 'Location coordinates are required',
    });
  }

  // Convert to numbers
  const latitude = parseFloat(userLat);
  const longitude = parseFloat(userLng);

  // Validate coordinate ranges
  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({
      error: 'Invalid latitude value',
    });
  }

  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({
      error: 'Invalid longitude value',
    });
  }

  // Validate distance filter if provided
  const { distanceFilter } = req.query;
  if (
    distanceFilter &&
    !['ALL', 'NEAR_100', 'NEAR_60', 'NEAR_30'].includes(distanceFilter)
  ) {
    return res.status(400).json({
      error: 'Invalid distance filter value',
    });
  }

  next();
};

module.exports = {
  validateLocation,
};
