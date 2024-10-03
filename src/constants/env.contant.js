const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../.env')})
module.exports.JWT_TOKEN = process.env.JWT_SECRET_KEY
module.exports.CRYPTO_SECRET_KEY = process.env.CRYPTO_SECRET_KEY
module.exports.OPEN_API_KEY = process.env.OPEN_API_KEY
module.exports.SERP_API_KEY = process.env.SERP_API_KEY
module.exports.GPT_MODAL = process.env.GPT_MODAL
module.exports.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
module.exports.FORGOT_PASSWORD_TEMPLATE_ID = process.env.FORGOT_PASSWORD_TEMPLATE_ID
module.exports.FRONTEND_URL = process.env.FRONTEND_URL
module.exports.SENDGRID_FROM = process.env.SENDGRID_FROM