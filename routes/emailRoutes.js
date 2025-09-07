import express from 'express';
import { sendExpiryAlert } from '../utils/mailer.js';

const router = express.Router();

// POST /api/sendEmail
router.post('/', async (req, res) => {
  try {
    const { email, name, items } = req.body; 

    const itemNames = items.map(i => {
      const formattedDate = new Date(i.expiryDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      return `${i.name} [Expiring on : ${formattedDate}]`;
    });

    console.log(itemNames);



    if (!email || !items?.length) {
      return res.status(400).json({ error: 'Email and items are required.' });
    }

    await sendExpiryAlert(email, name || 'User', itemNames);
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
