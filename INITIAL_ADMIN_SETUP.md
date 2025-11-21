# Initial Admin Setup Guide

Since your platform now uses a referral code system, you need to create the first admin user who can then generate referral codes for other trainers.

## 🚀 Quick Setup Options

### Option 1: Use the Initial Setup Form (Recommended)

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the login page**
   - You'll see the normal login form
   - At the bottom, there's a section "İlk kez mi kuruyorsunuz?"
   - Click the **"🚀 İlk Kurulum (Admin Oluştur)"** button

3. **Fill out the admin form:**
   - Enter your personal details
   - Use a secure email and password
   - This will create an admin user who can manage referral codes

4. **After creating the admin:**
   - Login with your admin credentials
   - Go to "Referans Kodları" in the sidebar
   - Create referral codes for other trainers
   - Share the codes with trainers who need to register

### Option 2: Use the Utility Script

1. **Edit the initial admin configuration:**
   - Open `src/utils/createInitialAdmin.js`
   - Update the `INITIAL_ADMIN` object with your details:
     ```javascript
     const INITIAL_ADMIN = {
       email: 'your-email@zenithyoga.com',
       password: 'YourSecurePassword123!',
       firstName: 'Your First Name',
       lastName: 'Your Last Name',
       phone: '+90 555 123 4567',
       gender: 'male', // or 'female'
       birthDate: '1990-01-01'
     };
     ```

2. **Run the script:**
   - Uncomment the last line in the file: `createInitialAdmin()`
   - In your browser console (F12), import and run:
     ```javascript
     import { createInitialAdmin } from './src/utils/createInitialAdmin.js';
     createInitialAdmin();
     ```

3. **Check the console for success message**

## 📋 What Happens Next

After creating your initial admin:

1. **Login** with your admin credentials
2. **Navigate to "Referans Kodları"** in the sidebar
3. **Create referral codes** for new trainers:
   - Click "Yeni Kod Oluştur"
   - Optionally add trainer name and notes
   - System generates an 8-character code
   - Share this code with the trainer

4. **Trainers can register:**
   - They go to the registration form
   - Enter the referral code you gave them
   - Complete their registration
   - Get immediate access as trainers

## 🔒 Security Notes

- **Change the default password** after first login
- **Remove or disable the Initial Setup form** after creating your admin
- **Keep referral codes secure** - only share with intended trainers
- **Monitor referral code usage** in the admin dashboard

## 🛠️ Disable Initial Setup (After Creating Admin)

To prevent unauthorized admin creation:

1. **Option A: Comment out the initial setup button in Login.jsx:**
   ```javascript
   // <button 
   //   type="button" 
   //   className="btn btn-outline btn-full"
   //   onClick={onSwitchToInitialSetup}
   // >
   //   🚀 İlk Kurulum (Admin Oluştur)
   // </button>
   ```

2. **Option B: Add a check for existing admins:**
   - Modify the InitialSetup component to check if any admin users exist
   - Hide the setup form if admins already exist

## 🎯 System Overview

Your new system flow:
1. **Admin creates referral codes** → 8-character codes with expiration
2. **Shares codes with trainers** → Via email, phone, etc.
3. **Trainers register with codes** → Automatic validation and trainer role
4. **Immediate access** → No approval process needed
5. **Admin manages codes** → Track usage, create new ones, delete unused

This is much simpler than the previous trainer application system while still giving you control over who can register.
