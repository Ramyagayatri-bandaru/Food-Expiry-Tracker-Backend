import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cron from "node-cron";

// ✅ Import models & utils at the top
import Food from "./models/Food.js";
import { sendExpiryAlert } from "./utils/mailer.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

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

// -------------------- TEST ENDPOINT FOR SENDGRID --------------------
app.get("/test-email", async (req, res) => {
  try {
    await sendExpiryAlert(
      "srivenkatesh.yenumula@gmail.com", // ⚠️ Replace with your own verified email
      "Test User",
      ["Milk", "Eggs", "Bread"]
    );
    res.send("✅ Test email triggered");
  } catch (err) {
    console.error("❌ Test email failed:", err.response?.body || err.message);
    res.status(500).send("❌ Failed: " + (err.response?.body?.errors?.[0]?.message || err.message));
  }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
