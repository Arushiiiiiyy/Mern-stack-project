import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import AdminLoginPage from './pages/AdminLoginPage';
import OrganizerLogin from './pages/OrganizerLogin';
import CreateEvent from './pages/CreateEvent';
import OrganizerDashboard from './pages/OrganizerDashboard';
import ParticipantDashboard from './pages/ParticipantDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BrowseEvents from './BrowseEvents';
import EventDetailPage from './pages/EventDetailPage';
import ProfilePage from './pages/ProfilePage';
import ClubsPage from './pages/ClubsPage';
import OrganizerDetailPage from './pages/OrganizerDetailPage';
import EventManagePage from './pages/EventManagePage';
import TeamPage from './pages/TeamPage';
import OnboardingPage from './pages/OnboardingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/organizer-login" element={<OrganizerLogin />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
        <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/events" element={<BrowseEvents />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/clubs/:id" element={<OrganizerDetailPage />} />
        <Route path="/manage-event/:id" element={<EventManagePage />} />
        <Route path="/admin/organizers" element={<AdminDashboard />} />
        <Route path="/admin/password-resets" element={<AdminDashboard />} />
        <Route path="/teams/:id" element={<TeamPage />} />
      </Routes>
    </Router>
  );
}
export default App;