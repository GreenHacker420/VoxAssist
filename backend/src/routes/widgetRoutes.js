const express = require('express');
const multer = require('multer');
const widgetController = require('../controllers/widgetController');

const router = express.Router();

// Configure multer for audio file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    }
});

// Widget session management
router.post('/session', widgetController.initializeSession);

// Message handling
router.post('/message', widgetController.handleTextMessage);
router.post('/voice', upload.single('audio'), widgetController.handleVoiceMessage);

// Get widget configuration
router.get('/:id/config', widgetController.getWidgetConfig);
router.get('/configs/:id', widgetController.getWidgetConfig);

// Get widget analytics
router.get('/:id/analytics', widgetController.getWidgetAnalytics);
router.put('/update/:widgetId', widgetController.updateWidget);

// Analytics
router.get('/analytics/:widgetId', widgetController.getWidgetAnalytics);

module.exports = router;
