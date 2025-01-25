const path = require("path");
const productModel = require("../models/productModel");
const fs = require("fs");

const createProduct = async (req, res) => {
  // Destructuring the body
  const {
    productName,
    productCategory,
    productDescription,
    productPrice,
    productQuantity,
  } = req.body;

  // Sanitize input to handle duplicate parameters
  const sanitizedProductName = Array.isArray(productName) ? productName[0] : productName;
  const sanitizedProductCategory = Array.isArray(productCategory) ? productCategory[0] : productCategory;
  const sanitizedProductDescription = Array.isArray(productDescription) ? productDescription[0] : productDescription;
  const sanitizedProductPrice = Array.isArray(productPrice) ? parseFloat(productPrice[0]) : parseFloat(productPrice);
  const sanitizedProductQuantity = Array.isArray(productQuantity) ? parseInt(productQuantity[0]) : parseInt(productQuantity);

  // Validate the data
  if (
    !sanitizedProductName || 
    !sanitizedProductCategory || 
    !sanitizedProductDescription || 
    isNaN(sanitizedProductPrice) || 
    isNaN(sanitizedProductQuantity)
  ) {
    return res.status(400).json({
      success: false,
      message: "Please enter all fields!",
    });
  }

  // Validate that price and quantity are not negative
  if (sanitizedProductPrice < 0 || sanitizedProductQuantity < 0) {
    return res.status(400).json({
      success: false,
      message: "Price and quantity cannot be negative!",
    });
  }

  var imageName = null;

  try {
    if (req.files && req.files.productImage) {
      const { productImage } = req.files;
      imageName = `${Date.now()}_${productImage.name}`;
      const imagePath = path.join(__dirname, `../public/products/${imageName}`);
      await productImage.mv(imagePath);
    }

    const newProduct = new productModel({
      productName: productName,
      productPrice: productPrice,
      productCategory: productCategory,
      productDescription: productDescription,
      productImage: imageName,
      productQuantity: productQuantity,

      // Save the path of the image
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product Created Successfully!",
      product: newProduct,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error!",
    });
  }
};

//delete product
const deleteProduct = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error,
    });
  }
};

// get single products

const getSingleProduct = async (req, res) => {
  //get product id from url
  const productId = req.params.id;

  try {
    const product = await productModel.findById(productId);

    if (!product) {
      res.status(400).json({
        success: false,
        message: "No product found",
      });
    }
    res.status(200).json({
      success: true,
      message: "product fetched",
      product: product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      messgae: "internal server error",
      error: error,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const allproducts = await productModel.find({});
    res.status(201).json({
      success: true,
      message: "Products Fetched Successfully!",
      products: allproducts,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error!",
      error: error,
    });
  }
};

// update product
const updateProduct = async (req, res) => {
  try {
    // if there is image
    if (req.files && req.files.productImage) {
      //destructing
      const { productImage } = req.files;

      //upload image to directory(/public/products folder)
      const imageName = `${Date.now()}-${productImage.name}`;

      //2. make an upload path (/path/upload- directory)
      const imageUploadPath = path.join(
        __dirname,
        `../public/products/${imageName}`
      );

      //move the folder
      await productImage.mv(imageUploadPath);

      //req.params(id), rq.body(updated data +pn,pp,pc,pd), req.files(image)
      //add new field to the req.body(productImage->imageName)
      req.body.productImage = imageName; //image uploaded (generated name)

      // if image is uploaded, and req.body is assigned
      if (req.body.productImage) {
        //find the product
        const existingProduct = await productModel.findById(req.params.id);

        //Searching in the directory folder
        const oldImagePath = path.join(
          __dirname,
          `../public/products/${existingProduct.productImage}`
        );

        // delete from file system
        fs.unlinkSync(oldImagePath);
      }
    }
    //update the data
    const updateProduct = await productModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updateProduct,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error,
    });
  }
};

const paginatonProducts = async (req, res) => {
  // results  page number
  const pageNo = req.query.page || 1;
  const limit = req.query.limit || 10;

  // Per page 2 products

  try {
    // Find all products,skip the products, limit the products
    const products = await productModel
      .find({})
      .skip((pageNo - 1) * limit)
      .limit(limit);

    // if page 6 is requested, result 0
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found",
      });
    }

    //response
    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      products: products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error,
    });
  }
};

//get products by category

const getProductsByCategory = async (req, res) => {
  const category = req.query.category || "All";
  const search = req.query.search || "";
  
  console.log(category);

  const pageNo = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  let products; // Declare products here to make it accessible throughout the function

  try {
    if (category === "All") {
      products = await productModel
        .find({
          productName: { $regex: search, $options: "i" },
        })
        .skip((pageNo - 1) * limit)
        .limit(limit);
    } else {
      products = await productModel
        .find({ ...(category && { productCategory: category }) })
        .find({ productName: { $regex: search, $options: "i" } })

        .skip((pageNo - 1) * limit)
        .limit(limit);
    }

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No products found for this category",
      });
    }

    res.status(201).json({
      success: true,
      message: "Products fetched successfully by category",
      products: products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error,
    });
  }
};

// // search products by name
// const searchProductsByName = async (req, res) => {
//   const search = req.query.search || "";
//   const pageNo = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;

//   try {
//     // Build the query conditionally based on the search term
//     const query = { productName: { $regex: search, $options: "i" } };

//     // Fetch the products and the total count
//     const [products, totalProducts] = await Promise.all([
//       productModel
//         .find(query)
//         .skip((pageNo - 1) * limit)
//         .limit(limit),
//       productModel.countDocuments(query),
//     ]);

//     // If no products are found, return an appropriate response
//     if (!products || products.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No products found for this search",
//       });
//     }

//     // Return the products along with the total count for pagination purposes
//     res.status(200).json({
//       success: true,
//       message: "Products fetched successfully by search",
//       products: products,
//       totalProducts: totalProducts,
//       currentPage: pageNo,
//       totalPages: Math.ceil(totalProducts / limit),
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

const searchProductsByName = async (req, res) => {
  // Step 1: Get the search query from the request
  const search = req.query.search;

  // Step 2: If no search parameter is provided, return immediately without a response
  if (!search) {
    return res.status(400).json({
      success: false,
      message: "Search query parameter 'search' is required.",
    });
  }

  // Step 3: Validate and sanitize the input
  if (typeof search !== "string") {
    return res.status(400).json({
      success: false,
      message: "Search query must be a string.",
    });
  }

  // Sanitize the input to remove special characters
  const sanitizedQuery = search.replace(/[^\w\s]/gi, "");

  if (!sanitizedQuery) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid search input. Only alphanumeric characters and spaces are allowed.",
    });
  }

  // Step 4: Limit the input length to prevent abuse
  if (sanitizedQuery.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Search query is too long. Maximum length is 100 characters.",
    });
  }

  try {
    // Step 5: Build the query based on the sanitized search term
    const query = { productName: { $regex: sanitizedQuery, $options: "i" } };

    // Step 6: Fetch the products
    const products = await productModel.find(query);

    // Step 7: If no products are found, return an appropriate response
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for this search",
      });
    }

    // Step 8: Return the products
    res.status(200).json({
      success: true,
      message: "Products fetched successfully by search",
      products: products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  deleteProduct,
  updateProduct,
  paginatonProducts,
  getProductsByCategory,
  searchProductsByName,
};
