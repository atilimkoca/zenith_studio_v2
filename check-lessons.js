// Simple script to check lessons in the database
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log('🔧 Firebase config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkLessons() {
  try {
    console.log('\n📚 Fetching all lessons from database...\n');
    
    const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
    
    console.log(`✅ Found ${lessonsSnapshot.size} lessons in database\n`);
    
    if (lessonsSnapshot.empty) {
      console.log('⚠️ No lessons found in the database!');
      console.log('You need to create lessons first using the "Sınıf Ekle" button.');
      return;
    }
    
    const lessons = [];
    lessonsSnapshot.forEach((doc) => {
      const data = doc.data();
      lessons.push({
        id: doc.id,
        ...data
      });
    });
    
    // Group by day of week
    const grouped = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    lessons.forEach(lesson => {
      if (lesson.dayOfWeek && grouped[lesson.dayOfWeek]) {
        grouped[lesson.dayOfWeek].push(lesson);
      }
    });
    
    // Display lessons grouped by day
    console.log('📅 Lessons by Day of Week:\n');
    Object.entries(grouped).forEach(([day, dayLessons]) => {
      if (dayLessons.length > 0) {
        console.log(`\n${day.toUpperCase()} (${dayLessons.length} lessons):`);
        dayLessons.forEach(lesson => {
          const scheduledDate = lesson.scheduledDate ? new Date(lesson.scheduledDate).toLocaleDateString('tr-TR') : 'No date';
          console.log(`  - ${lesson.title} | ${lesson.startTime}-${lesson.endTime} | ${scheduledDate} | ID: ${lesson.id}`);
        });
      }
    });
    
    // Check for lessons without scheduled dates
    const lessonsWithoutDate = lessons.filter(l => !l.scheduledDate);
    if (lessonsWithoutDate.length > 0) {
      console.log(`\n⚠️ ${lessonsWithoutDate.length} lessons without scheduledDate (will appear in all weeks):`);
      lessonsWithoutDate.forEach(lesson => {
        console.log(`  - ${lesson.title} (${lesson.dayOfWeek}) | ${lesson.startTime} | ID: ${lesson.id}`);
      });
    }
    
    // Show current week range
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    console.log(`\n📆 Current Week: ${monday.toLocaleDateString('tr-TR')} - ${sunday.toLocaleDateString('tr-TR')}`);
    
    // Check which lessons fall in current week
    const mondayTimestamp = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getTime();
    const sundayTimestamp = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()).getTime();
    
    const currentWeekLessons = lessons.filter(lesson => {
      if (!lesson.scheduledDate) return true; // Legacy lessons appear everywhere
      const lessonDate = new Date(lesson.scheduledDate);
      const lessonTimestamp = new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()).getTime();
      return lessonTimestamp >= mondayTimestamp && lessonTimestamp <= sundayTimestamp;
    });
    
    console.log(`\n✅ ${currentWeekLessons.length} lessons should appear in current week:`);
    currentWeekLessons.forEach(lesson => {
      const scheduledDate = lesson.scheduledDate ? new Date(lesson.scheduledDate).toLocaleDateString('tr-TR') : 'All weeks';
      console.log(`  - ${lesson.title} | ${lesson.dayOfWeek} | ${lesson.startTime} | ${scheduledDate}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkLessons();
