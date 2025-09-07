import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validateFood } from '../middleware/validationMiddleware.js';
import {
  getAllItems,
  addItem,
  updateItem,
  deleteItem,
} from '../controllers/food.controller.js';

const router = Router();

router.get('/', authenticateToken, getAllItems);
router.post('/', authenticateToken, validateFood, addItem);
router.put('/:id', authenticateToken, validateFood, updateItem);
router.delete('/:id', authenticateToken, deleteItem);

export default router;
