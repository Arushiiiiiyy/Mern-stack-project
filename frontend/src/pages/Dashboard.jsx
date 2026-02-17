import ParticipantDashboard from './ParticipantDashboard';
import OrganizerDashboard from './OrganizerDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const role = localStorage.getItem('role');

  return (
    <>
      {role === 'participant' && <ParticipantDashboard />}
      {role === 'organizer' && <OrganizerDashboard />}
      {role === 'admin' && <AdminDashboard />}
    </>
  );
};

export default Dashboard;