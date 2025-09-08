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

  // -------------------- FUNCTION: Send today's expiry emails --------------------
  async function sendTodaysExpiryEmails() {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Fetch items expiring today
      const expiringItems = await Food.find({
        expiryDate: { $gte: startOfToday, $lte: endOfToday },
      }).populate("userId");

      if (expiringItems.length === 0) {
        console.log("No food items expiring today.");
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
        userItems[email].items.push(item.name);
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
      console.error("Error sending today's expiry emails:", error);
    }
  }

  // -------------------- RUN IMMEDIATELY ON SERVER START --------------------
  sendTodaysExpiryEmails();

  // -------------------- DAILY CRON JOB at 8 AM --------------------
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log(
        "Cron Job Running: Sending today's expiry emails (IST 8:00 AM)..."
      );
      await sendTodaysExpiryEmails();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );

// -------------------- REAL EXPIRY EMAIL TRIGGER ENDPOINT --------------------
app.get("/test-email", async (req, res) => {
  try {
    await sendTodaysExpiryEmails(); // Call the real function
    res.send("✅ Real expiry emails triggered successfully");
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
