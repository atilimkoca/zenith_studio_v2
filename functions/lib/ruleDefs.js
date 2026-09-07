/**
 * Shared definitions for the automatic notification system.
 *
 * These constants describe the 4 predefined automatic notification rule types,
 * their default settings and default bilingual (TR/EN) message templates.
 *
 * The same rule shape is read/written by the admin panels (mobile + web) into
 * the Firestore `notificationRules` collection (one document per ruleType,
 * docId === ruleType) and consumed by the Cloud Functions here.
 */

const RULE_TYPES = {
  LESSON_REMINDER: 'lesson_reminder',
  MEMBERSHIP_EXPIRING: 'membership_expiring',
  CREDIT_LOW: 'credit_low',
  BOOKING_CONFIRMATION: 'booking_confirmation',
  TRAINER_BOOKING: 'trainer_booking',
};

// Supported template variables. Used for documentation/validation only.
const TEMPLATE_VARIABLES = ['isim', 'ders', 'saat', 'tarih', 'kredi', 'ogrenci'];

const DEFAULT_RULES = {
  [RULE_TYPES.LESSON_REMINDER]: {
    ruleType: RULE_TYPES.LESSON_REMINDER,
    enabled: false,
    offsetsHours: [24, 2],
    priority: 'high',
    template: {
      tr: { title: 'Ders Hatırlatması', body: '{isim}, {ders} dersin {saat}\'da başlıyor.' },
      en: { title: 'Class Reminder', body: '{isim}, your {ders} class starts at {saat}.' },
    },
  },
  [RULE_TYPES.MEMBERSHIP_EXPIRING]: {
    ruleType: RULE_TYPES.MEMBERSHIP_EXPIRING,
    enabled: false,
    offsetsDays: [7, 3, 1],
    priority: 'high',
    template: {
      tr: { title: 'Üyeliğin Bitiyor', body: '{isim}, paketinin süresi {tarih} tarihinde doluyor.' },
      en: { title: 'Membership Expiring', body: '{isim}, your package expires on {tarih}.' },
    },
  },
  [RULE_TYPES.CREDIT_LOW]: {
    ruleType: RULE_TYPES.CREDIT_LOW,
    enabled: false,
    threshold: 2,
    priority: 'normal',
    template: {
      tr: { title: 'Kredin Azaldı', body: '{isim}, aktif paketinde {kredi} ders hakkın kaldı.' },
      en: { title: 'Low Credits', body: '{isim}, you have {kredi} classes left in your active package.' },
    },
  },
  [RULE_TYPES.BOOKING_CONFIRMATION]: {
    ruleType: RULE_TYPES.BOOKING_CONFIRMATION,
    enabled: false,
    priority: 'normal',
    template: {
      tr: {
        title: 'Rezervasyon Onayı',
        body: '{isim}, {tarih} {saat} {ders} dersine kaydın alındı.',
      },
      en: {
        title: 'Booking Confirmed',
        body: '{isim}, you are booked for {ders} on {tarih} at {saat}.',
      },
    },
    cancelTemplate: {
      tr: { title: 'Rezervasyon İptali', body: '{isim}, {tarih} {saat} {ders} dersi rezervasyonun iptal edildi.' },
      en: { title: 'Booking Cancelled', body: '{isim}, your booking for {ders} on {tarih} at {saat} was cancelled.' },
    },
  },
  // Goes to the lesson's trainer (lessons/{id}.trainerId), not to the member.
  // {isim} is the trainer, {ogrenci} the member who joined. On by default so the
  // trainer is informed from the moment this ships; toggle it in the admin panel.
  [RULE_TYPES.TRAINER_BOOKING]: {
    ruleType: RULE_TYPES.TRAINER_BOOKING,
    enabled: true,
    priority: 'normal',
    template: {
      tr: {
        title: 'Derse Yeni Rezervasyon',
        body: '{tarih} {saat} {ders} dersinize {ogrenci} rezervasyon yaptı.',
      },
      en: {
        title: 'New Class Booking',
        body: '{ogrenci} booked your {ders} class on {tarih} at {saat}.',
      },
    },
  },
};

module.exports = { RULE_TYPES, TEMPLATE_VARIABLES, DEFAULT_RULES };
