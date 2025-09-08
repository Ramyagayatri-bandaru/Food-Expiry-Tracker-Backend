// server.js
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import cron from 'node-cron';
import connectDB from './utils/db.js';
import authRoutes from './routes/auth.routes.js';
import foodRoutes from './routes/food.routes.js';
import emailRoutes from './routes/emailRoutes.js';

// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/sendEmail', emailRoutes);

const PORT = process.env.PORT || 5000;

// -------------------- Connect to MongoDB --------------------
connectDB().then(async () => {
  console.log("MongoDB connected");

// -------------------- FUNCTION: Send today's expiry emails --------------------
async function sendTodaysExpiryEmails() {
  try {
    // Get today's date as YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0]; 

    const Food = (await import('./models/Food.js')).default;
    const { sendExpiryAlert } = await import('./utils/mailer.js');

    // Fetch items expiring today (ignore time zone issues)
    const expiringItems = await Food.find({
      expiryDate: { $regex: `^${today}` }
    }).populate('userId');

    if (expiringItems.length === 0) {
      console.log("No food items expiring today.");
      return;
    }

    // Group items by user
    const userItems = {};
    expiringItems.forEach(item => {
      if (!item.userId || !item.userId.email) return;

      const email = item.userId.email;
      if (!userItems[email]) {
        userItems[email] = { name: item.userId.name || 'User', items: [] };
      }
      userItems[email].items.push(item.name);
    });

    // Send one email per user
    for (const email in userItems) {
      const { name, items } = userItems[email];
      console.log(`About to send email to ${email} for items: ${items.join(', ')}`);
      await sendExpiryAlert(email, name, items);
    }

  } catch (error) {
    console.error("Error sending today's expiry emails:", error);
  }
}

// -------------------- RUN IMMEDIATELY ON SERVER START --------------------
sendTodaysExpiryEmails();

// -------------------- DAILY CRON JOB at 8 AM IST --------------------

cron.schedule('0 8 * * *', async () => {
  console.log("Cron Job Running: Sending today's expiry emails (IST 8:00 AM)...");
  await sendTodaysExpiryEmails();
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// -------------------- MANUAL TRIGGER ROUTE --------------------
app.get('/api/run-daily-expiry-check', async (req, res) => {
  try {
    await sendTodaysExpiryEmails();
    res.json({ message: "Expiry check executed manually" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  // -------------------- START SERVER --------------------
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
});
