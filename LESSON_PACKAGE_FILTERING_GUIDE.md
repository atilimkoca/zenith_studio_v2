# Lesson & Package Type Filtering - Implementation Guide

## Overview

This system implements package-based lesson filtering where users only see lessons that match their package type:
- **Group Package** holders → see only **Group Lessons**
- **One-on-One Package** holders → see only **One-on-One Lessons**

---

## 🎯 Features Implemented

### 1. **Package Management**
- ✅ Package type selection (Group / One-on-One)
- ✅ Visual badges on package cards
- ✅ Package type saved to Firestore

### 2. **Lesson Management**
- ✅ Lesson type selection (Group / One-on-One)
- ✅ Auto-adjust max participants (1 for one-on-one, 12 for group)
- ✅ Visual badges on lesson cards in schedule
- ✅ Lesson type saved to Firestore

### 3. **User Assignment**
- ✅ Package type stored in user's `packageInfo`
- ✅ Automatic assignment when admin approves member

### 4. **Mobile App Filtering**
- ✅ New service methods to filter lessons by package type
- ✅ Complete user-facing component (UserLessons.jsx)
- ✅ Shows only matching lessons based on user's package

---

## 📁 Files Modified/Created

### **Modified Files:**

1. **src/components/Packages/PackageModal.jsx**
   - Added `packageType` field to form
   - Dropdown: "Grup Dersi Paketi" / "Bire Bir Ders Paketi"

2. **src/components/Packages/Packages.jsx**
   - Display package type badges
   - Show package type in details section

3. **src/components/Packages/Packages.css**
   - Styling for package type badges
   - Purple for one-on-one, Blue for group

4. **src/components/Schedule/Schedule.jsx**
   - Added `lessonType` to lessonForm and recurringForm
   - Lesson type selector in create/edit modals
   - Auto-adjust maxParticipants based on lesson type
   - Display lesson type badges on calendar

5. **src/components/Schedule/Schedule.css**
   - Styling for lesson type badges on calendar
   - Responsive badge design

6. **src/components/Members/ApprovalModal.jsx**
   - Extract packageType from selected package
   - Pass packageType to membershipDetails

7. **src/services/scheduleService.js**
   - `getLessonsByPackageType(packageType)` - Filter lessons by type
   - `getAvailableLessonsForUser(userId)` - Get user-specific lessons

### **New Files Created:**

8. **src/components/Lessons/UserLessons.jsx**
   - Complete mobile app lesson viewing component
   - Filters lessons by user's package type
   - Enrollment and cancellation functionality

9. **src/components/Lessons/UserLessons.css**
   - Mobile-optimized responsive styling
   - Card-based layout with badges

---

## 🗄️ Database Structure

### **Packages Collection**
```javascript
packages/{packageId}
  ├── name: string                    // "Premium Paket"
  ├── classes: number                 // 12
  ├── price: number                   // 1200
  ├── description: string             // "Aylık premium üyelik"
  ├── packageType: string             // "group" or "one-on-one" ✨ NEW
  ├── duration: number                // 1 (months)
  ├── isActive: boolean               // true
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

### **Lessons Collection**
```javascript
lessons/{lessonId}
  ├── title: string                   // "Sabah Yoga"
  ├── type: string                    // "Yoga"
  ├── lessonType: string              // "group" or "one-on-one" ✨ NEW
  ├── trainerId: string
  ├── trainerName: string
  ├── dayOfWeek: string               // "monday"
  ├── startTime: string               // "10:00"
  ├── endTime: string                 // "11:00"
  ├── duration: number                // 60
  ├── maxParticipants: number         // 1 for one-on-one, 12+ for group
  ├── currentParticipants: number
  ├── participants: string[]          // Array of user IDs
  ├── level: string                   // "beginner"
  ├── status: string                  // "active"
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```

### **Users Collection**
```javascript
users/{userId}
  ├── email: string
  ├── displayName: string
  ├── remainingClasses: number        // Lesson credits
  ├── packageInfo: {
  │   ├── packageId: string
  │   ├── packageName: string
  │   ├── packageType: string         // "group" or "one-on-one" ✨ NEW
  │   ├── lessonCount: number
  │   ├── assignedAt: Date
  │   └── expiryDate: Date
  │ }
  ├── membershipType: string          // "basic", "premium", "unlimited"
  ├── membershipStatus: string        // "active", "inactive"
  └── ...
```

---

## 🔧 API Methods (scheduleService.js)

### 1. **getLessonsByPackageType(packageType)**

Fetches lessons filtered by package type.

**Parameters:**
- `packageType` (string): "group" or "one-on-one"

**Returns:**
```javascript
{
  success: true,
  lessons: [
    { id, title, type, lessonType, ... }
  ]
}
```

**Example Usage:**
```javascript
const result = await scheduleService.getLessonsByPackageType('group');
if (result.success) {
  console.log('Group lessons:', result.lessons);
}
```

---

### 2. **getAvailableLessonsForUser(userId)**

Fetches lessons for a specific user based on their package type, with enrollment status.

**Parameters:**
- `userId` (string): Firebase user ID

**Returns:**
```javascript
{
  success: true,
  lessons: [
    {
      ...lessonData,
      isEnrolled: boolean,     // User is already enrolled
      isFull: boolean,         // Lesson is at capacity
      canEnroll: boolean       // User can enroll (has credits, not full, not enrolled)
    }
  ],
  packageType: string,         // User's package type
  remainingClasses: number     // User's remaining credits
}
```

**Example Usage:**
```javascript
const result = await scheduleService.getAvailableLessonsForUser(currentUser.uid);
if (result.success) {
  console.log(`Package type: ${result.packageType}`);
  console.log(`Credits left: ${result.remainingClasses}`);
  console.log('Available lessons:', result.lessons);
}
```

---

## 📱 Mobile App Integration

### **Step 1: Import UserLessons Component**

In your mobile app route or page:

```javascript
import UserLessons from '../components/Lessons/UserLessons';

function LessonsPage() {
  return <UserLessons />;
}
```

### **Step 2: The Component Automatically:**
1. Gets the current user from AuthContext
2. Fetches user's package type from Firestore
3. Filters lessons to show only matching types
4. Displays enrollment status and available actions

### **Step 3: User Experience**

**For Group Package Users:**
- See header: "👥 Grup Paketi" + "🎫 X Ders Hakkı"
- See info: "📌 Grup paketinizle sadece grup derslerini görüyorsunuz."
- Only group lessons displayed
- Can enroll in group lessons (if have credits)

**For One-on-One Package Users:**
- See header: "👤 Bire Bir Paket" + "🎫 X Ders Hakkı"
- See info: "📌 Bire bir paketinizle sadece özel derslerinizi görüyorsunuz."
- Only one-on-one lessons displayed
- Can enroll in one-on-one lessons (if have credits)

---

## 🎨 Visual Design

### **Color Coding:**

| Type | Color | Usage |
|------|-------|-------|
| **Group** | Blue (#3b82f6 → #2563eb) | Package badges, Lesson badges |
| **One-on-One** | Purple (#8b5cf6 → #7c3aed) | Package badges, Lesson badges |
| **Enrolled** | Green (#10b981 → #059669) | Enrollment status badge |
| **Credits** | Sage Green (var(--sage-green)) | Credits badge |

### **Responsive Design:**
- Desktop: 3-4 columns grid
- Tablet: 2 columns grid
- Mobile: 1 column (full width cards)
- All touch targets ≥ 44px for mobile usability

---

## 🔄 Complete User Flow

### **Admin Side:**

1. **Create Package:**
   - Navigate to Packages page
   - Click "Yeni Paket"
   - Select "Paket Tipi": Group or One-on-One
   - Set price, classes, description
   - Click "Oluştur"

2. **Create Lesson:**
   - Navigate to Schedule page
   - Click "Ders Oluştur"
   - Select "Ders Tipi": Group or One-on-One
   - (Max participants auto-adjusts)
   - Fill in other details
   - Click "Oluştur"

3. **Approve Member:**
   - Navigate to Members page
   - Click on pending member
   - Select a package from dropdown
   - (Package type is automatically extracted)
   - Click "Onayla"
   - User's `packageInfo.packageType` is saved

### **User/Mobile Side:**

1. **View Lessons:**
   - Open app and navigate to Lessons page
   - Component fetches user's package type
   - Only matching lessons are displayed
   - See remaining credits

2. **Enroll in Lesson:**
   - Click "Kayıt Ol" on available lesson
   - System checks:
     - Has remaining credits?
     - Not already enrolled?
     - Lesson not full?
   - If all checks pass → enrollment succeeds
   - Credit is deducted
   - User added to participants list

3. **Cancel Lesson:**
   - Click "İptal Et" on enrolled lesson
   - Confirm cancellation
   - User removed from participants
   - Credit refunded

---

## 🧪 Testing Checklist

### **Package Management:**
- [ ] Create group package
- [ ] Create one-on-one package
- [ ] Edit package and change type
- [ ] Verify badges display correctly
- [ ] Verify package type saved to Firestore

### **Lesson Management:**
- [ ] Create group lesson
- [ ] Create one-on-one lesson
- [ ] Verify maxParticipants = 1 for one-on-one
- [ ] Verify maxParticipants = 12 for group
- [ ] Edit lesson and change type
- [ ] Verify badges display on calendar
- [ ] Verify lesson type saved to Firestore

### **User Assignment:**
- [ ] Approve member with group package
- [ ] Verify packageInfo.packageType = "group" in Firestore
- [ ] Approve member with one-on-one package
- [ ] Verify packageInfo.packageType = "one-on-one" in Firestore

### **Lesson Filtering:**
- [ ] User with group package sees only group lessons
- [ ] User with one-on-one package sees only one-on-one lessons
- [ ] User with no package type defaults to group
- [ ] Enrolled lessons show "✓ Kayıtlı" badge
- [ ] Full lessons show "Dolu" button (disabled)
- [ ] Available lessons show "Kayıt Ol" button

### **Enrollment Flow:**
- [ ] User can enroll in available lesson
- [ ] Credit is deducted after enrollment
- [ ] User appears in lesson participants
- [ ] User can cancel enrolled lesson
- [ ] Credit is refunded after cancellation
- [ ] User removed from participants

---

## 🚨 Important Notes

### **Backward Compatibility:**

Existing data without `packageType` or `lessonType` fields will:
- **Packages:** Default to `'group'` if not specified
- **Lessons:** Default to `'group'` if not specified
- **Users:** Default to `'group'` if packageInfo.packageType not set

### **Firestore Indexes:**

If you get index errors, create these composite indexes:

```
Collection: lessons
Fields: lessonType (Ascending), status (Ascending)
```

Firestore will provide the exact index link in the error message.

### **Migration Strategy:**

To update existing data:

1. **Update Existing Packages:**
```javascript
// Run this script once to set packageType for existing packages
const packages = await packageService.getAllPackages();
packages.data.forEach(async (pkg) => {
  await packageService.updatePackage(pkg.id, {
    packageType: 'group' // or determine based on package name
  });
});
```

2. **Update Existing Lessons:**
```javascript
// Run this script once to set lessonType for existing lessons
const lessons = await scheduleService.getAllLessons();
lessons.lessons.forEach(async (lesson) => {
  await scheduleService.updateLesson(lesson.id, {
    lessonType: lesson.maxParticipants === 1 ? 'one-on-one' : 'group'
  });
});
```

3. **Update Existing Users:**
```javascript
// Update users who already have packages assigned
const users = await getAllUsers(); // Your user fetch method
users.forEach(async (user) => {
  if (user.packageInfo?.packageId) {
    const pkg = await packageService.getPackageById(user.packageInfo.packageId);
    await updateUser(user.id, {
      'packageInfo.packageType': pkg.data.packageType || 'group'
    });
  }
});
```

---

## 🎓 Summary

### **What Was Added:**
1. ✅ Package type field (group/one-on-one) in package creation
2. ✅ Lesson type field (group/one-on-one) in lesson creation
3. ✅ Automatic max participant adjustment based on lesson type
4. ✅ Visual badges throughout the system
5. ✅ Package type stored in user's packageInfo
6. ✅ Service methods to filter lessons by package type
7. ✅ Complete mobile app component with filtering

### **What Happens:**
1. Admin creates packages with types
2. Admin creates lessons with types
3. Admin approves members and assigns packages
4. Package type is saved to user's account
5. Mobile app fetches only matching lessons
6. Users only see lessons for their package type

### **Result:**
- Group package users → See only group lessons ✅
- One-on-One package users → See only one-on-one lessons ✅
- Clean, type-safe, filtered lesson experience ✅

---

## 📞 Support

For questions or issues, check:
- Firestore console for data verification
- Browser console for error messages
- scheduleService.js console logs for debugging

**Happy Coding! 🎉**
