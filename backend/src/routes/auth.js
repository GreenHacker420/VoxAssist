const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');

// Register new user
router.post('/register', validate('register'), asyncHandler(async (req, res) => {
  const { email, password, name, role = 'user' } = req.body;
  
  // Sanitize inputs
  const cleanEmail = sanitizeInput.cleanEmail(email);
  const cleanName = sanitizeInput.cleanString(name);
    
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });
  
  if (existingUser) {
    return res.status(409).json({ 
      success: false, 
      error: 'User already exists' 
    });
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create new user with organization relationship
  const newUser = await prisma.user.create({
    data: {
      email: cleanEmail,
      password: hashedPassword,
      name: cleanName,
      role: role,
      userOrganizations: {
        create: {
          organizationId: 1, // Default to demo organization
          role: role
        }
      }
    },
    include: {
      userOrganizations: true
    }
  });
  
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
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    include: {
      userOrganizations: true
    }
  });
  
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid credentials' 
    });
  }
  
  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
  
  // Generate JWT token
  const organizationId = user.userOrganizations[0]?.organizationId || 1;
  const token = jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: organizationId
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
        organizationId: organizationId
      }
    }
  });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  });
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      error: 'User not found' 
    });
  }
  
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
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
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId }
  });
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      error: 'User not found' 
    });
  }
    
  
  
  // Update user data
  const updateData = {};
  if (cleanName) updateData.name = cleanName;
  if (cleanEmail) updateData.email = cleanEmail;
  
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No fields to update'
    });
  }
  
  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });
  
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
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { passwordHash: true }
  });
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      error: 'User not found' 
    });
  }
  
  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ 
      success: false, 
      error: 'Current password is incorrect' 
    });
  }
  
  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
  // Update password in database
  await prisma.user.update({
    where: { id: req.user.userId },
    data: { passwordHash: hashedNewPassword }
  });
  
  logger.info(`Password changed for user: ${req.user.email}`);
  
  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Forgot password - generate reset token
router.post('/forgot-password', validate('forgotPassword'), asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  // Sanitize email
  const cleanEmail = sanitizeInput.cleanEmail(email);
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });
  
  if (!user) {
    // Don't reveal if user exists or not for security
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }
  
  // Generate reset token (valid for 1 hour)
  const resetToken = jwt.sign(
    { userId: user.id, email: user.email, type: 'password-reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  // Store reset token in database (you might want to add a passwordResetToken field)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      // Note: You'll need to add passwordResetToken and passwordResetExpires fields to your schema
      // For now, we'll just log the token
    }
  });
  
  logger.info(`Password reset requested for user: ${cleanEmail}`);
  logger.info(`Reset token (for development): ${resetToken}`);
  
  // In production, you would send this via email
  // For now, return it in the response (ONLY for development)
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
    // Remove this in production:
    resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
  });
}));

// Reset password with token
router.post('/reset-password', validate('resetPassword'), asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword }
    });
    
    logger.info(`Password reset completed for user: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: 'Reset token has expired'
      });
    }
    
    return res.status(400).json({
      success: false,
      error: 'Invalid reset token'
    });
  }
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
