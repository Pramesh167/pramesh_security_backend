const router = require('express').Router();
const productController = require('../controllers/productController');
const { authGuard, adminGuard } = require('../middleware/authGuard');
const { body, validationResult } = require("express-validator");
const { query } = require("express-validator");

// Create a new product
// router.post('/create', productController.createProduct);

router.post(
    "/create",
    [
      // Validate and sanitize input fields
      body("productName")
        .notEmpty()
        .withMessage("Product name is required")
        .trim()
        .escape(),
      body("productCategory")
        .notEmpty()
        .withMessage("Product category is required")
        .trim()
        .escape(),
      body("productDescription")
        .notEmpty()
        .withMessage("Product description is required")
        .trim()
        .escape(),
      body("productPrice")
        .isFloat({ min: 0 })
        .withMessage("Price must be a positive number"),
      body("productQuantity")
        .isInt({ min: 0 })
        .withMessage("Quantity must be a positive integer"),
    ],
    (req, res, next) => {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }
  
      // If no errors, proceed to the controller
      next();
    },
    productController.createProduct
  );
  

// Get all products (protected route with authGuard middleware)
router.get('/get_all_products', authGuard, productController.getAllProducts);

// Get products by category
router.get('/get_products_by_category', productController.getProductsByCategory);

// Delete a product (protected route with adminGuard middleware)
router.delete('/delete_product/:id',  productController.deleteProduct);

// Update a product
router.put('/update_product/:id', productController.updateProduct);

// Get a single product by ID (protected route with authGuard middleware)
router.get('/get_single_product/:id', authGuard, productController.getSingleProduct);

// Pagination example route
router.get('/pagination', productController.paginatonProducts);

// search products
// router.get('/search', productController.searchProductsByName);

router.get(
    "/search",
    [
      // Validate and sanitize the search query
      query("search")
        .notEmpty()
        .withMessage("Search query is required")
        .trim()
        .escape()
        .isLength({ max: 100 })
        .withMessage("Search query must be less than 100 characters"),
    ],
    (req, res, next) => {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }
  
      // If no errors, proceed to the controller
      next();
    },
    productController.searchProductsByName
  );

module.exports = router;