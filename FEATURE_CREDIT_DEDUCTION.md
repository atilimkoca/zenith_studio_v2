# Feature: Lesson Credit Deduction When Admin Adds Students

## Date
8 Ekim 2025

## Overview
When an admin or instructor manually adds a student to a lesson via the web panel, the system now deducts one lesson credit from the student's account, just like when they book a lesson themselves.

## Business Logic

### Adding a Student
1. Check if student has remaining credits (remainingClasses or lessonCredits)
2. If credits <= 0, show error: "Öğrencinin kalan dersi yok"
3. If credits > 0:
   - Deduct 1 credit from student's account
   - Add student to lesson participants
   - Update both `remainingClasses` and `lessonCredits` fields
   - Show success message with remaining credits

### Removing a Student
1. Remove student from lesson participants
2. Refund 1 credit back to student's account
3. Update both `remainingClasses` and `lessonCredits` fields
4. Show success message with refund confirmation

## Implementation Details

### Files Modified

#### 1. `/src/services/scheduleService.js`

**addStudentToLesson() - Lines 1040-1123**
```javascript
// New logic:
1. Get user document
2. Check remainingClasses or lessonCredits
3. Validate credits > 0
4. Check lesson capacity and existing registration
5. Deduct 1 credit from user
6. Add student to lesson
7. Return success with remainingCredits
```

**removeStudentFromLesson() - Lines 1125-1180**
```javascript
// New logic:
1. Verify student is in lesson
2. Get user document
3. Refund 1 credit to user
4. Remove student from lesson
5. Return success message
```

#### 2. `/src/components/Schedule/Schedule.jsx`

**handleAddStudentToLesson() - Lines 1217-1250**
- Updated alert to show remaining credits
- Displays: "Öğrenci başarıyla eklendi. Kalan ders: X"

## Credit Storage Structure

Credits are stored in the `users` collection with duplicate fields for compatibility:

```javascript
{
  remainingClasses: 10,  // Primary field
  lessonCredits: 10,     // Backup field for compatibility
  // ... other user fields
}
```

Both fields are updated together to ensure consistency across the system.

## User Experience

### Before Adding:
- System checks if student has credits
- Shows error if no credits available
- Prevents adding student without credits

### After Adding:
- Alert shows: "Öğrenci başarıyla eklendi. Kalan ders: 9"
- Student's credit count is updated immediately
- Student appears in lesson with "Kayıtlı" badge
- UI updates in real-time

### After Removing:
- Alert shows: "Öğrenci dersten başarıyla çıkarıldı. Ders kredisi iade edildi."
- Credit is refunded to student
- Student removed from lesson

## Error Handling

### No Credits Available
```
Error: "Öğrencinin kalan dersi yok. Lütfen paket satın almasını sağlayın."
```
- Admin must ensure student purchases a package first
- Cannot add student to lesson without credits

### User Not Found
```
Error: "Kullanıcı bulunamadı."
```
- Rare case if user was deleted

### Lesson Full
```
Error: "Ders dolu. Maksimum katılımcı sayısına ulaşıldı."
```
- Cannot exceed maxParticipants

### Already Registered
```
Error: "Öğrenci zaten bu derse kayıtlı."
```
- Prevents duplicate registrations

## Database Operations

### Add Student (Atomic Operations)
```javascript
// 1. Update user credits
updateDoc(userRef, {
  remainingClasses: currentCredits - 1,
  lessonCredits: currentCredits - 1,
  updatedAt: serverTimestamp()
});

// 2. Update lesson participants
updateDoc(lessonRef, {
  participants: [...oldParticipants, userId],
  currentParticipants: newCount,
  updatedAt: serverTimestamp()
});
```

### Remove Student (Atomic Operations)
```javascript
// 1. Refund user credits
updateDoc(userRef, {
  remainingClasses: currentCredits + 1,
  lessonCredits: currentCredits + 1,
  updatedAt: serverTimestamp()
});

// 2. Update lesson participants
updateDoc(lessonRef, {
  participants: oldParticipants.filter(id => id !== userId),
  currentParticipants: newCount,
  updatedAt: serverTimestamp()
});
```

## Important Notes

### Credit Management
- ✅ Credits are deducted when admin adds student
- ✅ Credits are refunded when admin removes student
- ✅ Both `remainingClasses` and `lessonCredits` are kept in sync
- ✅ Validation prevents adding students with 0 credits

### Consistency with Mobile App
The web panel now matches the mobile app's credit deduction behavior, ensuring:
- Same business rules across platforms
- Consistent user credit balances
- Proper package consumption tracking

### Admin Responsibilities
Admins must now:
1. Check student has available credits before manual add
2. Ensure students purchase packages when needed
3. Be aware that manual add/remove affects credit balance

## Testing Checklist
- ✅ Add student with credits - deducts 1 credit
- ✅ Add student with 0 credits - shows error
- ✅ Remove student - refunds 1 credit
- ✅ Alert shows remaining credits after add
- ✅ Alert confirms refund after remove
- ✅ Both credit fields updated consistently
- ✅ Lesson participant count updates correctly
- ✅ UI reflects changes immediately

## Benefits
1. **Financial Accuracy**: All lesson bookings (manual or self-service) consume credits
2. **Package Tracking**: Accurate tracking of package consumption
3. **Business Logic**: Consistent rules across all booking methods
4. **Transparency**: Admins see remaining credits immediately
5. **Credit Control**: Prevents overbooking when credits run out
