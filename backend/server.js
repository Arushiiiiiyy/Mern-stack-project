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


const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''));

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, origin);           // return the ONE matched origin string
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true
};

const io = new Server(httpServer, {
  cors: corsOptions
});

app.set('io', io);

app.use(express.json());

// Prevent duplicate Access-Control-Allow-Origin headers
// (e.g. if Render's proxy also injects one)
app.use((req, res, next) => {
  res.removeHeader('Access-Control-Allow-Origin');
  next();
});
app.use(cors(corsOptions));


app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


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

  socket.on('pinMessage', (data) => {
    socket.to(`forum-${data.eventId}`).emit('messagePinned', { messageId: data.messageId, pinned: data.pinned });
  });

  socket.on('reactMessage', (data) => {
    socket.to(`forum-${data.eventId}`).emit('messageReacted', { messageId: data.messageId, reactions: data.reactions });
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