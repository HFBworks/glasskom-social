
import express from 'express';
import { register, login, syncFirebaseUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/sync', syncFirebaseUser);

export default router;
