import { collection, doc, getDoc, getDocs, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_RULES, SAMPLE_VARS, renderTemplate, validateTemplate } from '../utils/notificationRules';

const COLLECTION = 'notificationRules';

/**
 * Service for managing automatic notification rules (web admin).
 * Reads/writes the Firestore `notificationRules` collection — the same data the
 * mobile admin and Cloud Functions use. Missing rules fall back to DEFAULT_RULES.
 */
const notificationRulesService = {
  async getRules() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION));
      const stored = {};
      snapshot.forEach((d) => {
        stored[d.id] = d.data();
      });
      const rules = Object.keys(DEFAULT_RULES).map((type) => ({
        ...DEFAULT_RULES[type],
        ...(stored[type] || {}),
        ruleType: type,
      }));
      return { success: true, rules };
    } catch (error) {
      console.error('❌ Error getting notification rules:', error);
      return { success: false, error: error.code, rules: [] };
    }
  },

  async getRule(ruleType) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, ruleType));
      const base = DEFAULT_RULES[ruleType] || { ruleType };
      return { success: true, rule: { ...base, ...(snap.exists() ? snap.data() : {}), ruleType } };
    } catch (error) {
      console.error('❌ Error getting notification rule:', error);
      return { success: false, error: error.code, rule: DEFAULT_RULES[ruleType] };
    }
  },

  async updateRule(ruleType, data, updatedBy) {
    try {
      const payload = {
        ...data,
        ruleType,
        updatedAt: new Date().toISOString(),
        ...(updatedBy && { updatedBy }),
      };
      await setDoc(doc(db, COLLECTION, ruleType), payload, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating notification rule:', error);
      return { success: false, error: error.code, message: 'Kural kaydedilemedi.' };
    }
  },

  async toggleRule(ruleType, enabled, updatedBy) {
    return this.updateRule(ruleType, { enabled }, updatedBy);
  },

  /**
   * Send a test notification of this rule to the current admin's own account.
   * Writes a `notifications` document targeted at the admin uid; the existing
   * sendPushNotification Cloud Function delivers it to the admin's registered
   * (mobile) device and it also appears in their in-app list. Never reaches
   * real members.
   */
  async sendTest(rule, adminUserId, lang = 'tr', useCancelTemplate = false) {
    try {
      const template = useCancelTemplate && rule.cancelTemplate ? rule.cancelTemplate : rule.template;
      const { title, body } = renderTemplate(template, lang, SAMPLE_VARS);
      await addDoc(collection(db, 'notifications'), {
        title: `[TEST] ${title}`,
        message: body,
        type: rule.ruleType,
        recipients: adminUserId,
        userId: adminUserId,
        priority: rule.priority || 'normal',
        isRead: false,
        automatic: true,
        test: true,
        ruleType: rule.ruleType,
        createdAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return { success: false, error: error.message };
    }
  },

  validateTemplate,
};

export default notificationRulesService;
