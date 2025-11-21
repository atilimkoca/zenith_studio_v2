// components/Sidebar/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import zenithLogo from '../../assets/zenith_logo_rounded.jpg';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ activeView, setActiveView, collapsed, setCollapsed, onLogout }) => {
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Close mobile menu when view changes
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [activeView, isMobile]);
  
  // Get user display info
  const getUserDisplayName = () => {
    if (currentUser?.firstName && currentUser?.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    if (currentUser?.displayName) {
      return currentUser.displayName;
    }
    return 'Admin User';
  };
  
  // Get gender-based avatar
  const getUserAvatar = () => {
    // If user has a profile photo, use it
    if (currentUser?.photoURL) {
      return (
        <img 
          src={currentUser.photoURL} 
          alt="Profile" 
          className="user-avatar-image"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
      );
    }
    
    // Otherwise use gender-based emoji
    const gender = currentUser?.gender?.toLowerCase();
    if (gender === 'male' || gender === 'erkek') {
      return '👨‍💼'; // Male business person emoji
    } else if (gender === 'female' || gender === 'kadın') {
      return '👩‍💼'; // Female business person emoji
    }
    return '👤'; // Default user icon
  };
  
  // Navigation items - everyone is admin
  const navItems = [
    { id: 'dashboard', icon: '📊', text: 'Gösterge Paneli' },
    { id: 'schedule', icon: '📅', text: 'Ders Programı' },
    { id: 'members', icon: '👥', text: 'Üye Yönetimi' },
    { id: 'trainers', icon: '🧘', text: 'Eğitmenler' },
    { id: 'packages', icon: '📦', text: 'Paketler' },
    { id: 'referralCodes', icon: '🎫', text: 'Referans Kodları' },
    { id: 'finance', icon: '💰', text: 'Finans' },
    { id: 'equipment', icon: '⚙️', text: 'Ekipmanlar' },
    { id: 'reports', icon: '📈', text: 'Raporlar' },
    { id: 'settings', icon: '⚡', text: 'Ayarlar' }
  ];

  const handleNavClick = (itemId) => {
    setActiveView(itemId);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Mobile header
  if (isMobile) {
    return (
      <>
        {/* Mobile header */}
        <div className="mobile-header">
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
          <div className="mobile-logo">
            <img src={zenithLogo} alt="Zenith Logo" className="mobile-logo-img" />
            <span className="mobile-logo-text">Zénith</span>
          </div>
          
          <div className="mobile-user">
            <div className="mobile-user-avatar">
              {typeof getUserAvatar() === 'string' ? (
                <span className="user-avatar-emoji">{getUserAvatar()}</span>
              ) : (
                getUserAvatar()
              )}
            </div>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div 
            className="sidebar-overlay" 
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo-container">
              <img src={zenithLogo} alt="Zenith Logo" className="sidebar-logo" />
              <div className="logo">
                <span className="logo-text">Zénith</span>
                <span className="logo-subtitle">pilates + yoga studio</span>
              </div>
            </div>
            <button 
              className="mobile-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close Menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.text}</span>
                {activeView === item.id && (
                  <span className="nav-indicator"></span>
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">
                {typeof getUserAvatar() === 'string' ? (
                  <span className="user-avatar-emoji">{getUserAvatar()}</span>
                ) : (
                  getUserAvatar()
                )}
              </div>
              <div className="user-info">
                <span className="user-name">{getUserDisplayName()}</span>
                <span className="user-role">Yönetici</span>
              </div>
            </div>
            
            <button className="logout-btn" onClick={onLogout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              <span>Çıkış Yap</span>
            </button>
          </div>
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <img src={zenithLogo} alt="Zenith Logo" className="sidebar-logo" />
          <div className="logo">
            <span className="logo-text">Zénith</span>
            {!collapsed && <span className="logo-subtitle">pilates + yoga studio</span>}
          </div>
        </div>
        <button 
          className="toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle Sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
            title={collapsed ? item.text : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-text">{item.text}</span>}
            {!collapsed && activeView === item.id && (
              <span className="nav-indicator"></span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {typeof getUserAvatar() === 'string' ? (
              <span className="user-avatar-emoji">{getUserAvatar()}</span>
            ) : (
              getUserAvatar()
            )}
          </div>
          {!collapsed && (
            <div className="user-info">
              <span className="user-name">{getUserDisplayName()}</span>
              <span className="user-role">Yönetici</span>
            </div>
          )}
        </div>
        
        <button className="logout-btn" title="Çıkış Yap" onClick={onLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;