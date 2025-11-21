# Lesson Attendance Integration Guide

This guide explains how to properly integrate lesson attendance between the mobile app and the web admin panel to ensure remaining classes are correctly reduced when users attend lessons.

## Problem Solved

Previously, when users attended lessons through the mobile app, their `remainingClasses` count was not being reduced, causing a sync issue between mobile and web platforms.

## New Functions Added

### 1. `addParticipantToLesson(lessonId, participantId)`

**Location**: `src/services/scheduleService.js`

Use this function when a user joins a lesson from the mobile app:

```javascript
import scheduleService from './services/scheduleService';

// When user joins a lesson
const result = await scheduleService.addParticipantToLesson(lessonId, userId);

if (result.success) {
  console.log('User added to lesson and remaining classes reduced');
  console.log('Remaining classes:', result.remainingClasses);
} else {
  console.error('Error:', result.error);
}
```

**What it does**:
- Adds the participant to the lesson's participants array
- Updates the lesson's currentParticipants count
- **Automatically calls `recordVisit()` to reduce remaining classes**
- Validates lesson capacity and prevents duplicate enrollments

### 2. `completeLessonAndRecordAttendance(lessonId)`

**Location**: `src/services/scheduleService.js`

Use this function when a lesson is completed to record attendance for all participants:

```javascript
// When a lesson is completed (can be called from admin panel or mobile app)
const result = await scheduleService.completeLessonAndRecordAttendance(lessonId);

if (result.success) {
  console.log(`Lesson completed. ${result.successfulAttendance} participants recorded.`);
} else {
  console.error('Error:', result.error);
}
```

**What it does**:
- Records attendance for ALL participants in the lesson
- Reduces remaining classes for each participant
- Marks the lesson as completed
- Provides detailed results for each participant

### 3. Updated `recordVisit(memberId)`

**Location**: `src/services/memberService.js`

This function has been improved to work with both `members` and `users` collections:

```javascript
import memberService from './services/memberService';

// Record a visit (reduces remaining classes by 1)
const result = await memberService.recordVisit(userId);

if (result.success) {
  console.log('Visit recorded, remaining classes:', result.remainingClasses);
}
```

**What it does**:
- Checks both `members` and `users` collections
- Reduces `remainingClasses` by 1 (unless unlimited membership)
- Updates `lastVisit` and `totalVisits`
- Handles unlimited memberships (keeps at 999)

## Integration Instructions

### For Mobile App Developers

1. **When user joins a lesson**: Use `addParticipantToLesson()` instead of just updating participant counts
2. **When lesson is completed**: Call `completeLessonAndRecordAttendance()` 
3. **For manual attendance**: Use `recordVisit()` directly

### For Web Admin Panel

The web admin panel will automatically show the updated remaining classes since all functions update the same Firestore documents.

## Example Integration

```javascript
// Mobile app - when user joins a lesson
async function joinLesson(lessonId, userId) {
  try {
    const result = await scheduleService.addParticipantToLesson(lessonId, userId);
    
    if (result.success) {
      // Update UI to show user joined
      showSuccess('Derse katıldınız! Kalan ders sayınız: ' + result.remainingClasses);
      // Refresh user's remaining classes in UI
      updateUserRemainingClasses(result.remainingClasses);
    } else {
      showError(result.error);
    }
  } catch (error) {
    showError('Derse katılırken hata oluştu');
  }
}

// When lesson ends (can be automatic or manual)
async function endLesson(lessonId) {
  try {
    const result = await scheduleService.completeLessonAndRecordAttendance(lessonId);
    
    if (result.success) {
      showSuccess(result.message);
      // Optionally show attendance details
      console.log('Attendance results:', result.attendanceResults);
    }
  } catch (error) {
    console.error('Error ending lesson:', error);
  }
}
```

## Benefits

1. **Automatic Sync**: Remaining classes are automatically reduced when users attend
2. **Data Consistency**: Both mobile and web show the same remaining class counts
3. **Audit Trail**: All visits are properly logged with timestamps
4. **Error Handling**: Proper validation and error messages
5. **Flexibility**: Can be used for both individual attendance and bulk lesson completion

## Testing

1. Have a user with remaining classes join a lesson from mobile app
2. Check that their remaining classes are reduced in the web admin panel
3. Complete a lesson and verify all participants' classes are reduced
4. Test with unlimited membership users (should stay at 999)

## Notes

- Unlimited memberships always maintain 999 remaining classes
- Functions work with both `members` and `users` collections
- All operations are logged for debugging
- Failed attendance records are logged but don't fail the entire operation
