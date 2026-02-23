# Felicity 2026 — Event Management System

A full-stack MERN application for managing IIIT Hyderabad's annual fest **Felicity 2026**. Supports event creation, participant registration, merchandise sales, team hackathons, QR-based attendance, real-time discussion forums, and organizer analytics.

---

## Tech Stack

| Layer     | Technology                                                      |
| --------- | --------------------------------------------------------------- |
| Frontend  | React 19, Vite 7, React Router 7, Axios, Socket.io-client      |
| Backend   | Node.js, Express 5, Socket.io 4, JWT, Multer, Nodemailer       |
| Database  | MongoDB Atlas (Mongoose 9)                                      |
| Auth      | JWT (30-day expiry), bcrypt (salt rounds 10)                    |
| Email     | Nodemailer (Gmail SMTP / Ethereal dev fallback)                 |
| QR        | `qrcode` (server-side generation), `react-qr-code` (client)    |

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- MongoDB Atlas cluster (or local MongoDB)
- (Optional) Gmail App Password for email

### 1. Clone & install

```bash
git clone <repo-url> && cd Mern-stack-project

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/mydb
JWT_SECRET=<your-secret>
PORT=3000

# Email (optional — falls back to Ethereal test account)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Felicity 2026" <noreply@felicity.iiit.ac.in>
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`

---

## Project Structure

```
backend/
├── config/db.js              # MongoDB connection
├── controllers/              # Route handlers
│   ├── adminController.js    # Admin CRUD, password reset approval
│   ├── authController.js     # Login / Register
│   ├── calendarController.js # ICS & Google/Outlook calendar links
│   ├── eventController.js    # Event CRUD, analytics, CSV export
│   ├── forumController.js    # Discussion forum (REST + Socket.io)
│   ├── registrationController.js  # Registration, QR, attendance
│   ├── teamController.js     # Hackathon team management
│   └── userController.js     # Profile, preferences, password change
├── middleware/authMiddleware.js  # JWT protect, role guards
├── models/                   # Mongoose schemas
│   ├── Event.js              # Event + form fields + variants
│   ├── Message.js            # Forum messages + threading
│   ├── Registration.js       # Tickets, status history, responses
│   ├── Team.js               # Hackathon teams
│   └── User.js               # Users + virtual name + bcrypt hooks
├── routes/                   # Express routers
├── utils/sendEmail.js        # Email templates (registration, QR, reset)
└── server.js                 # App entry, Socket.io setup

frontend/src/
├── api.js                    # Axios instance + JWT interceptor
├── App.jsx                   # Route definitions
├── components/
│   ├── DiscussionForum.jsx   # Real-time chat (Socket.io)
│   ├── FormBuilder.jsx       # Dynamic form field editor
│   └── Navbar.jsx            # Navigation bar
└── pages/
    ├── AdminDashboard.jsx    # Admin panel
    ├── CreateEvent.jsx       # Event creation form
    ├── EventManagePage.jsx   # Organizer event management + form responses
    ├── OrganizerDashboard.jsx # Dashboard with analytics
    ├── ParticipantDashboard.jsx # Participant registrations + QR tickets
    ├── TeamPage.jsx          # Team creation / joining
    └── ...                   # Landing, Login, Signup, Profile, etc.
```

---

## Features Implemented

### Core (Required)

| # | Feature | Details |
|---|---------|---------|
| 1 | **User Authentication** | JWT-based login/register, role-based access (participant, organizer, admin) |
| 2 | **Organizer Management** | Admin creates organizer accounts, organizer CRUD for events |
| 3 | **Event CRUD** | Create, edit, delete events with status lifecycle (Draft → Published → Ongoing → Completed → Closed) |
| 4 | **Dynamic Form Builder** | Organizers define custom registration fields (text, number, dropdown, checkbox, file upload) |
| 5 | **Browse & Filter Events** | Search, filter by type/eligibility/date, trending events |
| 6 | **Event Registration** | Register with custom form responses, eligibility checks, capacity limits |
| 7 | **Ticket Generation** | UUID-based ticket IDs (`FEL-XXXXXXXX`), HMAC-SHA256 signed QR codes |
| 8 | **QR Code Email** | QR code embedded as inline image in confirmation email |
| 9 | **Attendance Tracking** | QR scan → mark attendance, duplicate scan rejection |
| 10 | **Participant Dashboard** | View upcoming/past/merchandise/cancelled registrations with QR tickets |
| 11 | **Organizer Dashboard** | Event management with analytics (registrations, revenue, fill rate, attendance rate) |
| 12 | **Participant Preferences** | Interest-based + followed-club recommendation engine |
| 13 | **Password Security** | bcrypt hashing, min 8 chars with uppercase/lowercase/number/special, strong generated passwords |
| 14 | **IIIT Email Validation** | IIIT participants must register with `iiit.ac.in` email |

### Tier A — Hackathon Team Registration + Merchandise Payment Approval

| Feature | Details |
|---------|---------|
| **Team Registration** | Create team → invite code → join → auto-register all members on completion |
| **Multi-team Prevention** | User cannot join multiple teams for the same event |
| **Merchandise Orders** | Variant selection, quantity, payment proof upload |
| **Payment Approval** | Organizer approve/reject with comments; stock decremented only on approval |
| **Status History** | Full audit trail of status changes with timestamps |

### Tier B — Real-Time Discussion Forum + Organizer Password Reset

| Feature | Details |
|---------|---------|
| **Discussion Forum** | Socket.io real-time messaging per event, threaded replies, emoji reactions |
| **Message Moderation** | Organizers can delete messages, pinned messages support |
| **Password Reset Flow** | Organizer requests → admin approves/rejects → new password emailed securely |
| **Reset History** | Full history of all password reset requests with reasons and outcomes |

### Tier C — Add to Calendar Integration

| Feature | Details |
|---------|---------|
| **ICS Export** | Download `.ics` file for single or batch events |
| **Google Calendar** | Direct "Add to Google Calendar" link with IST timezone |
| **Outlook Calendar** | Direct "Add to Outlook" link |

### Additional Features

| Feature | Details |
|---------|---------|
| **CSV Export** | Export registrations with custom form field responses included |
| **Discord Webhook** | Auto-post new events to organizer's Discord channel |
| **Event State Machine** | Strict status transitions: Draft→Published→Ongoing→Completed→Closed |
| **Form Builder Lock** | Form fields locked after first registration |
| **QR Tamper Prevention** | HMAC-SHA256 signed QR payloads with backend verification endpoint |
| **Organizer Form Responses** | Expandable participant rows showing all custom form field answers |
| **Organizer Analytics** | Per-event: registrations, confirmed, pending, attended, fill rate, attendance rate, revenue |
| **Admin Dashboard** | Manage organizers (add/disable/archive), approve password resets |

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/register` | Register participant |
| POST | `/login` | Login (returns JWT) |

### Events (`/api/events`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Browse published events |
| GET | `/recommended` | Personalized recommendations |
| GET | `/my-events` | Organizer's own events |
| GET | `/analytics` | Organizer analytics dashboard data |
| POST | `/` | Create event |
| GET | `/:id` | Get event details |
| PUT | `/:id` | Update event |
| GET | `/:id/registrations` | Get event registrations (organizer) |
| GET | `/:id/registrations/export` | Export CSV |

### Registrations (`/api/registrations`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/my-registrations` | Participant's registrations |
| POST | `/verify-qr` | Verify QR code (organizer) |
| POST | `/:eventId` | Register for event |
| GET | `/:id/qr` | Get ticket QR code |
| PUT | `/:id/cancel` | Cancel registration |
| PUT | `/:id/payment-proof` | Upload payment proof |
| PUT | `/:id/approve` | Approve/reject payment (organizer) |
| PUT | `/:id/attend` | Mark attendance (organizer) |

### Teams (`/api/teams`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/` | Create team |
| POST | `/join` | Join team via invite code |
| GET | `/my-teams` | Get user's teams |
| GET | `/event/:eventId` | Get event teams (organizer) |
| PUT | `/:id/leave` | Leave team |
| DELETE | `/:id` | Cancel team (leader only) |

### Users (`/api/users`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/profile` | Get profile |
| PUT | `/profile` | Update profile |
| PUT | `/change-password` | Change password |
| GET | `/organizers` | List all organizers/clubs |
| PUT | `/follow/:id` | Follow/unfollow organizer |

### Admin (`/api/admin`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/organizers` | Add organizer |
| GET | `/organizers` | List organizers |
| PUT | `/organizers/:id/toggle` | Disable/enable organizer |
| PUT | `/organizers/:id/archive` | Archive organizer |
| GET | `/password-resets` | Pending password reset requests |
| PUT | `/password-resets/:id` | Approve/reject reset |

### Calendar (`/api/calendar`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/:eventId/ics` | Download ICS file |
| GET | `/:eventId/google` | Google Calendar link |
| GET | `/:eventId/outlook` | Outlook Calendar link |
| GET | `/batch` | Batch ICS export |

### Forum (`/api/forum`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/:eventId/messages` | Get messages |
| POST | `/:eventId/messages` | Post message |
| DELETE | `/messages/:id` | Delete message |
| PUT | `/messages/:id/react` | Add reaction |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing + QR HMAC signatures |
| `PORT` | No | Server port (default: 3000) |
| `SMTP_HOST` | No | SMTP server (falls back to Ethereal) |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_SECURE` | No | Use TLS (default: false) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password / app password |
| `SMTP_FROM` | No | From address for emails |

---

## Deployment

### Production Build

```bash
# Frontend
cd frontend && npm run build
# Output: frontend/dist/

# Backend serves static files from public/
# Copy frontend/dist to backend/public for single-server deployment
```

### Backend

```bash
cd backend && npm start
```

Set `NODE_ENV=production` and configure proper SMTP credentials for production email delivery.

---

## Default Accounts

An admin account can be seeded by uncommenting the admin seed block in `server.js`. Default roles:

- **participant** — registers via signup page
- **organizer** — created by admin via Admin Dashboard
- **admin** — seeded or created directly in DB
