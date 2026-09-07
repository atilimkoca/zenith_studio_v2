// Firebase wiring for the transactional booking core (admin web app).
//
// Every seat change in `lessons.participants` and the matching credit change in
// the member document go through these functions so they happen in ONE
// Firestore transaction. See bookingCore.js for the logic and packageMath.js
// for the credit rules.

import { runTransaction, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createBookingCore, BookingError } from './bookingCore.js';

const core = createBookingCore({
  runTransaction,
  doc,
  arrayUnion,
  arrayRemove,
  db,
  lessonsCollection: 'lessons',
  // The admin app keeps members in `members/` and falls back to `users/`.
  userCollections: ['members', 'users'],
  // The admin app counts every non-cancelled package toward the total.
  excludeExpired: false,
  // The admin app has always maintained the denormalised `currentParticipants`.
  writeParticipantCount: true,
});

export { BookingError };
export const isBookingError = (error) => error instanceof BookingError;

export const joinLessonAtomically = core.joinLesson;
export const leaveLessonAtomically = core.leaveLesson;
export const cancelLessonWithRefunds = core.cancelLesson;
export const deleteLessonWithRefunds = core.deleteLesson;
