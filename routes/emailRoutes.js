import express from 'express';
import { sendExpiryAlert } from '../utils/mailer.js';

const router = express.Router();

// POST /api/sendEmail
router.post('/', async (req, res) => {
  try {
    const { email, name, items } = req.body; // expecting { email, name, items[] }

    if (!email || !items?.length) {
      return res.status(400).json({ error: 'Email and items are required.' });
    }

    await sendExpiryAlert(email, name || 'User', items);
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
