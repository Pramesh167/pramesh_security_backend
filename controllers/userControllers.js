const { response } = require("express");
const userModel = require('../models/userModel');
const { checkout } = require("../routes/userRoutes");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendOtp = require("../service/sentOtp");
const path = require('path');
const User = require("../models/userModel");
const fs = require('fs');
const axios = require('axios'); 


const createUser = async (req, res) => {
  console.log(req.body);
  const { firstName, lastName, userName, email, phoneNumber, password } = req.body;
  
  if (!firstName || !lastName || !userName || !email || !phoneNumber || !password) {
      return res.status(400).json({
          success: false,
          message: 'Please enter all details!'
      });
  }

  //password validation with 8 letter  number and one capital letter
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
  if (!passwordRegex.test(password)) {
      return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long and contain a number, a lowercase letter, and an uppercase letter'
      });
  }
  
  

  try {
      const existingUserByEmail = await userModel.findOne({ email: email });
      const existingUserByPhone = await userModel.findOne({ phoneNumber: phoneNumber });

      if (existingUserByEmail) {
          return res.status(400).json({
              success: false,
              message: 'User with this email already exists!'
          });
      }

      if (existingUserByPhone) {
          return res.status(400).json({
              success: false,
              message: 'User with this phone number already exists!'
          });
      }

      const randomSalt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, randomSalt);

      const newUser = new userModel({
          firstName: firstName,
          lastName: lastName,
          userName: userName,
          email: email,
          phoneNumber: phoneNumber,
          password: hashedPassword
      });

      await newUser.save();

      res.status(201).json({
          success: true,
          message: 'User created successfully'
      });

  } catch (error) {
      console.log(error);
      res.status(500).json({
          success: false,
          message: 'Internal Server Error!'
      });
  }
}

const loginUser = async (req, res) => {
  console.log(req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please enter all the fields',
    });
  }

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email Doesn't Exist!",
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      // Lock account if attempts exceed 2
      if (user.loginAttempts >= 2) {
        user.lockUntil = Date.now() + 5 * 60 * 1000; // Lock for 5 minutes
        await user.save();

        return res.status(403).json({
          success: false,
          message: 'Account locked for 5 minutes due to multiple failed attempts.',
        });
      }

      await user.save();
      return res.status(400).json({
        success: false,
        message: "Password Doesn't Match!",
      });
    }

    // Reset login attempts and lockUntil if login is successful
    user.loginAttempts = 0;
    user.lockUntil = 0;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Optional: Set token expiration
    );

    return res.status(200).json({
      success: true,
      message: 'User Logged in Successfully!',
      token: token,
      userData: user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};


const getCurrentUser = async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id).select('-password'); // Do not return the password

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found!'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User found!',
            user: user
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

const getToken = async (req, res) => {
    try {
      console.log(req.body);
      const { id } = req.body;
   
      const user = await userModel.findById(id);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'User not found',
        });
      }
   
      const token = await jwt.sign(
            {
                id : user._id, isAdmin : user.isAdmin},
                process.env.JWT_SECRET
      );
   
      return res.status(200).json({
        success: true,
        message: 'Token generated successfully!',
        token: token,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: error,
      });
    }
  };

  const forgotPassword = async (req, res) => {
    const { phoneNumber} = req.body;
  
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Please enter your phone number",
      });
    }
    try{
  
      // finding user by phone number
      const user = await userModel.findOne({ phoneNumber: phoneNumber });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User not found",
        });
      }
  
      // Generate OTP random 6 digit number
      const otp = Math.floor(100000 + Math.random() * 900000);
      // generate expiry time for OTP
      const expiry = Date.now() + 10 * 60 * 1000;
      // save to database for verification
      user.resetPasswordOTP = otp;
      user.resetPasswordExpires = expiry;
      await user.save();
      // set expiry time for OTP
  
      // send OTP to registered phone number
      const isSent = await sendOtp(phoneNumber, otp)
      if(isSent){
        return res.status(400).json({
          sucess : false,
          message : 'Error sending OTP'
        })
      }
  
      //If sucess
      res.status(200).json({
        sucess : true,
        message : "OTP send sucesfully"
  
      })
      
  
  
  
    }catch(error){
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  const verifyOtpAndResetPassword = async (req, res) => {
    const { phoneNumber, otp, password } = req.body;
    if (!phoneNumber || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter all fields",
      });
    }
    try{
      const user = await userModel.findOne({phoneNumber: phoneNumber});
  
      //Verify OTP
      if(user.resetPasswordOTP != otp){
        return res.status(400).json({
          success: false,
          message: "Invalid OTP"
        })
      }
  
      //Check if OTP is expired
      if(user.resetPasswordExpires < Date.now()){
        return res.status(400).json({
          success: false,
          message: "OTP expired"
        })
      }
  
      //Hash the password
      const randomSalt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, randomSalt);
  
      //update to database
      user.password = hashedPassword;
      await user.save();
  
      //Send response
      res.status(200).json({
        success: true,
        message: "Password reset successfully"
      })
  
    }catch(error){
      console.log(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      })
    }
  } 

const uploadProfilePicture = async (req, res) => {
  // const id = req.user.id;
  console.log(req.files);
  const { profilePicture } = req.files;

  if (!profilePicture) {
    return res.status(400).json({
      success: false,
      message: 'Please upload an image',
    });
  }

  //  Upload the image
  // 1. Generate new image name
  const imageName = `${Date.now()}-${profilePicture.name}`;

  // 2. Make a upload path (/path/upload - directory)
  const imageUploadPath = path.join(
    __dirname,
    `../public/profile_pictures/${imageName}`
  );

  // Ensure the directory exists
  const directoryPath = path.dirname(imageUploadPath);
  fs.mkdirSync(directoryPath, { recursive: true });

  try {
    // 3. Move the image to the upload path
    profilePicture.mv(imageUploadPath);

    //  send image name to the user
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      profilePicture: imageName,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error,
    });
  }
};


  // edit user profile
const editUserProfile = async (req, res) => {
    const { firstName, lastName, userName,email, phoneNumber,profilePicture } = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.firstName = firstName|| user.firstName;
        user.lastName = lastName|| user.lastName;
        user.email = email|| user.email;
        user.phoneNumber = phoneNumber|| user.phoneNumber;
        user.userName = userName|| user.userName;
        user.profilePicture = profilePicture|| user.profilePicture;
      
       
        

        await user.save();

        res.status(200).json({
            success: true,
            message: 'User profile updated successfully',
            user
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user profile',
            error: error.message
        });
    }
}




  
module.exports = {
    createUser,
    loginUser,
    getCurrentUser,
    getToken,
    forgotPassword,
    verifyOtpAndResetPassword,
    uploadProfilePicture,
    editUserProfile,


}
