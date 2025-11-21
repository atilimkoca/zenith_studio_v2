// Test component for customer registration
import React, { useState } from 'react';
import authService from '../services/authService';

const TestCustomerRegistration = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testRegister = async () => {
    setLoading(true);
    try {
      const testData = {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'testcustomer@example.com',
        password: 'password123',
        phone: '05555551234',
        gender: 'male',
        membershipType: 'basic',
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '05555554321',
          relation: 'Parent'
        },
        medicalConditions: 'None',
        fitnessGoals: 'Weight loss'
      };

      const registerResult = await authService.registerCustomer(testData);
      setResult(registerResult);
    } catch (error) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Test Customer Registration</h2>
      <button onClick={testRegister} disabled={loading}>
        {loading ? 'Registering...' : 'Test Register Customer'}
      </button>
      
      {result && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TestCustomerRegistration;
