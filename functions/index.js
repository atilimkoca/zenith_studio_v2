const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Recipient keywords understood by getPushTokens. Anything else is treated as a
// specific target user id (single-user push).
const RECIPIENT_KEYWORDS = ['all', 'active', 'pending', 'user'];

// Automatic (rule-based) notification functions.
const autoNotifications = require('./autoNotifications');
exports.processScheduledNotifications = autoNotifications.processScheduledNotifications;
exports.onUserWriteCreditLow = autoNotifications.onUserWriteCreditLow;
exports.onBookingCreated = autoNotifications.onBookingCreated;
exports.cleanupOldNotifications = autoNotifications.cleanupOldNotifications;

/**
 * Cloud Function to send push notifications via Expo
 * Triggered when a new notification document is created in Firestore
 */
exports.sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    const notificationId = context.params.notificationId;

    console.log('📬 New notification created:', notificationId, notification);

    // Skip if already processed or no push needed
    if (notification.pushSent || notification.source === 'local-only') {
      console.log('⏭️ Skipping - already processed or local-only');
      return null;
    }

    try {
      // Get push tokens based on recipients
      const tokens = await getPushTokens(notification.recipients);

      if (tokens.length === 0) {
        console.log('⚠️ No push tokens found');
        await snap.ref.update({
          pushSent: true,
          pushResult: 'no_tokens',
          pushAttemptedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      console.log(`📱 Sending to ${tokens.length} devices`);

      // Send push notifications
      const messages = tokens.map(token => ({
        to: token,
        title: notification.title || 'Zenith Studio',
        body: notification.message || '',
        data: {
          notificationId: notificationId,
          type: notification.type || 'general',
          source: 'cloud-function'
        },
        sound: 'default',
        badge: 1,
        priority: 'high'
      }));

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messages)
      });

      const result = await response.json();
      const success = response.ok && !result.errors;

      console.log('📤 Push result:', success ? 'SUCCESS' : 'FAILED', result);

      // Update notification document with push result
      await snap.ref.update({
        pushSent: true,
        pushSuccess: success,
        pushResult: result,
        pushTokenCount: tokens.length,
        pushAttemptedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success, tokenCount: tokens.length };

    } catch (error) {
      console.error('❌ Error sending push:', error);

      await snap.ref.update({
        pushSent: true,
        pushSuccess: false,
        pushError: error.message,
        pushAttemptedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: false, error: error.message };
    }
  });

/**
 * HTTP callable function to send push notifications (alternative to Firestore trigger)
 */
exports.sendPush = functions.https.onCall(async (data, context) => {
  const { title, message, type, recipients, tokens: providedTokens } = data;

  console.log('📬 sendPush called:', { title, message, type, recipients });

  try {
    // Use provided tokens or fetch from Firestore
    const tokens = providedTokens || await getPushTokens(recipients);

    if (tokens.length === 0) {
      return { success: false, error: 'No push tokens found' };
    }

    const messages = tokens.map(token => ({
      to: token,
      title: title || 'Zenith Studio',
      body: message || '',
      data: {
        type: type || 'general',
        source: 'cloud-function-callable'
      },
      sound: 'default',
      badge: 1,
      priority: 'high'
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    });

    const result = await response.json();
    const success = response.ok && !result.errors;

    console.log('📤 Push result:', success ? 'SUCCESS' : 'FAILED');

    return { success, tokenCount: tokens.length, result };

  } catch (error) {
    console.error('❌ Error in sendPush:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Helper function to get push tokens from Firestore
 */
async function getPushTokens(recipientFilter = 'all') {
  try {
    const db = admin.firestore();

    // Per-user target: any recipient that isn't a known keyword is a user id.
    // Return just that user's token (used by automatic per-user notifications).
    if (recipientFilter && !RECIPIENT_KEYWORDS.includes(recipientFilter)) {
      const userDoc = await db.collection('users').doc(recipientFilter).get();
      if (!userDoc.exists) return [];
      const data = userDoc.data();
      if (data.notificationsEnabled === false) return [];
      return data.pushToken ? [data.pushToken] : [];
    }

    let query = db.collection('users').where('notificationsEnabled', '==', true);

    const snapshot = await query.get();
    const tokens = [];
    const seen = new Set();

    snapshot.forEach(doc => {
      const data = doc.data();
      const token = data.pushToken;

      if (!token || seen.has(token)) return;

      // Filter by status if needed
      if (recipientFilter === 'active') {
        if (data.status && data.status !== 'approved' && data.status !== 'active') return;
      } else if (recipientFilter === 'pending') {
        if (data.status && data.status !== 'pending') return;
      }

      seen.add(token);
      tokens.push(token);
    });

    console.log(`📱 Found ${tokens.length} push tokens for filter: ${recipientFilter}`);
    return tokens;

  } catch (error) {
    console.error('❌ Error getting push tokens:', error);
    return [];
  }
}
