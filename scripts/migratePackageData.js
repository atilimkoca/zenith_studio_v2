/**
 * Package Data Migration Script
 * 
 * This script fixes legacy user data that's missing:
 * - packageInfo.remainingClasses
 * - packageName at root level
 * - packageExpiryDate
 * 
 * Run this script from the browser console in the admin panel,
 * or import memberService and call migrateAllUsersPackageData()
 * 
 * Usage in browser console:
 * 1. Open your zenith studio admin panel
 * 2. Open browser DevTools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this code or import the migration function
 */

// If you want to run this manually in the Firebase console,
// here's the Firestore query to find users with missing data:

/*
FIREBASE CONSOLE QUERY:

1. Go to Firebase Console > Firestore Database
2. Select 'users' collection
3. Filter: role == 'customer'
4. Look for documents where:
   - packageInfo.remainingClasses is missing OR
   - packageName is missing AND remainingClasses > 0

Manual fix for each user document:
1. Find the user's remainingClasses value
2. Edit the document and add/update:
   {
     "packageName": "Mevcut Paket",  // or their actual package name
     "packageInfo": {
       ...existing packageInfo,
       "remainingClasses": <same as root remainingClasses>,
       "packageName": "Mevcut Paket"
     }
   }
*/

// To use programmatically from the admin panel:
/*
import memberService from '../services/memberService';

// Migrate all users
const result = await memberService.migrateAllUsersPackageData();
console.log('Migration result:', result);

// Or migrate a single user
const singleResult = await memberService.migrateUserPackageData('userId123');
console.log('Single migration:', singleResult);
*/

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           PACKAGE DATA MIGRATION INSTRUCTIONS                  ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Option 1: From Admin Panel (Recommended)                      ║
║  ─────────────────────────────────────────                     ║
║  1. Open your zenith studio admin panel in browser             ║
║  2. Open browser DevTools Console (F12 > Console)              ║
║  3. Run this code:                                             ║
║                                                                ║
║     // Get the memberService instance                          ║
║     const memberService = window.__memberService;              ║
║     // Or import it if not available on window                 ║
║                                                                ║
║     // Run migration                                           ║
║     memberService.migrateAllUsersPackageData()                 ║
║       .then(r => console.log('Done:', r));                     ║
║                                                                ║
║  Option 2: Manual Fix in Firebase Console                      ║
║  ─────────────────────────────────────────                     ║
║  1. Go to Firebase Console > Firestore                         ║
║  2. Find users with role='customer'                            ║
║  3. For each user missing packageInfo.remainingClasses:        ║
║     - Copy their remainingClasses value                        ║
║     - Add it to packageInfo.remainingClasses                   ║
║     - Add packageName if missing                               ║
║                                                                ║
║  What this migration fixes:                                    ║
║  ─────────────────────────────                                 ║
║  ✓ Syncs remainingClasses to packageInfo.remainingClasses      ║
║  ✓ Adds packageName at root level if missing                   ║
║  ✓ Syncs packageExpiryDate from packageInfo.expiryDate         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);
