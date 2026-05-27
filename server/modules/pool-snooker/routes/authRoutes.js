import express from 'express';
import { login, staffLogin, refresh, logout, getMe, forgotPassword, resetPassword, changePassword } from '../controllers/authController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';
import { authLimiter } from '../../../core/middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authLimiter, login);
router.post('/staff-login', authLimiter, staffLogin);
router.post('/refresh', refresh);
router.post('/logout', tenantAuth, logout);
router.get('/me', tenantAuth, getMe);
router.post('/change-password', tenantAuth, changePassword);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

export default router;
