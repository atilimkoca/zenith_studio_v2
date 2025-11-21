import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// TEMPORARY: Add debug functions to window for testing
import referralCodeService from './services/referralCodeService.js';

if (typeof window !== 'undefined') {
  window.debugCreateReferralCode = async () => {
    console.log('🔄 Creating debug referral code...');
    try {
      const result = await referralCodeService.createReferralCode(
        'debug-admin-id',
        'Debug Admin',
        'Debug Instructor',
        'Debug test code created from console'
      );
      
      if (result.success) {
        console.log('✅ Debug referral code created:', result.code);
        alert(`Debug referral code created: ${result.code}`);
        return result.code;
      } else {
        console.error('❌ Failed to create debug code:', result.error);
        alert(`Failed to create debug code: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Exception creating debug code:', error);
      alert(`Exception: ${error.message}`);
    }
  };

  window.debugValidateReferralCode = async (code) => {
    console.log('🔍 Validating referral code:', code);
    try {
      const result = await referralCodeService.validateReferralCode(code);
      console.log('🔍 Validation result:', result);
      alert(`Validation result: ${result.success ? 'SUCCESS' : 'FAILED - ' + result.error}`);
      return result;
    } catch (error) {
      console.error('❌ Exception validating code:', error);
      alert(`Exception: ${error.message}`);
    }
  };

  window.debugFirebaseConnection = async () => {
    console.log('� Testing Firebase connection...');
    try {
      const { db } = await import('./config/firebase.js');
      const { collection, getDocs } = await import('firebase/firestore');
      
      console.log('🔍 Attempting to read referralCodes collection...');
      const querySnapshot = await getDocs(collection(db, 'referralCodes'));
      
      console.log('✅ Firebase connection successful!');
      console.log(`📊 Collection contains ${querySnapshot.size} documents`);
      
      querySnapshot.forEach((doc) => {
        console.log('📄 Document:', doc.id, doc.data());
      });
      
      alert(`Firebase connection OK! Found ${querySnapshot.size} referral codes.`);
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
      alert(`Firebase connection failed: ${error.message}`);
    }
  };

  window.debugListReferralCodes = async () => {
    console.log('📋 Listing all referral codes...');
    try {
      const result = await referralCodeService.getAllReferralCodes();
      if (result.success) {
        console.table(result.codes);
        alert(`Found ${result.codes.length} referral codes. Check console for details.`);
      } else {
        console.error('❌ Failed to list codes:', result.error);
        alert(`Failed to list codes: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Exception listing codes:', error);
      alert(`Exception: ${error.message}`);
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
