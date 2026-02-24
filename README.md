# **Felicity 2026 – Event Management System** 

The platform supports three roles: participant, organizer and admin. Each role has clearly defined permissions and dashboards.

## Tech Stack

### **Frontend**
React (Vite setup), React Router, Axios, Socket.io-client

### Backend
Node.js, Express, Socket.io, JWT authentication, bcrypt, Multer, Nodemailer

### Database
MongoDB Atlas using Mongoose

Authentication
JWT tokens with 30-day expiry
Passwords hashed using bcrypt (salt rounds 10)

Email
Nodemailer with Gmail SMTP (Ethereal fallback for development)

QR Codes
Server-side QR generation using qrcode package
Client-side QR rendering using react-qr-code

Running the Project Locally

Prerequisites
Node.js version 18 or above
MongoDB Atlas cluster (or local MongoDB)
Optional: Gmail App password for sending real emails

### Installation Steps

Clone the repository and install dependencies:

git clone https://github.com/Arushiiiiiyy/Mern-stack-project.git
cd Mern-stack-project

Backend setup
cd backend
npm install

Frontend setup
cd ../frontend
npm install

Create a .env file inside backend folder:

MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
PORT=3000

Optional email configuration:

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com

SMTP_PASS=your_app_password
SMTP_FROM="Felicity 2026" noreply@felicity.iiit.ac.in

Start the servers:

Backend
cd backend
npm run dev

Frontend
cd frontend
npm run dev

Frontend runs on http://localhost:5173

Backend runs on http://localhost:3000/api

### Folder Structure Overview

Backend contains:

config folder for database connection
controllers for handling all route logic (auth, events, admin, teams, forum, registrations etc.)
middleware for JWT authentication and role-based access
models for Mongoose schemas (User, Event, Registration, Team, Message)
routes for Express routers
utils folder for sending emails
server.js as the main entry file

### Frontend contains:

api.js for Axios configuration and token interceptor
App.jsx for route definitions
components folder for reusable components like Navbar, FormBuilder and DiscussionForum
pages folder for dashboards, event creation, team page, profile, login and signup

### Core Features Implemented

User Authentication
JWT-based login and registration with role-based access control. Participants can register themselves. Organizers are created only by admin. Admin account is seeded in backend.

#### Event Management
Organizers can create, edit and manage events with proper lifecycle states: Draft, Published, Ongoing, Completed and Closed.

#### Dynamic Form Builder
Organizers can define custom registration fields (text, dropdown, checkbox, file upload etc.). The form gets locked after the first registration to prevent inconsistent data.

#### Event Registration
Participants can register for events. Eligibility and capacity limits are validated before allowing registration.

#### Ticket and QR Generation
Each registration generates a unique ticket ID in the format FEL-XXXXXXXX. A QR code is generated and emailed to the participant.

#### Attendance Tracking
Organizers can scan or verify QR codes to mark attendance. Duplicate scans are rejected.

#### Participant Dashboard
Participants can view upcoming events, completed events, merchandise orders and cancelled registrations.

#### Organizer Dashboard
Organizers can see analytics including total registrations, revenue, fill rate and attendance rate for each event.

#### Participant Preferences
Participants can select areas of interest and follow clubs. These preferences influence event recommendations.

#### Password Security
Passwords are hashed using bcrypt. Password strength rules are enforced.

#### IIIT Email Validation
Participants registering as IIIT students must use iiit.ac.in email domain.

### Advanced Features Implemented

### Tier A Features

#### Hackathon Team Registration
Participants can create teams, invite members using a unique code and complete team registration only when all members join. Duplicate team membership for the same event is prevented.

#### Merchandise Payment Approval Workflow
Participants upload payment proof after ordering merchandise. Organizers can approve or reject orders. Stock is reduced only after approval. All status changes are stored with timestamps.

### Tier B Features

#### Real-Time Discussion Forum
Each event has a discussion forum implemented using Socket.io. Participants can post messages, reply to threads and react. Organizers can moderate messages.

#### Organizer Password Reset Workflow
Organizers must request password reset through the system. Admin can approve or reject the request. Upon approval, a new password is generated and emailed. All reset requests are logged.

### Tier C Feature

#### Add to Calendar Integration
Participants can download .ics files for events or directly add events to Google Calendar or Outlook.

### Additional Functionalities

CSV export for event registrations
Discord webhook integration for automatic event announcements
Strict event state transition logic
HMAC-based QR tamper prevention
Organizer view for detailed form responses
Admin dashboard for managing organizers and password reset approvals

API Overview

Authentication
POST /api/auth/register
POST /api/auth/login

Events
GET /api/events
POST /api/events
PUT /api/events/:id
GET /api/events/:id
GET /api/events/:id/registrations
GET /api/events/:id/registrations/export

Registrations
POST /api/registrations/:eventId
GET /api/registrations/my-registrations
POST /api/registrations/verify-qr
PUT /api/registrations/:id/cancel
PUT /api/registrations/:id/payment-proof
PUT /api/registrations/:id/approve
PUT /api/registrations/:id/attend

Teams
POST /api/teams
POST /api/teams/join
GET /api/teams/my-teams
PUT /api/teams/:id/leave
DELETE /api/teams/:id

Users
GET /api/users/profile
PUT /api/users/profile
PUT /api/users/change-password
GET /api/users/organizers
PUT /api/users/follow/:id

Admin
POST /api/admin/organizers
PUT /api/admin/organizers/:id/toggle
PUT /api/admin/organizers/:id/archive
GET /api/admin/password-resets
PUT /api/admin/password-resets/:id

Calendar
GET /api/calendar/:eventId/ics
GET /api/calendar/:eventId/google
GET /api/calendar/:eventId/outlook

Forum
GET /api/forum/:eventId/messages
POST /api/forum/:eventId/messages
DELETE /api/forum/messages/:id
PUT /api/forum/messages/:id/react

#### Deployment Notes

Frontend can be deployed on Vercel or Netlify.
Backend can be deployed on Render or Railway.
MongoDB Atlas is used for production database.

For single-server deployment, frontend build files can be copied into backend public folder and served statically.

Default Roles

Participant
Registers through signup page

Organizer
Created by admin via admin dashboard

Admin
Seeded directly in database or through backend setup

**PACKAGES USED**
Package	Purpose
express	- Web framework
mongoose - 	MongoDB ODM
dotenv - 	Load .env variables
bcrypt	- Password hashing
jsonwebtoken - 	JWT auth tokens
cors	- Cross-origin requests
multer -	File uploads (payment proof, images)
nodemailer	
qrcode	
socket.io	
ics-generator	
nodemon (dev)	

react + react-dom
react-router-dom	
axios	
socket.io-client	
react-qr-code	
vite (dev)	