// Read-only inspection script (temporary). Does not write anything.
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

// Node 20.12+ reads .env natively; no dotenv dependency needed.
process.loadEnvFile('.env');

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const needle = (process.argv[2] || 'aysu').toLocaleLowerCase('tr');

const main = async () => {
  for (const col of ['users', 'members']) {
    const snap = await getDocs(collection(db, col));
    const hits = snap.docs.filter((d) => {
      const x = d.data();
      const name = [x.displayName, x.firstName, x.lastName, x.name, x.fullName].filter(Boolean).join(' ');
      return name.toLocaleLowerCase('tr').includes(needle);
    });
    console.log(`\n=== ${col}: ${snap.size} docs, ${hits.length} hits ===`);
    for (const d of hits) {
      const x = d.data();
      console.log(JSON.stringify({
        id: d.id,
        name: [x.displayName, x.firstName, x.lastName].filter(Boolean).join(' | '),
        role: x.role,
        status: x.status,
        membershipStatus: x.membershipStatus,
        remainingClasses: x.remainingClasses,
        lessonCredits: x.lessonCredits,
        packageInfo: x.packageInfo,
        packageStartDate: x.packageStartDate,
        packageExpiryDate: x.packageExpiryDate,
        packages: x.packages,
        updatedAt: x.updatedAt,
      }, null, 2));
    }
  }
  process.exit(0);
};

main().catch((e) => { console.error('ERR', e.code || e.message); process.exit(1); });
