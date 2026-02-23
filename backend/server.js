import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js'
import eventRoutes from './routes/eventRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import forumRoutes from './routes/forumRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();
const app=express();
const httpServer = createServer(app);

// Socket.io setup for real-time forum + live updates
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const io = new Server(httpServer, {
  cors: { origin: allowedOrigin, credentials: true }
});

// Make io accessible to controllers via req.app
app.set('io', io);

app.use(express.json());
app.use(cors({ origin: allowedOrigin, credentials: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

//basic route to test server
app.get('/',(req,res)=>{
    res.send('API is running...')
});

app.use('/api/auth',authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/calendar', calendarRoutes);

// Socket.io connection handling for real-time forum
io.on('connection', (socket) => {
  socket.on('joinForum', (eventId) => {
    socket.join(`forum-${eventId}`);
  });

  socket.on('leaveForum', (eventId) => {
    socket.leave(`forum-${eventId}`);
  });

  socket.on('joinEvent', (eventId) => {
    socket.join(`event-${eventId}`);
  });

  socket.on('leaveEvent', (eventId) => {
    socket.leave(`event-${eventId}`);
  });

  socket.on('newMessage', (data) => {
    io.to(`forum-${data.eventId}`).emit('messageReceived', data.message);
  });

  socket.on('messageDeleted', (data) => {
    io.to(`forum-${data.eventId}`).emit('messageRemoved', data.messageId);
  });
});

const PORT=process.env.PORT || 3000;
httpServer.listen(PORT,()=>console.log(`Server is running on port ${PORT}`));

// const createAdminAccount=async()=>{
//     try{
//         const adminEmail='admin@felicity.iiit.ac.in';
//         const existingAdmin=await User.findOne({email:adminEmail});
//         if(existingAdmin){
//             console.log('Found existing Admin, deleting to fix password issues');
//             await User.deleteOne({email:adminEmail});
//         }
//         console.log('Creating new admin');
//         await User.create({
//             name:'System Administrator',
//             email:adminEmail,
//             password:'admin123',
//             role:'admin',
//             contactNumber:'000000'
//         })
//         console.log('Admin account made');
//     }
//     catch(error){
//         console.error('error setting up admin:',error);
//     }

// };
// createAdminAccount();