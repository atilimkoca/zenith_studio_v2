// App.jsx
import React, { useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import Members from './components/Members/Members';
import Schedule from './components/Schedule/Schedule';
import Finance from './components/Finance/Finance';
import Trainers from './components/Trainers/Trainers';
import Equipment from './components/Equipment/Equipment';
import Reports from './components/Reports/Reports';
import Settings from './components/Settings/Settings';
import ReferralCodes from './components/ReferralCodes/ReferralCodes';
import Packages from './components/Packages/Packages';
import AuthContainer from './components/Auth/AuthContainer';
import NotificationSystem from './components/UI/NotificationSystem';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import './App.css';

const VALID_VIEWS = [
  'dashboard',
  'members',
  'schedule',
  'finance',
  'trainers',
  'equipment',
  'reports',
  'settings',
  'referralCodes',
  'packages'
];


function AppContent() {
  const [activeView, setActiveView] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const storedView = localStorage.getItem('activeView');
    return VALID_VIEWS.includes(storedView) ? storedView : 'dashboard';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  // Add event listener for navigation from Dashboard
  React.useEffect(() => {
    const handleNavigateToSchedule = () => {
      setActiveView('schedule');
    };

    window.addEventListener('navigate-to-schedule', handleNavigateToSchedule);
    
    return () => {
      window.removeEventListener('navigate-to-schedule', handleNavigateToSchedule);
    };
  }, []);

  // Persist last visited view so refreshes stay on the same page
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeView', activeView);
    }
  }, [activeView]);

  const handleAuthSuccess = (authData) => {
    console.log('Authentication successful:', authData);
  };

  const handleLogout = async () => {
    await logout();
    setActiveView('dashboard');
  };

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthContainer onAuthSuccess={handleAuthSuccess} />;
  }

  const renderContent = () => {
    switch(activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'members':
        return <Members />;
      case 'schedule':
        return <Schedule />;
      case 'finance':
        return <Finance />;
      case 'trainers':
        return <Trainers />;
      case 'equipment':
        return <Equipment />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'referralCodes':
        return <ReferralCodes />;
      case 'packages':
        return <Packages />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onLogout={handleLogout}
      />
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderContent()}
      </main>
      <NotificationSystem />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
