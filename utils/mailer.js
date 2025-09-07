import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

// Set API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send expiry alert email
 * @param {string} to - Recipient email address
 * @param {string} to_name - Recipient's name
 * @param {string[]} message_lines - Array of expiring items
 */
export const sendExpiryAlert = async (to, to_name, message_lines) => {
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background-color: #f8f9fa; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto;">
      <h2 style="color: #28a745; text-align: center;">🍽️ Food Expiry Alert !</h2>

      <p style="font-size: 16px;">Hi <strong>${to_name}</strong>,</p>

      <p style="font-size: 16px;">
        Just a friendly reminder from <strong>Food Expiry Tracker</strong> 🕒 — 
        the following food items in your kitchen are <strong style="color: #dc3545;">expiring today</strong>:
      </p>

      <ul style="background-color: #fff; padding: 15px 20px; border-left: 4px solid #28a745; border-radius: 6px; list-style-type: '  →'; font-size: 16px;">
        ${message_lines.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
      </ul>

      <p style="font-size: 16px;">
        Please take the time to <strong>consume or discard</strong> them to ensure freshness and avoid waste.
      </p>

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;" />

      <p style="font-size: 14px; color: #555;">
        🌱 Let's build a zero-waste kitchen, one alert at a time!
      </p>

      <p style="font-size: 14px; color: #555;">
        — Team <strong style="color: #28a745;">Food Expiry Tracker</strong>
      </p>
    </div>
  `;

  try {
    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: 'Food Expiry Tracker'
      },
      subject: 'Food Expiry Reminder - Items Expiring Today!',
      html: htmlContent,
    };


    const response = await sgMail.send(msg);
    console.log(`Email sent to ${to} | Status: ${response[0].statusCode}`);
  } catch (error) {
    console.error('Failed to send email:', error.response?.body || error.message);
  }
};
