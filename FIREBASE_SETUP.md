# Firebase Setup Instructions

To connect your Zenith app to Firebase, follow these steps:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "zenith-gym-app")
4. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" sign-in method

## 3. Create Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in production mode" (you can change rules later)
4. Select a location for your database

## 4. Get Firebase Configuration

1. Go to Project Settings (gear icon in the left sidebar)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web platform (</>) 
4. Register your app with a nickname (e.g., "zenith-web-app")
5. Copy the Firebase configuration object

## 5. Set Up Environment Variables

1. Create a `.env` file in your project root
2. Add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 6. Update Firestore Security Rules (Optional)

Go to Firestore Database → Rules and update with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Add more rules as needed for other collections
  }
}
```

## 7. Test the Connection

1. Start your development server: `npm run dev`
2. Try registering a new user
3. Check Firebase Authentication console to see if the user was created
4. Check Firestore to see if user data was saved

## Troubleshooting

- Make sure all environment variables are prefixed with `VITE_`
- Restart your development server after adding environment variables
- Check the browser console for any Firebase-related errors
- Verify that your Firebase project has Authentication and Firestore enabled

## Features Implemented

✅ **User Registration with Firebase Auth**  
✅ **User Login with Firebase Auth**  
✅ **Complete User Data Storage in Firestore**  
✅ **Gender Selection in Registration**  
✅ **Comprehensive User Profiles** (Name, Email, Phone, Gender, Birth Date)  
✅ **Gym-Specific Fields** (Membership Type, Status, Join Date)  
✅ **Authentication State Management**  
✅ **Error Handling with Turkish Messages**  
✅ **Responsive Design for all Screen Sizes**  
✅ **Firestore Service for Data Management**  
✅ **User Statistics and Analytics Ready**  

## Firestore Data Structure

When users register, the following data is stored in Firestore:

```javascript
{
  uid: "user_firebase_uid",
  email: "user@example.com",
  firstName: "Ad",
  lastName: "Soyad", 
  displayName: "Ad Soyad",
  phone: "05551234567",
  birthDate: "1990-01-01", // or null
  gender: "male|female|other",
  receiveUpdates: true|false,
  role: "member",
  membershipStatus: "active",
  membershipType: "basic",
  joinDate: "2024-01-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  profileComplete: true,
  emergencyContact: {
    name: "",
    phone: "",
    relationship: ""
  },
  medicalInfo: {
    allergies: [],
    conditions: [],
    medications: []
  },
  preferences: {
    notifications: true|false,
    language: "tr"
  }
}
```

## Available Services

- **AuthService**: Handle authentication (login, register, logout)
- **FirestoreService**: Manage user data and statistics
- **User Statistics**: Gender breakdown, membership types, recent members

Your Zenith gym management app is now fully connected to Firebase with comprehensive user data storage! 🔥💪
