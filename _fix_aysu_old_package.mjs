// One-off data fix (2026-11-11). Dry run by default; pass --apply to write.
//
// Aysu Ceran's cancelled 2026-11-10 20:00 booking was refunded to her old,
// already used-up package (expired 2026-11-10) instead of the new one it was
// charged to. The admin has already given the credit back on the new package,
// so the stray credit left on the old package is set to 0 here and the
// root-level totals are recomputed (they still count it: 5 instead of 4).
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, runTransaction } from 'firebase/firestore';
import { computeTotalRemaining } from './src/services/packageMath.js';

process.loadEnvFile('.env');

const USER_ID = 'F1KQD8DDoXTgabJomgkcd4B58jK2';
const OLD_PACKAGE_ID = 'pkg_1791293863517_8fgttb2ey';
const EXPECTED_REFUND_NOTE = 'Ders iptali: Grup Reformer - 2026-11-10';
const APPLY = process.argv.includes('--apply');

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const summary = (data) => ({
  remainingClasses: data.remainingClasses,
  lessonCredits: data.lessonCredits,
  'packageInfo.remainingClasses': data.packageInfo?.remainingClasses,
  packages: (data.packages || []).map((p) => `${p.id}: ${p.remainingLessons}/${p.totalLessons} (${p.startDate?.slice(0, 10)} → ${p.expiryDate?.slice(0, 10)})`),
});

const main = async () => {
  const userRef = doc(db, 'users', USER_ID);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('User document not found');
    const data = snap.data();
    const packages = Array.isArray(data.packages) ? data.packages : [];
    const oldPkg = packages.find((p) => p.id === OLD_PACKAGE_ID);

    // Refuse to touch anything that does not look exactly like the case we analysed.
    if (!oldPkg) throw new Error('Old package not found');
    if (oldPkg.remainingLessons !== 1) throw new Error(`Old package remainingLessons is ${oldPkg.remainingLessons}, expected 1`);
    if (oldPkg.lastRefundFor !== EXPECTED_REFUND_NOTE) throw new Error(`Unexpected lastRefundFor: ${oldPkg.lastRefundFor}`);
    if (!(new Date(oldPkg.expiryDate) < new Date())) throw new Error('Old package has not expired yet');

    const fixedAt = new Date().toISOString();
    const updatedPackages = packages.map((p) => (p.id === OLD_PACKAGE_ID
      ? {
        ...p,
        remainingLessons: 0,
        correctedAt: fixedAt,
        correctionNote: 'İptal iadesi yanlış (eski) pakete yazılmıştı; kredi yeni pakete elle verildi, bu kayıt sıfırlandı.',
      }
      : p));
    const total = computeTotalRemaining(updatedPackages, { excludeExpired: false });
    const update = {
      packages: updatedPackages,
      remainingClasses: total,
      lessonCredits: total,
      updatedAt: fixedAt,
    };
    if (data.packageInfo) update['packageInfo.remainingClasses'] = total;

    if (APPLY) tx.update(userRef, update);
    return {
      before: summary(data),
      after: summary({ ...data, ...update, packageInfo: { ...data.packageInfo, remainingClasses: total } }),
    };
  });

  console.log(APPLY ? '\n✅ APPLIED' : '\n🔎 DRY RUN (nothing written; add --apply to write)');
  console.log('\nBefore:', JSON.stringify(result.before, null, 2));
  console.log('\nAfter: ', JSON.stringify(result.after, null, 2));
  process.exit(0);
};

main().catch((e) => { console.error('\n❌ Nothing written:', e.code || '', e.message); process.exit(1); });
