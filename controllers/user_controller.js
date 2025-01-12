const { User, isPasswordChangeRequired, validatePassword } = require("../models/User");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


// const userRegister = (req, res, next) => {

//     const { fullName, email, role, password, otp } = req.body;

//     User.findOne({ email: email })
//         .then(user => {
//             // If user found that means there is already user with that email
//             if (user) return res.status(400).json({ error: `${req.body.email}, this email is already taken.` });

//             const saltRound = 10;
//             bcrypt.hash(password, saltRound, (err, hashedPassword) => {

//                 if (!err) {
//                     User.create({ fullName, email, role, password: hashedPassword, passwordHistory: hashedPassword })
//                         .then(user => res.status(201).json(user))
//                         .catch(err => {
//                             res.status(400).json({ error: err.message });
//                         });
//                 }
//                 else {
//                     console.log(`Error wile registering. Error message: ${err}`);
//                 }
//             });

//         })
//         .catch((err => {
//             res.status(500).json({ error: err.message });
//         }));
// };


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

const userLogin = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email or password is empty.' });
    }

    try {
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(400).json({ error: 'Account has not been registered.' });
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(400).json({ error: 'Account is locked. Please try again later.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            user.failedAttempts += 1;

            if (user.failedAttempts >= 5) {
                user.lockUntil = Date.now() + 5 * 60 * 1000; 
                user.failedAttempts = 0; 
                user.status = 'disable'; 
            }
            await user.save();
            return res.status(400).json({ error: 'Invalid email or password.' });
        }
        user.failedAttempts = 0;
        user.lockUntil = undefined;
        user.status = 'active'; 
        await user.save();

        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            picture: user.picture,
            otp: user.otp,
        };

        jwt.sign(payload, process.env.SECRET, { expiresIn: '5d' }, (err, token) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({ token: token, user: payload });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const userAccountLock = (req, res, next) => {
    const { email } = req.body;

    if (email == '') return res.status(400).json({ error: 'Email is empty.' });

    User.findOne({ email: email })
        .then(user => {
            if (!user) return res.status(400).json({ error: 'Account has not been registered.' });

            user.status = 'disable';
            user.save()
                .then(updatedUserStatus => {
                    res.json(updatedUserStatus);
                })
                .catch((err => res.status(500).json({ error: err.message })));
        })
        .catch((err => res.status(500).json({ error: err.message })));

};


// get user profile

const getProfile = (req, res, next) => {
    console.log(`User id: ${req.user.id} , name: ${req.user.fullName}`);
    User.findById(req.user.id)
        .then(foundUser => {
            if (!foundUser) return res.status(400).json({ error: 'No user found with this token.' });

            // send only fullName, picture, email

            const registeredUser = {
                "fullName": foundUser.fullName,
                "email": foundUser.email,
                "picture": foundUser.picture,
            }
            res.status(200).json(registeredUser);
        })
        .catch((err => res.status(400).json({ error: err.message })));

};

// allow to update full name becasue picture will be updated by separate end point

const updateProfile = (req, res, next) => {
    if (req.body.fullName == '') return res.status(400).json('Failed to update profile.');
    User.findByIdAndUpdate(req.user.id, { $set: { fullName: req.body.fullName } }, { new: true })
        .then(updatedProduct => {
            res.status(200).json(updatedProduct);
        })
        .catch((err => res.status(400).json({ error: err.message })));
};

const getPasswordExpiry = (req, res, next) => {
    const user = req.user;
    console.log(user);
    User.findById(req.user.id)
        .then(foundUser => {
            if (!foundUser) return res.status(400).json({ error: 'User is not found' });

            if (isPasswordChangeRequired(foundUser.passwordLastChanged)) {
                return res.status(200).json({ message: true });
            }
            else {
                return res.status(200).json({ message: false });
            }

        })
        .catch((err => res.status(500).json({ error: err.message })));
};

// allow to delete account
const deleteAccount = (req, res, next) => {
    User.findByIdAndDelete(req.user.id)
        .then(() => res.status(204).end())
        .catch((err => res.status(500).json({ error: err.message })));
}



function changePasswordFromValidAccount(newPassword, User, user, res, req) {
    const saltRound = 10;
    bcrypt.hash(newPassword, saltRound, (err, newHashedPassword) => {
        if (!err) {
            console.log(`New hashed password: ${newHashedPassword}`);
            User.findByIdAndUpdate(req.user.id,
                {
                    $set: {
                        password: newHashedPassword,
                        passwordHistory: user.passwordHistory.concat(newHashedPassword),
                        passwordLastChanged: Date.now()
                    }
                }, { new: true })
                .then(updatedCredentials => {
                    res.status(200).json(updatedCredentials);
                })
                .catch((err => res.status(400).json({ error: err.message })));
        }
        else {
            return res.status(500).json({ error: err.message });
        }
    });
}



async function passwordMatches(user, newPassword) {
    let counter = 0;
    try {
        for (let hashedoldPassword of user.passwordHistory) {
            const match = await bcrypt.compare(newPassword, hashedoldPassword);
            if (match) {
                counter++;
                console.log(`Password match counter : ${counter}`)
                return true;
            }
        }
        console.log('Password does not match');
        return false;
    }
    catch (error) {
        console.error('Error comparing passwords:', error);
        return false;
    }
}

const changePassword = (req, res, next) => {

    const { oldPassword, newPassword } = req.body;

    if (oldPassword == '' || newPassword == '') return res.status(400).json('Fields are empty.');

    if (!validatePassword(newPassword)) {
        return res.status(400).json({ error: 'Password does not follow guidelines.' });
    }

    User.findById(req.user.id)
        .then(user => {
            if (!user) return res.status(400).json({ error: 'User is not found' });

            bcrypt.compare(oldPassword, user.password, async (err, success) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (success) {
                    const result = await passwordMatches(user, newPassword);

                    if (!result) {
                        changePasswordFromValidAccount(newPassword, User, user, res, req);
                    }
                    else {
                        return res.status(400).json({ error: 'You are trying to reuse old password' });
                    }
                }
                else {
                    return res.status(400).json({ error: 'Old password must match to change to a new one' });

                }
            });
        })
        .catch((err => res.status(500).json({ error: err.message })));
}


  // const sendOtp = async (req, res) => {
  //   const { email } = req.body;
  //   // const user = await Users.findOne({ email: email });
  //   const randomOtp = Math.floor(100000 + Math.random() * 900000);
  //   // console.log(randomOtp);
  //   await sendEmailController(
  //     email,
  //     "Robosell",
  //     `Your Otp is: ${randomOtp}`
  //   ).then(async (success) => {
  //     if (success) {
  //       res.status(200).json({
  //         success: true,
  //         message: "Otp sent successfully",
  //         otp: randomOtp,
  //       });
  //     }
  //   });
  //   // } else {
  //   //   res.json({
  //   //     success: false,
  //   //     message: "User not found",
  //   //   });
  //   // }
  // };



  const sendOtp = async (req, res) => {
    const { email } = req.body;  // Extract the email from the request body
    const randomOtp = Math.floor(100000 + Math.random() * 900000);  // Generate a random OTP
    console.log('Email received in sendOtp:', email);  // Log the email address

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
  
    const emailSent = await sendEmailController(
      email,
     'Your Robo Shop OTP Code',
  `Dear Valued Customer,

  We’re thrilled to have you as part of our robo-warrior community! To continue, please use the following One-Time Password (OTP) to verify your identity and complete your action:

  OTP: ${randomOtp}

  This OTP is valid for the next 10 minutes. If you did not request this code, please ignore this email.

  Thank you for choosing us to care for your furry friends!

  Best regards,
  Robowarriors League Team`
    );
    
  
    if (emailSent) {
      res.status(200).json({ success: true, message: 'OTP sent successfully', otp: randomOtp });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  };
  

  // const sendEmailController = async (to, subject, text) => {
  //   try {
  //     let transporter = nodemailer.createTransport({
  //       service: "gmail",
  //       auth: {
  //         user: process.env.SMTP_MAIL,
  //         pass: process.env.SMTP_Password,
  //       },
  //     });
   
  //     let info = await transporter.sendMail({
  //       from: process.env.SMTP_MAIL,
  //       to: to,
  //       subject: subject,
  //       text: text,
  //     });
   
  //     console.info("Email sent successfully", { to, subject, response: info.response });
  //     return true;
  //   } catch (error) {
  //     console.error("Error sending email", { error: error.message });
  //     return false;
  //   }
  // };


  // const sendEmailController = async (to, subject, text) => {
  //   try {
  //     if (!to) {
  //       throw new Error('No recipients defined');
  //     }
  
  //     let transporter = nodemailer.createTransport({
  //       service: 'gmail',
  //       auth: {
  //         user: process.env.SMTP_MAIL,
  //         pass: process.env.SMTP_PASSWORD,
  //       },
  //     });
  
  //     let info = await transporter.sendMail({
  //       from: process.env.SMTP_MAIL, // sender address
  //       to: to, // recipient address
  //       subject: subject, // Subject line
  //       text: text, // plain text body
  //     });
  
  //     console.log('Email sent successfully', { to, subject, response: info.response });
  //     return true;
  //   } catch (error) {
  //     console.error('Error sending email', { error: error.message });
  //     return false;
  //   }
  // };
  const sendEmailController = async (to, subject, text) => {
    try {
      console.log('Attempting to send email to:', to);  // Log the recipient email address
  
      if (!to) {
        throw new Error('No recipients defined');
      }
  
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_MAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });
  
      let info = await transporter.sendMail({
        from: process.env.SMTP_MAIL, // sender address
        to: to, // recipient address
        subject: subject, // Subject line
        text: text, // plain text body
      });
  
      console.log('Email sent successfully', { to, subject, response: info.response });
      return true;
    } catch (error) {
      console.error('Error sending email', { error: error.message });
      return false;
    }
  };
  

module.exports = {
    userRegister,
    userLogin,
    userAccountLock,
    getProfile,
    updateProfile,
    getPasswordExpiry,
    deleteAccount,
    changePassword,
forgotPassword,resetPassword, sendOtp, sendEmailController,
}
