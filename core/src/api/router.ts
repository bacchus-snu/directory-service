import * as Router from 'koa-router'
import Model from '../model/model'
import Config from '../config'
import { login, logout, checkLogin } from './handlers/login'
import { createUser, changePassword, checkPasswordToken, getUserEmails } from './handlers/users'
import { sendVerificationEmail, checkEmailToken } from './handlers/emails'
import { getShells } from './handlers/shells'

export function createRouter(model: Model, config: Config): Router {
  const router = new Router()

  /**
   * Login API route.
   * @param username username.
   * @param password password.
   * 200 if success, 401 if not.
   */
  router.post('/api/login', login(model))
  /**
   * Logout API route.
   * Always set status code to 200, and clear session store.
   */
  router.get('/api/logout', logout())
  /**
   * Check login.
   * 200 if already logged in, 401 if not.
   * @returns username username.
   */
  router.get('/api/check-login', checkLogin())

  /**
   * Get shell list.
   * 200 if success.
   * @returns shells: Array of string.
   */
  router.get('/api/shells', getShells(model))

  /**
   * Generate verification token and send sign up link.
   * @param emailLocal email local.
   * @param emailDomain email domain.
   */
  router.post('/api/email/verify', sendVerificationEmail(model, config))

  /**
   * Check token and response with according email addresss.
   * @param token verification token.
   * @returns emailLocal email local.
   * @returns emailDomain email domain.
   */
  router.post('/api/email/check-token', checkEmailToken(model))

  /**
   * Create user.
   * @param username username.
   * @param name real name.
   * @param password password.
   * @param preferredLanguage preferred language.
   */
  router.post('/api/user', createUser(model, config))

  /**
   * Change password for user.
   * @param currentPassword current password.
   * @param newPassword new password.
   */
  router.post('/api/user/change-password', changePassword(model))

  /**
   * Check password change token.
   * @param token token.
   * @returns username username.
   */
  router.post('/api/user/check-token', checkPasswordToken(model))

  /**
   * Get user's emails.
   * 200 if success.
   * @param username username.
   * @returns emails: Array of string.
   */
  router.post('/api/user/emails', getUserEmails(model))
  return router
}
