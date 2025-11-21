// Demo page for testing member registration
import React from 'react';
import MemberRegister from '../components/Members/MemberRegister';

const MemberRegisterDemo = () => {
  const handleRegistrationComplete = (memberData) => {
    console.log('Member registered successfully:', memberData);
    // In a real mobile app, this would redirect to a success page
    // or show additional instructions
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--beige-light)', 
      padding: '20px' 
    }}>
      <MemberRegister onRegistrationComplete={handleRegistrationComplete} />
    </div>
  );
};

export default MemberRegisterDemo;
