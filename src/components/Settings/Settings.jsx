// components/Settings/Settings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../config/firebase';
import './Settings.css';
import PhoneInput from '../UI/PhoneInput';

const Settings = () => {
  const { currentUser, refreshUserData } = useAuth();
  const fileInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    photoURL: '',
    role: '',
    membershipType: '',
    joinDate: ''
  });

  const [initialLoading, setInitialLoading] = useState(true);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadUserProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadUserProfile = async () => {
    if (!currentUser) {
      setInitialLoading(false);
      return;
    }
    
    try {
      // Set basic user data immediately from Firebase Auth
      setProfileData(prev => ({
        ...prev,
        email: currentUser.email || '',
        photoURL: '' // Start with empty photo
      }));
      
      // Set initial loading to false quickly to show the form
      setInitialLoading(false);
      setLoading(true);
      
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Handle joinDate with proper timestamp conversion
        let joinDate = '';
        if (userData.createdAt) {
          try {
            if (typeof userData.createdAt.toDate === 'function') {
              // Firebase Timestamp
              joinDate = new Date(userData.createdAt.toDate()).toLocaleDateString('tr-TR');
            } else if (userData.createdAt instanceof Date) {
              // JavaScript Date
              joinDate = userData.createdAt.toLocaleDateString('tr-TR');
            } else if (typeof userData.createdAt === 'string') {
              // String date
              joinDate = new Date(userData.createdAt).toLocaleDateString('tr-TR');
            }
          } catch (error) {
            console.warn('Error parsing createdAt date:', error);
            joinDate = 'Bilinmiyor';
          }
        }
        
        setProfileData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: currentUser.email || '',
          phone: userData.phone || '',
          photoURL: userData.photoURL || '', // Load existing photo if available
          role: userData.role || 'member',
          membershipType: userData.membershipType || '',
          joinDate: joinDate
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showNotification('Profil yüklenirken hata oluştu', 'error');
      setInitialLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showNotification('Kullanıcı oturumu bulunamadı', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // First update Firestore document (this is more reliable)
      await updateDoc(doc(db, 'users', currentUser.uid), {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        photoURL: profileData.photoURL,
        updatedAt: new Date()
      });

      // Then try to update Firebase Auth profile (optional, may fail due to auth state)
      try {
        if (currentUser && typeof currentUser.reload === 'function') {
          await updateProfile(currentUser, {
            displayName: `${profileData.firstName} ${profileData.lastName}`,
            photoURL: profileData.photoURL
          });
        }
      } catch (authError) {
        console.warn('Auth profile update failed, but Firestore was updated:', authError);
        // Don't show error to user since Firestore update succeeded
      }

      // Refresh user data in AuthContext to update sidebar
      await refreshUserData();

      showNotification('Profil başarıyla güncellendi!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Profil güncellenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showNotification('Kullanıcı oturumu bulunamadı', 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('Yeni şifreler eşleşmiyor', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showNotification('Şifre en az 6 karakter olmalıdır', 'error');
      return;
    }

    if (!passwordData.currentPassword) {
      showNotification('Mevcut şifrenizi girin', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Get the fresh Firebase Auth user object
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        showNotification('Şifre değiştirmek için tekrar giriş yapmanız gerekiyor', 'error');
        return;
      }

      // First, reauthenticate the user with their current password
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // Now update the password
      await updatePassword(firebaseUser, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showNotification('Şifre başarıyla güncellendi!', 'success');
    } catch (error) {
      console.error('Error updating password:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/wrong-password') {
        showNotification('Mevcut şifre yanlış', 'error');
      } else if (error.code === 'auth/invalid-credential') {
        showNotification('Mevcut şifre yanlış', 'error');
      } else if (error.code === 'auth/requires-recent-login') {
        showNotification('Güvenlik nedeniyle tekrar giriş yapmanız gerekiyor', 'error');
      } else if (error.code === 'auth/weak-password') {
        showNotification('Şifre çok zayıf. Daha güçlü bir şifre seçin', 'error');
      } else if (error.code === 'auth/too-many-requests') {
        showNotification('Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin', 'error');
      } else if (error.message && error.message.includes('getIdToken')) {
        showNotification('Şifre değiştirmek için tekrar giriş yapmanız gerekiyor', 'error');
      } else {
        showNotification('Şifre güncellenirken hata oluştu', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file) => {
    if (!file || !currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('Lütfen geçerli bir resim dosyası seçin', 'error');
      return;
    }

    // Validate file size (2MB limit to avoid CORS issues)
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Dosya boyutu 2MB\'dan küçük olmalıdır', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // For smaller files, use base64 encoding to avoid CORS issues
      if (file.size < 500 * 1024) { // Less than 500KB
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64String = reader.result;
            
            // Update profile data with base64
            setProfileData(prev => ({ ...prev, photoURL: base64String }));
            
            // Update Firestore with base64 data
            await updateDoc(doc(db, 'users', currentUser.uid), {
              photoURL: base64String,
              updatedAt: new Date()
            });

            // Try to update Firebase Auth (optional)
            try {
              if (currentUser && typeof currentUser.reload === 'function') {
                await updateProfile(currentUser, { photoURL: base64String });
              }
            } catch (authError) {
              console.warn('Auth profile update failed:', authError);
            }

            // Refresh user data in AuthContext to update sidebar
            await refreshUserData();

            showNotification('Profil fotoğrafı başarıyla güncellendi!', 'success');
          } catch (error) {
            console.error('Error saving base64 photo:', error);
            showNotification('Fotoğraf kaydedilirken hata oluştu', 'error');
          } finally {
            setLoading(false);
          }
        };
        
        reader.onerror = () => {
          showNotification('Dosya okunamadı', 'error');
          setLoading(false);
        };
        
        reader.readAsDataURL(file);
        return;
      }
      
      // For larger files, try Firebase Storage with simplified path
      try {
        const fileName = `${currentUser.uid}_${Date.now()}.jpg`;
        const photoRef = ref(storage, `photos/${fileName}`);
        
        const snapshot = await uploadBytes(photoRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Update profile data
        setProfileData(prev => ({ ...prev, photoURL: downloadURL }));
        
        // Update Firestore first
        await updateDoc(doc(db, 'users', currentUser.uid), {
          photoURL: downloadURL,
          updatedAt: new Date()
        });

        // Try to update Firebase Auth (optional)
        try {
          if (currentUser && typeof currentUser.reload === 'function') {
            await updateProfile(currentUser, { photoURL: downloadURL });
          }
        } catch (authError) {
          console.warn('Auth profile update failed:', authError);
        }

        // Refresh user data in AuthContext to update sidebar
        await refreshUserData();

        showNotification('Profil fotoğrafı başarıyla güncellendi!', 'success');
      } catch (storageError) {
        console.error('Storage error:', storageError);
        
        // Fallback to base64 if storage fails
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64String = reader.result;
            setProfileData(prev => ({ ...prev, photoURL: base64String }));
            
            await updateDoc(doc(db, 'users', currentUser.uid), {
              photoURL: base64String,
              updatedAt: new Date()
            });

            // Refresh user data in AuthContext to update sidebar
            await refreshUserData();

            showNotification('Profil fotoğrafı güncellendi (yerel olarak kaydedildi)', 'success');
          } catch (error) {
            console.error('Fallback error:', error);
            showNotification('Fotoğraf yüklenemedi', 'error');
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(file);
        return;
      }
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      showNotification('Fotoğraf yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Update profile data first
      setProfileData(prev => ({ ...prev, photoURL: '' }));
      
      // Update Firestore first
      await updateDoc(doc(db, 'users', currentUser.uid), {
        photoURL: '',
        updatedAt: new Date()
      });

      // Try to update Firebase Auth (optional)
      try {
        if (currentUser && typeof currentUser.reload === 'function') {
          await updateProfile(currentUser, { photoURL: null });
        }
      } catch (authError) {
        console.warn('Auth profile update failed:', authError);
      }

      // Refresh user data in AuthContext to update sidebar
      await refreshUserData();

      showNotification('Profil fotoğrafı kaldırıldı', 'success');
    } catch (error) {
      console.error('Error removing photo:', error);
      showNotification('Fotoğraf kaldırılırken hata oluştu', 'error');
      // Revert the change if there was an error
      setProfileData(prev => ({ ...prev, photoURL: profileData.photoURL }));
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { 
      id: 'profile', 
      name: 'Profil Bilgileri', 
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    { 
      id: 'security', 
      name: 'Güvenlik', 
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <circle cx="12" cy="16" r="1"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      )
    }
  ];

  if (initialLoading) {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <h1>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle', marginRight: '12px', color: '#059669'}}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Ayarlar
          </h1>
          <p>Profil bilgilerinizi ve hesap ayarlarınızı yönetin</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Profil bilgileri yükleniyor<span className="loading-dots"></span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'success' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </span>
          <span>{notification.message}</span>
          <button 
            className="notification-close"
            onClick={() => setNotification(null)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <div className="settings-header">
        <h1>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle', marginRight: '12px', color: '#059669'}}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Ayarlar
        </h1>
        <p>Profil bilgilerinizi ve hesap ayarlarınızı yönetin</p>
      </div>

      <div className="settings-content">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-name">{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="settings-panel">
          {activeTab === 'profile' && (
            <div className="profile-section">
              <div className="section-header">
                <h2>Profil Bilgileri</h2>
                <p>Kişisel bilgilerinizi güncelleyin</p>
              </div>

              <div className="profile-photo-section">
                <div className="photo-container">
                  <div className="photo-wrapper">
                    {profileData.photoURL ? (
                      <img 
                        src={profileData.photoURL} 
                        alt="Profil fotoğrafı"
                        className="profile-photo"
                      />
                    ) : (
                      <div className="photo-placeholder">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="placeholder-icon">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                    )}
                    <div className="photo-overlay">
                      <button 
                        className="photo-button change"
                        onClick={triggerFileInput}
                        disabled={loading}
                      >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </button>
                      {profileData.photoURL && (
                        <button 
                          className="photo-button remove"
                          onClick={removePhoto}
                          disabled={loading}
                        >
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="photo-info">
                    <h3>Profil Fotoğrafı</h3>
                    <p>JPG, PNG formatında, maksimum 2MB</p>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>

              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Ad</label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Soyad</label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>E-posta</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="disabled"
                    />
                    <small>E-posta adresi değiştirilemez</small>
                  </div>
                  <div className="form-group">
                    <label>Telefon</label>
                    <PhoneInput
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="5XX XXX XX XX"
                      defaultCountry="TR"
                    />
                    <small>&nbsp;</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Rol</label>
                    <input
                      type="text"
                      value={profileData.role === 'admin' ? 'Yönetici' : profileData.role === 'trainer' ? 'Antrenör' : 'Üye'}
                      disabled
                      className="disabled"
                    />
                  </div>
                  <div className="form-group">
                    <label>Üyelik Tarihi</label>
                    <input
                      type="text"
                      value={profileData.joinDate}
                      disabled
                      className="disabled"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="save-button"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="button-spinner"></div>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px'}}>
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                          <polyline points="17,21 17,13 7,13 7,21"/>
                          <polyline points="7,3 7,8 15,8"/>
                        </svg>
                        Değişiklikleri Kaydet
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="security-section">
              <div className="section-header">
                <h2>Güvenlik Ayarları</h2>
                <p>Şifrenizi ve güvenlik ayarlarınızı yönetin</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="password-form">
                <div className="form-group">
                  <label>Mevcut Şifre</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Yeni Şifre</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                    minLength="6"
                  />
                  <small>En az 6 karakter olmalıdır</small>
                </div>

                <div className="form-group">
                  <label>Yeni Şifre (Tekrar)</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength="6"
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="save-button"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="button-spinner"></div>
                        Güncelleniyor...
                      </>
                    ) : (
                      <>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px'}}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <circle cx="12" cy="16" r="1"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Şifreyi Güncelle
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;