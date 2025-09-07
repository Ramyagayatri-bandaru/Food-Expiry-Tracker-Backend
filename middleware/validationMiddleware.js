import { body, validationResult } from 'express-validator';

export const validateFood = [
  body('name')
    .notEmpty()
    .withMessage('Food name is required')
    .isLength({ min: 2 })
    .withMessage('Food name should be at least 2 characters'),

  body('expiryDate')
    .notEmpty()
    .withMessage('Expiry date is required')
    .isISO8601()
    .toDate()
    .withMessage('Expiry date must be a valid date'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
