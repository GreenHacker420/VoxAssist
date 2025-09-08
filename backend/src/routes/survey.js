const express = require('express');
const router = express.Router();
const { submitSurvey } = require('../controllers/surveyController');

router.post('/:callId', submitSurvey);

module.exports = router;
