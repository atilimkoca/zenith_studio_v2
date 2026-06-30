// Recipient selector for manual notifications (web admin)
import React, { useMemo, useState } from 'react';
import './RecipientSelector.css';
import { resolveRecipients } from '../../utils/recipientResolver';

const TABS = [
  { key: 'all', label: 'Herkes', icon: '👥' },
  { key: 'segment', label: 'Segment', icon: '🎯' },
  { key: 'individuals', label: 'Kişi seç', icon: '➕' },
];

const STATUS_FILTERS = [
  { key: 'active', label: 'Aktif' },
  { key: 'pending', label: 'Onay bekleyen' },
  { key: 'passive', label: 'Pasif' },
];
const PACKAGE_FILTERS = [
  { key: 'group', label: 'Grup dersi' },
  { key: 'one-on-one', label: 'Birebir' },
];
const ROLE_FILTERS = [
  { key: 'member', label: 'Üye' },
  { key: 'trainer', label: 'Eğitmen' },
  { key: 'admin', label: 'Yönetici' },
];
const STATUS_LABEL = { active: 'Aktif', pending: 'Onayda', passive: 'Pasif' };

const userName = (u) =>
  u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'İsimsiz';

const FilterRow = ({ label, options, selected, onPick }) => (
  <div className="rs-filter-row">
    <span className="rs-filter-label">{label}</span>
    <div className="rs-chips">
      {options.map((o) => (
        <button
          type="button"
          key={o.key}
          className={`rs-chip ${selected === o.key ? 'active' : ''}`}
          onClick={() => onPick(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const RecipientSelector = ({ audience = [], spec, onChange }) => {
  const mode = spec?.mode || 'all';
  const filters = spec?.filters || {};
  const selectedIds = spec?.userIds || [];
  const [search, setSearch] = useState('');

  const resolved = useMemo(() => resolveRecipients(spec, audience), [spec, audience]);

  const setMode = (m) => {
    if (m === 'all') onChange({ mode: 'all' });
    else if (m === 'segment') onChange({ mode: 'segment', filters });
    else onChange({ mode: 'individuals', userIds: selectedIds });
  };

  const toggleFilter = (group, key) => {
    const next = { ...filters };
    if (next[group] === key) delete next[group];
    else next[group] = key;
    onChange({ mode: 'segment', filters: next });
  };

  const toggleUser = (id) => {
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ mode: 'individuals', userIds: Array.from(set) });
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = audience.filter((u) => u.status !== 'deleted' && u.status !== 'permanently_deleted');
    if (!q) return list.slice(0, 80);
    return list
      .filter((u) => userName(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      .slice(0, 80);
  }, [audience, search]);

  return (
    <div className="rs-root">
      <div className="rs-tabs">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.key}
            className={`rs-tab ${mode === t.key ? 'active' : ''}`}
            onClick={() => setMode(t.key)}
          >
            <span className="rs-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'all' && <p className="rs-hint">Tüm kayıtlı üyelere gönderilir.</p>}

      {mode === 'segment' && (
        <div className="rs-box">
          <FilterRow label="Üyelik durumu" options={STATUS_FILTERS} selected={filters.status} onPick={(k) => toggleFilter('status', k)} />
          <FilterRow label="Paket tipi" options={PACKAGE_FILTERS} selected={filters.packageType} onPick={(k) => toggleFilter('packageType', k)} />
          <FilterRow label="Rol" options={ROLE_FILTERS} selected={filters.role} onPick={(k) => toggleFilter('role', k)} />
          <p className="rs-and-note">Seçilen filtreler birlikte (VE) uygulanır.</p>
        </div>
      )}

      {mode === 'individuals' && (
        <div className="rs-box">
          <div className="rs-search">
            <span>🔍</span>
            <input
              type="text"
              placeholder="İsim veya e-posta ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {selectedIds.length > 0 && <span className="rs-sel-count">{selectedIds.length}</span>}
          </div>
          <div className="rs-user-list">
            {filteredUsers.map((u) => {
              const checked = selectedIds.includes(u.id);
              const cls = u._class || {};
              const badge =
                cls.role === 'trainer' ? 'Eğitmen' : cls.role === 'admin' ? 'Yönetici' : STATUS_LABEL[cls.status] || '—';
              return (
                <button type="button" key={u.id} className={`rs-user ${checked ? 'on' : ''}`} onClick={() => toggleUser(u.id)}>
                  <span className={`rs-avatar ${checked ? 'on' : ''}`}>{userName(u).charAt(0).toUpperCase()}</span>
                  <span className="rs-user-text">
                    <span className="rs-user-name">{userName(u)}</span>
                    <span className="rs-user-mail">{u.email || '—'}</span>
                  </span>
                  <span className="rs-badge">{badge}</span>
                  <span className="rs-check">{checked ? '✓' : ''}</span>
                </button>
              );
            })}
            {filteredUsers.length === 0 && <p className="rs-empty">Sonuç yok.</p>}
          </div>
        </div>
      )}

      <div className={`rs-count ${resolved.count === 0 ? 'empty' : ''}`}>
        <span className="rs-count-icon">✉️</span>
        {resolved.count === 0 ? (
          'Bu kritere uyan kullanıcı yok'
        ) : (
          <span>
            Bu bildirim <strong>{resolved.count}</strong> kişiye gidecek
          </span>
        )}
      </div>
    </div>
  );
};

export default RecipientSelector;
