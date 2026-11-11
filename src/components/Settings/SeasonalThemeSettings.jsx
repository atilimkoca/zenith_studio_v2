// Ayarlar → Kış Teması
//
// Turns the mobile app's winter theme (falling snow + snow on cards) on or off
// for everyone. Stored in Firestore appConfig/seasonalTheme as
// { enabled, endsAt: 'YYYY-MM-DD' | null }; the app listens live, so changes
// show up without a new release. The end day is included.
import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const todayKey = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const formatDay = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const SeasonalThemeSettings = ({ currentUser, showNotification }) => {
  const [enabled, setEnabled] = useState(false);
  const [endsAt, setEndsAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, 'appConfig', 'seasonalTheme'))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        const data = snap.data();
        setEnabled(data.enabled === true);
        setEndsAt(typeof data.endsAt === 'string' ? data.endsAt : '');
      })
      .catch((error) => console.error('Error loading seasonal theme config:', error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'appConfig', 'seasonalTheme'), {
        enabled,
        endsAt: endsAt || null,
        updatedAt: new Date(),
        updatedBy: currentUser?.uid || null,
      });
      showNotification(enabled ? 'Kış teması açıldı' : 'Kış teması kapatıldı', 'success');
    } catch (error) {
      console.error('Error saving seasonal theme config:', error);
      showNotification('Kış teması kaydedilirken hata oluştu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const ended = enabled && endsAt && endsAt < todayKey();
  let status = 'Kapalı — uygulamada kar görünmüyor.';
  if (enabled && ended) status = `Bitiş tarihi geçti (${formatDay(endsAt)}) — uygulamada kar görünmüyor.`;
  else if (enabled && endsAt) status = `Açık — ${formatDay(endsAt)} gün sonuna kadar kar yağıyor.`;
  else if (enabled) status = 'Açık — siz kapatana kadar kar yağıyor.';

  return (
    <div className="app-version-section">
      <div className="section-header">
        <h2>Kış Teması</h2>
        <p>Mobil uygulamada yağan kar ve kartların üstündeki kar birikintisi</p>
      </div>

      <div className="version-info-card">
        <div className="info-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <div className="info-content">
          <strong>{loading ? 'Yükleniyor…' : status}</strong>
          <p>Değişiklik kaydedildiği anda tüm kullanıcılarda geçerli olur; yeni sürüm gerekmez. Telefonunda "Hareketi Azalt" açık olanlarda kar yağmaz, birikintiler sabit görünür.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="app-version-form">
        <div className="form-group toggle-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={enabled}
              disabled={loading}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span className="toggle-switch"></span>
            <span className="toggle-text">
              <strong>Kış temasını aç</strong>
              <small>Ana Sayfa, Ders Seç, Derslerim ve Profil ekranlarında kar yağar</small>
            </span>
          </label>
        </div>

        <div className="form-group">
          <label>
            <span className="label-icon">📅</span>
            Bitiş Tarihi (isteğe bağlı)
          </label>
          <input
            type="date"
            value={endsAt}
            disabled={loading}
            onChange={(e) => setEndsAt(e.target.value)}
          />
          <small>Bu günün sonunda tema kendiliğinden kapanır. Boş bırakırsanız siz kapatana kadar açık kalır.</small>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-button" disabled={loading || saving}>
            {saving ? (
              <>
                <div className="button-spinner"></div>
                Kaydediliyor...
              </>
            ) : (
              'Kaydet'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SeasonalThemeSettings;
