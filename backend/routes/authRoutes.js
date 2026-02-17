import express from 'express';
import {registerUser,loginUser} from '../controllers/authController.js';
// console.log("Register Function:", registerUser);
// console.log("Login Function:", loginUser);
const router=express.Router();
//router.post('./')
router.post('/register', registerUser);
router.post('/login', loginUser);
//router.post('/api/auth',authRoutes);
export default router;