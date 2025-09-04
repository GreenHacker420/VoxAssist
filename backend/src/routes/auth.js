const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Mock user data - replace with actual database
const users = [
  {
    id: 1,
    email: 'admin@voxassist.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin',
    name: 'Admin User'
  }
];

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and name are required' 
      });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      name,
      role,
      createdAt: new Date()
    };
    
    users.push(newUser);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        role: newUser.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    logger.info(`New user registered: ${email}`);
    
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
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }
    
    // Find user
    const user = users.find(u => u.email === email);
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
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    logger.info(`User logged in: ${email}`);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
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
  } catch (error) {
    logger.error(`Profile fetch error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const userIndex = users.findIndex(u => u.id === req.user.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Update user data
    if (name) users[userIndex].name = name;
    if (email) users[userIndex].email = email;
    users[userIndex].updatedAt = new Date();
    
    logger.info(`Profile updated for user: ${req.user.email}`);
    
    res.json({
      success: true,
      data: {
        id: users[userIndex].id,
        email: users[userIndex].email,
        name: users[userIndex].name,
        role: users[userIndex].role
      }
    });
  } catch (error) {
    logger.error(`Profile update error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password and new password are required' 
      });
    }
    
    const userIndex = users.findIndex(u => u.id === req.user.userId);
    if (userIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[userIndex].password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Current password is incorrect' 
      });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex].password = hashedNewPassword;
    users[userIndex].updatedAt = new Date();
    
    logger.info(`Password changed for user: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error(`Password change error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  logger.info(`User logged out: ${req.user.email}`);
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
