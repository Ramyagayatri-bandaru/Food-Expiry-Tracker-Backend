import FoodItem from '../models/food.model.js';

/**
 * @desc Get all food items for the logged-in user
 */
export const getAllItems = async (req, res) => {
  try {
    const items = await FoodItem.find({ userId: req.user.id });
    res.json(items);
  } catch (error) {
    console.error('Error getting items:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc Add a new food item
 */
export const addItem = async (req, res) => {
  try {
    const { name, expiryDate, quantity } = req.body;

    const newItem = new FoodItem({
      name,
      quantity,
      expiryDate,
      userId: req.user.id
    });

    await newItem.save();

    res.status(201).json({ message: 'Item added', item: newItem });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc Update a food item by ID
 */
export const updateItem = async (req, res) => {
  try {
    const { name, expiryDate, quantity } = req.body;

    const updatedItem = await FoodItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id }, 
      { name, expiryDate, quantity },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Item updated', item: updatedItem });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc Delete a food item by ID
 */
export const deleteItem = async (req, res) => {
  try {
    const deletedItem = await FoodItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deletedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
