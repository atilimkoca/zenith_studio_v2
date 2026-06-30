/**
 * Active-package resolution — backend mirror of
 * `zenithapp_v2/src/services/lessonCreditsService.js` (getActivePackageCredits).
 *
 * Credits and membership expiry are NOT top-level user fields. They live inside
 * `users/{uid}.packages[]`. The "active package" is the most recent package that
 * is currently usable. Both the {kredi} variable, the credit_low threshold and
 * the membership_expiring trigger derive from this single active package — never
 * from the sum across packages (inactive/expired packages may still hold credits
 * that must be ignored).
 */

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Compute the current status of a single package using the same rules as the
 * client (`adminService.getUserPackages` / `lessonCreditsService`).
 */
function packageStatus(pkg, now) {
  const expiryDate = toDate(pkg.expiryDate);
  const startDate = toDate(pkg.startDate);

  if (pkg.status === 'cancelled') return 'cancelled';
  if (expiryDate && expiryDate < now) return 'expired';
  if (startDate && startDate > now) return 'upcoming';
  if ((pkg.remainingLessons || 0) <= 0) return 'depleted';
  return 'active';
}

/**
 * Returns the user's current active package (most recent active by startDate),
 * or null if none is active.
 */
function getActivePackage(userData, now = new Date()) {
  const packages = (userData && userData.packages) || [];

  const active = packages
    .map((pkg) => ({ ...pkg, status: packageStatus(pkg, now) }))
    .filter((pkg) => pkg.status === 'active')
    .sort((a, b) => {
      const da = toDate(a.startDate);
      const db = toDate(b.startDate);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

  return active[0] || null;
}

/** Remaining lessons of the active package, or 0 when no active package. */
function getActivePackageCredits(userData, now = new Date()) {
  const pkg = getActivePackage(userData, now);
  return pkg ? (pkg.remainingLessons || 0) : 0;
}

module.exports = { getActivePackage, getActivePackageCredits, packageStatus, toDate };
