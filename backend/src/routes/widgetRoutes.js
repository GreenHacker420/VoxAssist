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

// Standard REST API routes
router.get('/', widgetController.getWidgetsByOrganization); // GET /api/widgets
router.post('/', widgetController.createWidget); // POST /api/widgets
router.get('/:id', widgetController.getWidgetConfig); // GET /api/widgets/:id
router.put('/:id', widgetController.updateWidget); // PUT /api/widgets/:id
router.delete('/:id', widgetController.deleteWidget); // DELETE /api/widgets/:id

// Legacy CRUD operations for widgets (backward compatibility)
router.get('/configs', widgetController.getWidgetsByOrganization);
router.post('/create', widgetController.createWidget);
router.put('/update/:widgetId', widgetController.updateWidget);
router.delete('/update/:widgetId', widgetController.deleteWidget);

// Get widget configuration
router.get('/:id/config', widgetController.getWidgetConfig);
router.get('/configs/:id', widgetController.getWidgetConfig);

// Analytics
router.get('/analytics/:widgetId', widgetController.getWidgetAnalytics);
router.get('/:id/analytics', widgetController.getWidgetAnalytics);

// Widget status management
router.patch('/:id/status', widgetController.toggleWidgetStatus);

module.exports = router;
