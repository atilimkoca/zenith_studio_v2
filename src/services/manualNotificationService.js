import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import dashboardService from './dashboardService';
import { resolveRecipients, classifyUser } from '../utils/recipientResolver';

const BATCH_SIZE = 450; // < Firestore's 500-write limit, leaves headroom

/**
 * Manual notification sending with segment/individual targeting (web admin).
 *
 * - mode 'all'  → existing broadcast (dashboardService.sendNotification, recipients:'all').
 * - otherwise   → resolve to a userId set, then write one per-user notification
 *   document per recipient (batched). The existing sendPushNotification Cloud
 *   Function delivers each to its user via the per-user push path.
 */
const manualNotificationService = {
  async getAudience() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const users = [];
      snap.forEach((d) => {
        const data = d.data();
        users.push({
          id: d.id,
          firstName: data.firstName,
          lastName: data.lastName,
          displayName: data.displayName,
          email: data.email,
          role: data.role,
          status: data.status,
          packages: data.packages,
          _class: classifyUser(data),
        });
      });
      return { success: true, users };
    } catch (error) {
      console.error('❌ Error loading audience:', error);
      return { success: false, error: error.code, users: [] };
    }
  },

  /**
   * @param spec     targeting spec (see recipientResolver)
   * @param content  { title, message, type, priority }
   * @param audience optional pre-fetched user list
   */
  async send(spec, content, audience = null) {
    try {
      const users = audience || (await this.getAudience()).users;
      const resolved = resolveRecipients(spec, users);

      const title = (content.title || '').trim();
      const message = (content.message || '').trim();
      if (!title || !message) {
        return { success: false, message: 'Başlık ve mesaj zorunludur.' };
      }

      if (resolved.mode === 'all') {
        const res = await dashboardService.sendNotification({
          title,
          message,
          type: content.type || 'general',
          priority: content.priority || 'normal',
          recipients: 'all',
        });
        return { success: res.success, count: resolved.count, message: res.message };
      }

      if (resolved.userIds.length === 0) {
        return { success: false, count: 0, message: 'Bu kritere uyan kullanıcı yok.' };
      }

      let written = 0;
      let failed = 0;
      for (let i = 0; i < resolved.userIds.length; i += BATCH_SIZE) {
        const chunk = resolved.userIds.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((userId) => {
          const ref = doc(collection(db, 'notifications'));
          batch.set(ref, {
            title,
            message,
            type: content.type || 'general',
            priority: content.priority || 'normal',
            recipients: userId,
            userId,
            isRead: false,
            source: 'web-admin',
            pushSent: false,
            createdAt: serverTimestamp(),
          });
        });
        try {
          await batch.commit();
          written += chunk.length;
        } catch (err) {
          console.error('❌ Batch send failed:', err);
          failed += chunk.length;
        }
      }

      return {
        success: written > 0,
        count: written,
        failed,
        message:
          failed > 0
            ? `${written} kişiye gönderildi, ${failed} kişide hata oluştu.`
            : `${written} kişiye gönderildi.`,
      };
    } catch (error) {
      console.error('❌ Error sending manual notification:', error);
      return { success: false, message: 'Bildirim gönderilemedi: ' + error.message };
    }
  },

  resolveRecipients,
};

export default manualNotificationService;
