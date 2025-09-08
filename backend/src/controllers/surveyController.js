const prisma = require('../database/prisma');

async function submitSurvey(req, res) {
  const { callId } = req.params;
  const { rating, comment } = req.body;

  if (!rating) {
    return res.status(400).json({ error: 'Rating is required' });
  }

  try {
    const survey = await prisma.survey.create({
      data: {
        callId: parseInt(callId, 10),
        rating: parseInt(rating, 10),
        comment,
      },
    });
    res.status(201).json(survey);
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
}

module.exports = { submitSurvey };
