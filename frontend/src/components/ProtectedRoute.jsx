import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Redirect to their correct dashboard
    if (role === 'admin') return <Navigate to="/admin-dashboard" replace />;
    if (role === 'organizer') return <Navigate to="/organizer-dashboard" replace />;
    if (role === 'participant') return <Navigate to="/participant-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
