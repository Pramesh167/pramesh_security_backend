const { User, isPasswordChangeRequired, validatePassword } = require("../models/User");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userRegister = async (req, res, next) => {
    try {
        const { fullName, email, role, password, otp } = req.body;
  
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: `${email}, this email is already taken.` });
        }
  
        const saltRound = 10;
        const hashedPassword = await bcrypt.hash(password, saltRound);
        const newUser = await User.create({ 
            fullName, 
            email, 
            role, 
            password: hashedPassword, 
            passwordHistory: [hashedPassword] 
        });
        return res.status(201).json(newUser);
  
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Duplicate key error: Email already exists.' });
        } else {
            return res.status(500).json({ error: err.message });
        }
    }
  };
  