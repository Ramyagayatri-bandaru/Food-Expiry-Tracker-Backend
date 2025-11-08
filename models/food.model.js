const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  manufactureDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("FoodItem", foodItemSchema);

