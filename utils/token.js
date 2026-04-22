const jwt = require('jsonwebtoken');

exports.generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Shorter lifespan for access token
  );
};

exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.SESSION_SECRET, // Using session secret for refresh tokens
    { expiresIn: '7d' } // Longer lifespan for refresh token
  );
};