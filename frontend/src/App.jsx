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
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/organizer-login" element={<OrganizerLogin />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['participant']}><OnboardingPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['participant','organizer','admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/create-event" element={<ProtectedRoute allowedRoles={['organizer']}><CreateEvent /></ProtectedRoute>} />
        <Route path="/participant-dashboard" element={<ProtectedRoute allowedRoles={['participant']}><ParticipantDashboard /></ProtectedRoute>} />
        <Route path="/organizer-dashboard" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute allowedRoles={['participant']}><BrowseEvents /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute allowedRoles={['participant','organizer']}><EventDetailPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['participant','organizer']}><ProfilePage /></ProtectedRoute>} />
        <Route path="/clubs" element={<ProtectedRoute allowedRoles={['participant']}><ClubsPage /></ProtectedRoute>} />
        <Route path="/clubs/:id" element={<ProtectedRoute allowedRoles={['participant']}><OrganizerDetailPage /></ProtectedRoute>} />
        <Route path="/manage-event/:id" element={<ProtectedRoute allowedRoles={['organizer']}><EventManagePage /></ProtectedRoute>} />
        <Route path="/admin/organizers" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/password-resets" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/teams/:id" element={<ProtectedRoute allowedRoles={['participant']}><TeamPage /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
export default App;