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
// ✅ Import models & utils at the top
import Food from "./models/food.model.js";
import { sendExpiryAlert } from "./utils/mailer.js";

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

  // -------------------- FUNCTION: Send tomorrow's expiry emails --------------------
  async function sendTomorrowsExpiryEmails() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startOfTomorrow = new Date(tomorrow);
      startOfTomorrow.setHours(0, 0, 0, 0);

      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      // Fetch items expiring tomorrow
      const expiringItems = await Food.find({
        expiryDate: { $gte: startOfTomorrow, $lte: endOfTomorrow },
      }).populate("userId");

      if (expiringItems.length === 0) {
        console.log("No food items expiring tomorrow.");
        return;
      }

      // Group items by user
      const userItems = {};
      expiringItems.forEach((item) => {
        if (!item.userId || !item.userId.email) return;

        const email = item.userId.email;
        if (!userItems[email]) {
          userItems[email] = { name: item.userId.name || "User", items: [] };
        }

        // Format item with expiry date (DD Month YYYY)
        const formattedItem = `${item.name} [Expiring on: ${new Date(item.expiryDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })}]`;

        userItems[email].items.push(formattedItem);
      });

      // Send one email per user and log items
      for (const email in userItems) {
        const { name, items } = userItems[email];
        console.log(
          `About to send email to ${email} for items: ${items.join(", ")}`
        );
        await sendExpiryAlert(email, name, items);
      }
    } catch (error) {
      console.error("Error sending tomorrow's expiry emails:", error);
    }
  }

  // -------------------- RUN IMMEDIATELY ON SERVER START --------------------
  sendTomorrowsExpiryEmails();

  // -------------------- DAILY CRON JOB at 8 AM --------------------
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log(
        "Cron Job Running: Sending tomorrow's expiry emails (IST 8:00 AM)..."
      );
      await sendTomorrowsExpiryEmails();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  ); 

// -------------------- ONE-TIME EXTRA CRON FOR TODAY ONLY --------------------
  cron.schedule(
    "5 8 9 9 *", // 8:05 AM on 9 Sep
    async () => {
      console.log("🔥 Force trigger for 9 Sep 8:05 AM IST");
      await sendTomorrowsExpiryEmails();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );

  // -------------------- REAL EXPIRY EMAIL TRIGGER ENDPOINT --------------------
  app.get("/test-email", async (req, res) => {
    try {
      await sendTomorrowsExpiryEmails(); // Call the real function
      res.send("✅ Tomorrow's expiry emails triggered successfully");
    } catch (err) {
      console.error("❌ Failed to trigger expiry emails:", err);
      res.status(500).send("❌ Failed: " + (err.message || "Unknown error"));
    }
  });

  // -------------------- START SERVER --------------------
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
});
