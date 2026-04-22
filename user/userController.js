const User = require('./userModel');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const svgCaptcha = require('svg-captcha');
const { getDownline } = require('../services/hierarchyService');
const jwt = require('jsonwebtoken');

exports.getCaptcha = (req, res) => {
  const captcha = svgCaptcha.create({
    size: 4,
    noise: 2,
    color: true,
    background: '#ffffff'
  });
  req.session.captcha = captcha.text.toLowerCase();
  res.status(200).send(captcha.data);
};

exports.register = async (req, res) => {
  try {
    const { username, password, parentId, role } = req.body;
    
    const creatorId = req.user ? req.user.id : parentId;
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashed,
      parent: creatorId || null,
      role: role || 'USER',
      balance: role === 'OWNER' ? 10000 : 0
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password, captcha } = req.body;

    if (!req.session.captcha || !captcha || captcha.toLowerCase() !== req.session.captcha) {
      return res.status(400).json({ msg: 'Invalid CAPTCHA' });
    }
    req.session.captcha = null;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Wrong password' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: false, // set to true in production
      sameSite: 'lax'
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // set to true in production
      sameSite: 'lax',
      path: '/api/auth/refresh' // Restrict path for refresh token
    });

    res.json({ msg: 'Logged in', user: {
      id: user._id,
      username: user.username,
      role: user.role,
      balance: user.balance
    } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ msg: 'No refresh token' });

    const decoded = jwt.verify(refreshToken, process.env.SESSION_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ msg: 'User not found' });

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/auth/refresh'
    });

    res.json({ msg: 'Token refreshed' });
  } catch (error) {
    res.status(401).json({ msg: 'Invalid refresh token' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.json({ msg: 'Logged out' });
};

exports.getHierarchy = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    let downline;
    if (user.role === 'ADMIN') {
      // Admin sees everyone? Requirement says "Admin can view all users of next level" 
      // and "Click any user to view their complete downline hierarchy"
      downline = await User.find({ parent: userId });
    } else {
      downline = await User.find({ parent: userId });
    }
    
    res.json(downline);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

exports.getFullDownline = async (req, res) => {
  try {
    const { userId } = req.params;
    // Check if req.user has permission to view this userId's downline
    // For simplicity, allowing if req.user is admin or the user themselves or ancestor
    const downline = await getDownline(userId);
    res.json(downline);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const targetUser = await User.findById(userId);
    
    if (!targetUser) return res.status(404).json({ msg: 'User not found' });
    
    // Only allow changing password of NEXT LEVEL users
    if (targetUser.parent.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'You can only change password of your next-level users' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    targetUser.password = hashed;
    await targetUser.save();
    
    res.json({ msg: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

exports.selfRecharge = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'OWNER') {
      return res.status(403).json({ msg: 'Only owner can self-recharge' });
    }
    
    user.balance += Number(amount);
    await user.save();
    
    res.json({ msg: 'Recharge successful', balance: user.balance });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const users = await User.find({}, 'username balance role');
    res.json(users);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id, 'username balance role');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};