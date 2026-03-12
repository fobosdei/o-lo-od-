/**
 * Email Validation Middleware
 * Checks if email is already registered before allowing registration
 */
const UserModel = require('../model/userModel')

async function checkDuplicateEmail(req, res, next) {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' })
    }

    const exists = await UserModel.emailExists(email)
    if (exists) {
      return res.status(409).json({
        error: 'El correo electrónico ya se encuentra en uso',
        code: 'EMAIL_IN_USE',
      })
    }

    next()
  } catch (err) {
    console.error('[validateEmail]', err.message)
    next(err)
  }
}

module.exports = { checkDuplicateEmail }
