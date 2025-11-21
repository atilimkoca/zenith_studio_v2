# Complete User Deletion Setup

## Problem Solved
This setup enables **complete deletion** of users from both Firestore and Firebase Authentication, preventing deleted users from logging in entirely.

## Quick Setup (5 minutes)

### 1. Install Server Dependencies
```bash
cd server
npm install
```

### 2. Configure Firebase Admin
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file

### 3. Setup Environment Variables
1. Copy `.env.example` to `.env` in the server directory:
```bash
cp .env.example .env
```

2. Fill in your Firebase project details in `.env`:
```env
FIREBASE_PROJECT_ID=your-project-id-here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-actual-private-key-here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
PORT=3001
```

### 4. Start the Server
```bash
npm start
```

The server will run on `http://localhost:3001`

## How It Works

### Before (Problem):
- Admin deletes member → Only Firestore document deleted
- User can still log in via Firebase Auth
- User gets redirected to approval page
- Email still visible in Firebase Auth console

### After (Solution):
- Admin deletes member → Firestore marked as deleted + Firebase Auth account deleted
- User **cannot log in** at all
- No email in Firebase Auth console
- Complete deletion from both systems

## Usage

1. **Delete Member from Admin Panel**:
   - Click delete button on any member
   - System will:
     - Mark user as `permanently_deleted` in Firestore
     - Delete user account from Firebase Auth
     - Show success/error message

2. **User Tries to Login**:
   - If Firestore deletion worked but Auth deletion failed: "Account disabled" message
   - If both worked: "User not found" message
   - Complete prevention of access

## Verification Steps

1. Delete a member from admin panel
2. Check Firebase Console → Authentication → Users
3. Verify the email is **no longer listed**
4. Try to login with deleted account credentials
5. Confirm login is completely blocked

## Production Deployment

For production, deploy the server to:
- **Heroku**: `git push heroku main`
- **Railway**: Connect GitHub repo
- **DigitalOcean**: Use App Platform
- **AWS**: EC2 or Lambda

Update the API endpoint in `memberService.js`:
```javascript
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-server.herokuapp.com' 
  : 'http://localhost:3001';
```

## Security Features

- ✅ **Admin Authentication**: Only verified admins can delete users
- ✅ **Token Verification**: Uses Firebase ID tokens
- ✅ **Audit Logging**: All deletions logged in `admin_logs` collection
- ✅ **Batch Operations**: Support for multiple user deletion
- ✅ **Error Handling**: Graceful failure handling

## Troubleshooting

**Server won't start:**
- Check if port 3001 is available
- Verify Firebase credentials are correct

**Deletion fails:**
- Ensure server is running (`http://localhost:3001/health`)
- Check browser console for errors
- Verify admin permissions

**User still appears in Firebase Auth:**
- Check server logs for error messages
- Verify Firebase Admin SDK has proper permissions
- Try manual deletion from Firebase Console

## API Endpoints

- `DELETE /api/users/:userId` - Delete single user
- `POST /api/users/batch-delete` - Delete multiple users  
- `GET /api/users/pending-deletion` - List soft-deleted users
- `GET /health` - Server health check

This solution provides **immediate, complete user deletion** that prevents any further access attempts.
