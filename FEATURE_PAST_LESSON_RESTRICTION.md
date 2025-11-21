# Feature: Prevent Adding/Removing Students from Past Lessons

## Date
8 Ekim 2025

## Overview
Admins and instructors can no longer add or remove students from lessons that have already occurred. This prevents accidental modifications to historical lesson data and ensures data integrity.

## Business Logic

### Past Lesson Detection
A lesson is considered "past" when:
- The scheduled date + start time is earlier than the current date/time
- Comparison includes both date AND time for accurate validation

Example:
- Current: October 8, 2025, 15:30
- Lesson: October 8, 2025, 14:00 (start time)
- Result: **Past lesson** ❌ (cannot add/remove students)

- Current: October 8, 2025, 15:30
- Lesson: October 8, 2025, 16:00 (start time)
- Result: **Future lesson** ✅ (can add/remove students)

## Implementation Details

### 1. Service Layer Validation

**File:** `/src/services/scheduleService.js`

#### addStudentToLesson()
```javascript
// Lines 1073-1105
// Check if lesson is in the past
const now = new Date();
if (lessonData.scheduledDate && lessonData.startTime) {
  let lessonDate = new Date(lessonData.scheduledDate);
  const [hours, minutes] = lessonData.startTime.split(':').map(Number);
  lessonDate.setHours(hours, minutes, 0, 0);
  
  if (lessonDate < now) {
    return {
      success: false,
      error: 'Geçmiş bir derse öğrenci eklenemez. Bu ders zaten gerçekleşti.'
    };
  }
}
```

#### removeStudentFromLesson()
```javascript
// Lines 1193-1215
// Check if lesson is in the past
if (lessonDate < now) {
  return {
    success: false,
    error: 'Geçmiş bir dersten öğrenci çıkarılamaz. Bu ders zaten gerçekleşti.'
  };
}
```

### 2. UI Layer Prevention

**File:** `/src/components/Schedule/Schedule.jsx`

#### Helper Function: isLessonInPast()
```javascript
// Lines 1404-1424
const isLessonInPast = (lesson) => {
  if (!lesson.scheduledDate || !lesson.startTime) return false;
  
  const now = new Date();
  let lessonDate = new Date(lesson.scheduledDate);
  const [hours, minutes] = lesson.startTime.split(':').map(Number);
  lessonDate.setHours(hours, minutes, 0, 0);
  
  return lessonDate < now;
};
```

#### Button Disabled for Past Lessons
```javascript
// Lines 2427-2441
<button 
  className="btn btn-success"
  onClick={() => loadStudentsForLesson(selectedLessonForDetail)}
  disabled={isLessonInPast(selectedLessonForDetail)}
  style={{ 
    background: isLessonInPast(selectedLessonForDetail) ? '#ccc' : 'var(--sage-green)', 
    cursor: isLessonInPast(selectedLessonForDetail) ? 'not-allowed' : 'pointer',
    opacity: isLessonInPast(selectedLessonForDetail) ? 0.6 : 1
  }}
  title={isLessonInPast(selectedLessonForDetail) ? 'Geçmiş derse öğrenci eklenemez' : 'Derse öğrenci ekle'}
>
  👥 Öğrenci Ekle
</button>
```

## User Experience

### For Future Lessons (Normal Behavior)
- ✅ "Öğrenci Ekle" button is enabled
- ✅ Green color (sage-green)
- ✅ Normal cursor on hover
- ✅ Can add/remove students
- ✅ "➕ Ekle" button is enabled (in student modal)
- ✅ "🗑️ Çıkar" button is enabled (in both modals)

### For Past Lessons (Restricted)
- 🚫 "Öğrenci Ekle" button is **disabled**
- 🚫 "➕ Ekle" button is **disabled** (in student modal)
- 🚫 "🗑️ Çıkar" button is **disabled** (in both lesson detail and student modal)
- 🚫 Gray color (#ccc)
- 🚫 "not-allowed" cursor
- 🚫 Reduced opacity (50-60%)
- 🚫 Tooltips explain why disabled

### Error Messages

#### Trying to Add Student to Past Lesson
```
Error: "Geçmiş bir derse öğrenci eklenemez. Bu ders zaten gerçekleşti."
```

#### Trying to Remove Student from Past Lesson
```
Error: "Geçmiş bir dersten öğrenci çıkarılamaz. Bu ders zaten gerçekleşti."
```

## Technical Details

### Date Handling
The system handles multiple date formats:
1. **String format**: `"2025-10-08T10:00:00"`
2. **Firestore Timestamp**: Uses `.toDate()` method
3. **Date object**: Direct instantiation

```javascript
if (typeof lessonData.scheduledDate === 'string') {
  lessonDate = new Date(lessonData.scheduledDate);
} else if (lessonData.scheduledDate.toDate) {
  lessonDate = lessonData.scheduledDate.toDate();
} else {
  lessonDate = new Date(lessonData.scheduledDate);
}
```

### Time Parsing
Start time is parsed from "HH:MM" format:
```javascript
const [hours, minutes] = lessonData.startTime.split(':').map(Number);
lessonDate.setHours(hours, minutes, 0, 0);
```

### Comparison
Simple comparison using JavaScript Date objects:
```javascript
if (lessonDateTime < now) {
  // Lesson is in the past
}
```

## Validation Flow

### Add Student Flow
```
1. Check user credits (> 0)
2. Get lesson data
3. ⭐ Check if lesson is in past → STOP if true
4. Check lesson capacity
5. Check duplicate registration
6. Deduct credit
7. Add to participants
```

### Remove Student Flow
```
1. Get lesson data
2. ⭐ Check if lesson is in past → STOP if true
3. Check student is registered
4. Refund credit
5. Remove from participants
```

## UI States

### Button States - "Öğrenci Ekle" (Main Button)
| Condition | Enabled | Color | Cursor | Opacity | Tooltip |
|-----------|---------|-------|--------|---------|---------|
| Future lesson | ✅ Yes | Green | pointer | 1.0 | "Derse öğrenci ekle" |
| Past lesson | ❌ No | Gray | not-allowed | 0.6 | "Geçmiş derse öğrenci eklenemez" |

### Button States - "➕ Ekle" (Add Student in Modal)
| Condition | Enabled | Color | Cursor | Opacity | Tooltip |
|-----------|---------|-------|--------|---------|---------|
| Future lesson + capacity | ✅ Yes | Green | pointer | 1.0 | "Öğrenciyi derse ekle" |
| Past lesson | ❌ No | Gray | not-allowed | 0.6 | "Geçmiş derse öğrenci eklenemez" |
| Lesson full | ❌ No | Gray | not-allowed | 0.6 | "Ders dolu" |

### Button States - "🗑️ Çıkar" (Remove Student)
| Condition | Enabled | Color | Cursor | Opacity | Tooltip |
|-----------|---------|-------|--------|---------|---------|
| Future lesson | ✅ Yes | Red | pointer | 1.0 | "Katılımcıyı dersten çıkar" / "Öğrenciyi dersten çıkar" |
| Past lesson | ❌ No | Gray | not-allowed | 0.5 | "Geçmiş dersten öğrenci çıkarılamaz" |

## Benefits

### Data Integrity
- ✅ Prevents accidental modification of historical data
- ✅ Maintains accurate lesson attendance records
- ✅ Preserves booking history integrity

### Business Logic
- ✅ Cannot retroactively add students to completed lessons
- ✅ Cannot remove students from past lessons (affects reports)
- ✅ Credit transactions remain consistent with actual attendance

### User Experience
- ✅ Clear visual feedback (disabled button)
- ✅ Helpful tooltip explains why button is disabled
- ✅ Prevents confusion and mistakes
- ✅ Maintains trust in system data

### Compliance
- ✅ Audit trail remains intact
- ✅ Historical records cannot be altered
- ✅ Reporting data stays accurate

## Edge Cases Handled

### 1. Same Day, Past Time
- Current: October 8, 14:00
- Lesson: October 8, 10:00
- Result: ✅ Correctly identified as past lesson

### 2. Same Day, Future Time
- Current: October 8, 10:00
- Lesson: October 8, 14:00
- Result: ✅ Correctly identified as future lesson

### 3. Missing Date/Time
- If `scheduledDate` or `startTime` is missing
- Result: ✅ Allows action (fail-safe for data issues)

### 4. Different Time Zones
- Uses local system time for comparison
- Result: ✅ Consistent with user's timezone

## Testing Checklist

### Main "Öğrenci Ekle" Button
- ✅ Future lesson - button enabled, can open modal
- ✅ Past lesson - button disabled, shows tooltip
- ✅ Same day future lesson - button enabled
- ✅ Same day past lesson - button disabled

### Student Modal - Add/Remove Buttons
- ✅ Future lesson - "➕ Ekle" button enabled
- ✅ Past lesson - "➕ Ekle" button disabled
- ✅ Future lesson - "🗑️ Çıkar" button enabled for enrolled students
- ✅ Past lesson - "🗑️ Çıkar" button disabled for enrolled students
- ✅ Lesson full - "➕ Ekle" button disabled (separate validation)

### Lesson Detail Modal - Remove Button
- ✅ Future lesson - "🗑️ Çıkar" button enabled in participant list
- ✅ Past lesson - "🗑️ Çıkar" button disabled in participant list
- ✅ Tooltip shows correct message for disabled state

### API Level
- ✅ Try adding to past lesson via API - error returned
- ✅ Try removing from past lesson via API - error returned
- ✅ Error messages clear and informative

### Visual Feedback
- ✅ UI provides visual feedback (gray color, reduced opacity)
- ✅ Tooltip appears on hover for disabled buttons
- ✅ Cursor changes to "not-allowed" for disabled buttons

## Future Enhancements (Optional)

1. **Grace Period**: Allow modifications within X minutes after lesson
2. **Admin Override**: Special permission to modify past lessons
3. **Audit Log**: Track all attempted modifications to past lessons
4. **Time Zone Support**: Explicit timezone handling
5. **Visual Indicator**: Show "PAST" badge on past lessons in schedule grid
