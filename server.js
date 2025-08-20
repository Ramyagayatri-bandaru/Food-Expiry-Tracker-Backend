// server.js
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import cron from 'node-cron'; // ⬅ Added cron import
import connectDB from './utils/db.js';
import authRoutes from './routes/auth.routes.js';
import foodRoutes from './routes/food.routes.js';
import emailRoutes from './routes/emailRoutes.js';


// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api', emailRoutes);

// MongoDB connection and server start
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  console.log("MongoDB connected");

  // CRON JOB — Runs every day at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log("Cron Job Running: Checking for expiry alerts...");

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const Food = (await import('./models/Food.js')).default;
      const { sendExpiryAlert } = await import('./utils/mailer.js');

      // Get all items expiring today or tomorrow
      const expiringItems = await Food.find({
        expiryDate: { $in: [today, tomorrow] }
      }).populate('userId');

      const userItems = {};
      expiringItems.forEach(item => {
        const userEmail = item.userId.email;
        if (!userItems[userEmail]) {
          userItems[userEmail] = { name: item.userId.name, items: [] };
        }
        userItems[userEmail].items.push(item.name);
      });

      // Send email per user
      for (const email in userItems) {
        const { name, items } = userItems[email];
        await sendExpiryAlert(email, name, items);
        console.log(`Email sent to ${email} for items: ${items.join(', ')}`);
      }

    } catch (error) {
      console.error("Error in expiry email cron:", error);
    }
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
});
