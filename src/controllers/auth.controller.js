const User = require("../models/user.model")
const CryptoJS = require('crypto-js')
const { generateAccessToken } = require("../utils/utils.jwt");
const { sendMail } = require("../utils/util.sendgrid");
const { FORGOT_PASSWORD_TEMPLATE_ID, FRONTEND_URL, SENDGRID_FROM } = require("../constants/env.contant");
const { JWTDecoder } = require("../middlewares/jwt.middleware");


// This Controller is used to Register a new user
async function registerUser(req, res) {
    try {
      const { firstName='',lastName='',email='',password='',role=''} = req.body;

      // Firstly check if user is already existed or not 
      const findUser = await User.findOne({email:(email).toLowerCase()});

      if (findUser && findUser["_id"]) {
        return res.status(200).send({ status: false, msg: "User Already Existed", user: {} })
      }

      const userDetails = {
        firstName : firstName,
        lastName: lastName,
        email: (email).toLowerCase(),
        password:password,
        role:role
      }
  
      const newUser = new User(userDetails);
      const savedUser = await newUser.save();
      const token = generateAccessToken({ user: savedUser["_id"] , role:role });
      console.log("saved user details:", savedUser)
      return res.status(200).json({status: true, token: token, user: savedUser, msg: "User Successfully Created !!" });
  
    } catch (error) {
      console.log("error while creating a new user", error)
      return res.status(400).send({ status: false, msg: "Encountered an error while creating a new user. Please refresh the page and try again.", user: {} })
  
    }
  }


  async function logIn(req, res) {
    try {
      const { email, password } = req.body;
  
      // Find user by email
      const user = await User.findOne({email:(email).toLowerCase()});
      if (!user) {
        return res.status(200).send({ status: false, msg: "User not found" });
      }
  
      // Compare passwords
      const decryptedPassword = CryptoJS.AES.decrypt(password, process.env.CRYPTO_SECRET_KEY).toString();
      const decrytedActualPassword = CryptoJS.AES.decrypt(user.password, process.env.CRYPTO_SECRET_KEY).toString();
      console.log("passwordpasswordpassword",{decryptedPassword, decrytedActualPassword})

  
      const passwordMatch = (decryptedPassword === decrytedActualPassword)
  
      if (!passwordMatch) {
        return res.status(200).send({ status: false, msg: "Incorrect username or password." });
      }
      if (user && user["_id"]) {
        // if(user.blocked){
        //   return res.status(200).json({token: null,user: {}, newUser:false, status:false, haveSchedule:false,msg: "Access Denied: User Blocked by Admin. For assistance, please reach out to the administrator."});
        // }
        const token = generateAccessToken({ user: user['_id'] });
        return res.status(200).json({ token: token, user: user, newUser: false, status: true, msg: "User LoggedIn successfully !!" });
      }
      return res.status(200).send({ status: false, user, msg: "Encountered an error while signing in. Please refresh the page and retry."});
    } catch (error) {
      console.error("Error while signing in", error);
      return res.status(200).send({ status: false, msg: "Encountered an error while signing in. Please refresh the page and retry." });
    }
  }


  async function forgotPassword(req,res){
    try {
      const {email=''} = req.body

      if(email && email !=''){
          const findUser = await User.findOne({ email: (email).toLowerCase() }).lean();
          if(findUser && findUser._id){
            const token = generateAccessToken({ user: findUser['_id'] });
            const msg = {
              to: (email).toLowerCase(),
              from: SENDGRID_FROM,
              subject: 'Forgot Password',
              templateId: FORGOT_PASSWORD_TEMPLATE_ID,
              dynamicTemplateData: {
                firstName: findUser?.firstName,
                resetPassword: `${FRONTEND_URL}/auth/reset-password?token=${token}`
              }
            }
            await sendMail(msg)
            return res.status(200).send({ status: true, msg: "Please check your email box for further steps" });
          }else{
            return res.status(200).send({ status: false, msg: "Email doesn't exist." });
          }
      }
      return res.status(200).send({ status: false, msg: "Encountered an error while sending email. Please refresh the page and retry." });

      
    } catch (error) {
      console.log("error while sending forgot password email",error);
      return res.status(200).send({ status: false, msg: "Encountered an error while sending email. Please refresh the page and retry." });
    }
  }


  async function resetPassword(req, res) {
    try {
        const { password = '', token = '' } = req.body;

        if (password && token) {
            const decodedJWT = JWTDecoder(token);

            if (decodedJWT) {
                const userId = decodedJWT.user;

                if (userId) {
                    const user = await User.findById(userId).lean();

                    if (user && user._id) {
                        await User.updateOne({ _id: userId }, { password: password });
                        return res.status(200).send({ status: true, msg: "Password Successfully Updated" });
                    } else {
                        return res.status(200).send({ status: false, msg: "Unauthorized Access" });
                    }
                }
            }
        }
        return res.status(200).send({ status: false, msg: "Invalid password or token" });

    } catch (error) {
        console.error("Error while updating password:", error);
        return res.status(500).send({ status: false, msg: "An error occurred while updating password. Please try again later." });
    }
}


  module.exports = {
    registerUser,
    logIn,
    forgotPassword,
    resetPassword
  }
  