const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const db = require('../database/connection');

// Register new user
router.post('/register', validate('register'), asyncHandler(async (req, res) => {
  const { email, password, name, role = 'user' } = req.body;
  
  // Sanitize inputs
  const cleanEmail = sanitizeInput.cleanEmail(email);
  const cleanName = sanitizeInput.cleanString(name);
    
  // Check if user already exists
  const existingUserResult = await db.query(
    'SELECT id FROM users WHERE email = ?',
    [cleanEmail]
  );
  
  if (existingUserResult.rows.length > 0) {
    return res.status(409).json({ 
      success: false, 
      error: 'User already exists' 
    });
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create new user
  const userResult = await db.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    [cleanEmail, hashedPassword, cleanName, role]
  );
  
  const newUserId = userResult.insertId || userResult.rows?.insertId;
  
  // Get the created user
  const createdUserResult = await db.query(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [newUserId]
  );
  
  const newUser = createdUserResult.rows[0];
  
  // Add user to default organization
  await db.query(
    'INSERT INTO user_organizations (user_id, organization_id, role) VALUES (?, ?, ?)',
    [newUser.id, 1, role] // Default to demo organization
  );
  
  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: newUser.id, 
      email: newUser.email, 
      role: newUser.role,
      organizationId: 1
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  logger.info(`New user registered: ${cleanEmail}`);
  
  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    }
  });
}));

// Login user
router.post('/login', validate('login'), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Sanitize email
  const cleanEmail = sanitizeInput.cleanEmail(email);
    
  // Find user with organization info
  const userResult = await db.query(`
    SELECT u.id, u.email, u.password_hash, u.name, u.role,
           uo.organization_id, uo.role as org_role
    FROM users u
    LEFT JOIN user_organizations uo ON u.id = uo.user_id
    WHERE u.email = ?
  `, [cleanEmail]);
  
  if (userResult.rows.length === 0) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid credentials' 
    });
  }
  
  const user = userResult.rows[0];
  
  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid credentials' 
    });
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: user.organization_id || 1
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  logger.info(`User logged in: ${cleanEmail}`);
  
  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organization_id
      }
    }
  });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const userResult = await db.query(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [req.user.userId]
  );
  
  if (userResult.rows.length === 0) {
    return res.status(404).json({ 
      success: false, 
      error: 'User not found' 
    });
  }
  
  const user = userResult.rows[0];
  
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at
    }
  });
}));

// Update user profile
router.put('/profile', authenticateToken, validate('updateProfile'), asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  
  // Sanitize inputs
  const cleanEmail = email ? sanitizeInput.cleanEmail(email) : undefined;
  const cleanName = name ? sanitizeInput.cleanString(name) : undefined;
  
  // Check if user exists
  const userResult = await db.query(
    'SELECT id FROM users WHERE id = ?',
    [req.user.userId]
  );
  
  if (userResult.rows.length === 0) {
    return res.status(404).json({ 
      success: false, 
      error: 'User not found' 
    });
  }
    
  // Update user data
  const updateFields = [];
  const updateValues = [];
  
  if (cleanName) {
    updateFields.push('name = ?');
    updateValues.push(cleanName);
  }
  if (cleanEmail) {
    updateFields.push('email = ?');
    updateValues.push(cleanEmail);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No fields to update'
    });
  }
  
  updateValues.push(req.user.userId);
  
    const setClause = updateFields.length > 0
      ? `${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP`
      : 'updated_at = CURRENT_TIMESTAMP';
    await db.query(
      `UPDATE users SET ${setClause} WHERE id = ?`,
      updateValues
    );
  
  // Get updated user data
  const updatedUserResult = await db.query(
    'SELECT id, email, name, role FROM users WHERE id = ?',
    [req.user.userId]
  );
  
  const updatedUser = updatedUserResult.rows[0];
  
  logger.info(`Profile updated for user: ${req.user.email}`);
  
  res.json({
    success: true,
    data: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role
    }
  });
}));

// Change password
router.post('/change-password', authenticateToken, validate('changePassword'), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
    
  // Get user's current password hash
  const userResult = await db.query(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.user.userId]
  );
  
  if (userResult.rows.length === 0) {
    return res.status(404).json({ 
      success: false, 
      error: 'User not found' 
    });
  }
  
  const user = userResult.rows[0];
  
  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ 
      success: false, 
      error: 'Current password is incorrect' 
    });
  }
  
  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
  // Update password in database
  await db.query(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hashedNewPassword, req.user.userId]
  );
  
  logger.info(`Password changed for user: ${req.user.email}`);
  
  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  logger.info(`User logged out: ${req.user.email}`);
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
