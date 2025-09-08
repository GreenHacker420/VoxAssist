const express = require('express');
const GDPRComplianceMiddleware = require('../middleware/gdprCompliance');

const router = express.Router();

// Privacy information endpoint
router.get('/privacy-info', GDPRComplianceMiddleware.getPrivacyInfo);

// Data export (Right to access)
router.get('/export-data', GDPRComplianceMiddleware.exportUserData);

// Data deletion (Right to be forgotten)
router.post('/delete-data', GDPRComplianceMiddleware.deleteUserData);

// Consent recording
router.post('/record-consent', GDPRComplianceMiddleware.recordConsent, (req, res) => {
    res.json({ success: true, message: 'Consent recorded successfully' });
});

module.exports = router;
