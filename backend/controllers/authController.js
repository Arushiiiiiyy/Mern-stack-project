import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken=(id)=>{
    return jwt.sign({id},process.env.JWT_SECRET,{expiresIn: '30d',

    });
};

//the following function creates a new data in database
export const registerUser=async(req,res)=>{
    const {firstName,lastName,email,password,contactNumber,college,interests,participantType} = req.body;
    try{
        // Validate required fields
        if (!firstName || !lastName || !email || !password || !contactNumber || !college || !participantType) {
            return res.status(400).json({message:'All fields are required (first name, last name, email, password, contact number, college, participant type)'});
        }
        const userExists=await User.findOne({email});
        if(userExists){
            return res.status(400).json({message:'User already exists'});
        }
        // Validate IIIT participants must use IIIT email
        if (participantType === 'IIIT' && !email.endsWith('iiit.ac.in')) {
            return res.status(400).json({message:'IIIT participants must register with an IIIT email address (ending in iiit.ac.in)'});
        }
        // Password length check
        if (!password || password.length < 6) {
            return res.status(400).json({message:'Password must be at least 6 characters'});
        }
        const user=await User.create({
            firstName,
            lastName,
            email,
            password,
            contactNumber,
            role:'participant',
            participantType,
            college,
            interests
        });
        if(user){
            res.status(201).json({
                _id:user._id,
                name:user.name,
                email:user.email,
                role:user.role,
                token:generateToken(user._id),
            });
        }
        else{
            res.status(400).json({message:'Invalid user data'});
        }
    }
    catch(error){
        if (error.name === 'ValidationError') {
            return res.status(400).json({message: error.message});
        }
        res.status(500).json({message:error.message});
    }
};

//it returns jwt token instantaneuosly 
export const loginUser=async(req,res)=>{
    const {email,password}=req.body;
    try{
        const user=await User.findOne({email});
        if(user&& (await user.matchPassword(password))){
            if(user.disabled){
                return res.status(403).json({message:'Your account has been disabled. Contact the administrator.'});
            }
            if(user.archived){
                return res.status(403).json({message:'Your account has been archived. Contact the administrator.'});
            }
            res.json({
                _id:user._id,
                name:user.name,
                email:user.email,
                role:user.role,
                token:generateToken(user._id),
            });
        }
        else{
            res.status(401).json({message:'Invalid email or password'});
        }
    }
    catch(error){
        res.status(500).json({message:error.message});
    }
};