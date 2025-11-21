// components/UI/PhoneInput.jsx
import React, { useState, useRef, useEffect } from 'react';
import './PhoneInput.css';

const PhoneInput = ({ 
  value = '', 
  onChange, 
  onBlur,
  className = '', 
  error = false, 
  disabled = false,
  placeholder = '5XX XXX XX XX',
  required = false,
  id,
  name
}) => {
  // Fixed to Turkey only - no country selection
  const selectedCountry = { code: 'TR', name: 'Turkey', dialCode: '+90' };
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const inputRef = useRef(null);

  // Initialize phone number from value prop
  useEffect(() => {
    if (value) {
      // Remove +90 prefix if present
      if (value.startsWith('+90')) {
        setPhoneNumber(value.replace('+90', '').trim());
      } else {
        setPhoneNumber(value);
      }
    }
  }, [value]);

  const formatPhoneNumber = (number) => {
    const digits = number.replace(/\D/g, '');
    
    // Format for Turkish phone numbers
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const inputValue = e.target.value;
    const formatted = formatPhoneNumber(inputValue);
    setPhoneNumber(formatted);
    
    const fullNumber = selectedCountry.dialCode + ' ' + formatted.replace(/\s/g, '');
    if (onChange) {
      onChange({
        target: {
          name: name,
          value: fullNumber
        }
      });
    }
  };

  return (
    <div className={`phone-input-container ${className} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
      <div className="phone-input-wrapper">
        {/* Fixed Country Code Display */}
        <div className="country-button static">
          <span className="country-code">{selectedCountry.code}</span>
          <span className="dial-code">{selectedCountry.dialCode}</span>
        </div>
        
        {/* Phone Number Input */}
        <input
          ref={inputRef}
          type="tel"
          id={id}
          name={name}
          value={phoneNumber}
          onChange={handlePhoneChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className="phone-number-input"
          disabled={disabled}
          required={required}
          autoComplete="tel"
        />
      </div>
    </div>
  );
};

export default PhoneInput;