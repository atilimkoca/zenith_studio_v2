// Automatic Notifications management (web admin)
import React, { useEffect, useState } from 'react';
import './AutoNotifications.css';
import notificationRulesService from '../../services/notificationRulesService';
import { useAuth } from '../../contexts/AuthContext';
import {
  RULE_META,
  RULE_TYPES,
  TEMPLATE_VARIABLES,
  PRIORITIES,
  SAMPLE_VARS,
  renderTemplate,
  validateTemplate,
} from '../../utils/notificationRules';

const clone = (obj) => JSON.parse(JSON.stringify(obj));

// What the timing rail's end-node represents, per scheduled rule.
const EVENT_NODE = {
  [RULE_TYPES.LESSON_REMINDER]: 'Ders',
  [RULE_TYPES.MEMBERSHIP_EXPIRING]: 'Bitiş',
};

function TimingRail({ rule, meta }) {
  if (meta.category !== 'scheduled') {
    const trigger =
      rule.ruleType === RULE_TYPES.CREDIT_LOW
        ? `Kalan ders ≤ ${rule.threshold ?? '–'} olunca`
        : 'Kayıt ve iptal anında';
    return (
      <div className="an-trigger">
        <span className="an-trigger-pulse" />
        {trigger}
      </div>
    );
  }
  const offsets = [...(rule[meta.setting] || [])].sort((a, b) => b - a);
  return (
    <div className="an-rail">
      {offsets.length === 0 ? (
        <span className="an-rail-empty">Zamanlama seçilmedi</span>
      ) : (
        offsets.map((o) => (
          <span className="an-rail-node" key={o}>
            <i className="an-rail-dot" />
            {o}
            {meta.settingUnit === 'saat' ? 's' : 'g'}
          </span>
        ))
      )}
      <span className="an-rail-line" />
      <span className="an-rail-event">{EVENT_NODE[rule.ruleType]}</span>
    </div>
  );
}

const AutoNotifications = () => {
  const { currentUser } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewCancel, setPreviewCancel] = useState(false);
  const [toast, setToast] = useState(null);

  const loadRules = async () => {
    setLoading(true);
    const res = await notificationRulesService.getRules();
    if (res.success) setRules(res.rules);
    setLoading(false);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const flash = (text, kind = 'ok') => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (rule, value) => {
    setRules((prev) => prev.map((r) => (r.ruleType === rule.ruleType ? { ...r, enabled: value } : r)));
    const res = await notificationRulesService.toggleRule(rule.ruleType, value, currentUser?.uid);
    if (!res.success) {
      flash('Durum güncellenemedi.', 'err');
      loadRules();
    }
  };

  const openEdit = (rule) => {
    setPreviewCancel(false);
    setEditing(clone(rule));
  };

  const updateDraft = (patch) => setEditing((d) => ({ ...d, ...patch }));

  const updateTemplate = (which, lang, field, value) => {
    setEditing((d) => ({
      ...d,
      [which]: { ...d[which], [lang]: { ...(d[which]?.[lang] || {}), [field]: value } },
    }));
  };

  const toggleOffset = (settingKey, option) => {
    setEditing((d) => {
      const current = Array.isArray(d[settingKey]) ? d[settingKey] : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option].sort((a, b) => b - a);
      return { ...d, [settingKey]: next };
    });
  };

  const doSave = async () => {
    setSaving(true);
    const res = await notificationRulesService.updateRule(editing.ruleType, editing, currentUser?.uid);
    setSaving(false);
    if (res.success) {
      setRules((prev) => prev.map((r) => (r.ruleType === editing.ruleType ? editing : r)));
      setEditing(null);
      flash('Kural kaydedildi.');
    } else {
      flash(res.message || 'Kaydedilemedi.', 'err');
    }
  };

  const handleSave = async () => {
    const meta = RULE_META[editing.ruleType];
    const validation = validateTemplate(editing.template);
    if (!validation.valid) {
      const ok = window.confirm(
        `Şablonda tanımsız değişken var: ${validation.unknownVariables
          .map((v) => `{${v}}`)
          .join(', ')}. Yine de kaydedilsin mi?`
      );
      if (!ok) return;
    }
    if (
      meta.setting &&
      Array.isArray(editing[meta.setting]) &&
      editing[meta.setting].length === 0 &&
      editing.enabled
    ) {
      flash(`En az bir ${meta.settingUnit} değeri seçmelisin.`, 'err');
      return;
    }
    doSave();
  };

  const handleTest = async () => {
    if (!currentUser?.uid) return;
    const res = await notificationRulesService.sendTest(editing, currentUser.uid, 'tr', previewCancel);
    flash(res.success ? 'Test bildirimi hesabına gönderildi.' : 'Test gönderilemedi.', res.success ? 'ok' : 'err');
  };

  const activeCount = rules.filter((r) => r.enabled).length;
  const meta = editing ? RULE_META[editing.ruleType] : null;
  const previewTemplate = editing
    ? previewCancel && editing.cancelTemplate
      ? editing.cancelTemplate
      : editing.template
    : null;
  const preview = previewTemplate ? renderTemplate(previewTemplate, 'tr', SAMPLE_VARS) : null;

  const renderTemplateEditor = (label, lang, which) => {
    const variant = editing[which]?.[lang] || { title: '', body: '' };
    return (
      <div className="an-field" key={`${which}-${lang}`}>
        <span className="an-flag">{lang === 'tr' ? '🇹🇷' : '🇬🇧'} {label}</span>
        <input
          className="an-input"
          placeholder="Başlık"
          value={variant.title}
          onChange={(e) => updateTemplate(which, lang, 'title', e.target.value)}
        />
        <textarea
          className="an-input an-textarea"
          placeholder="Mesaj"
          value={variant.body}
          onChange={(e) => updateTemplate(which, lang, 'body', e.target.value)}
        />
      </div>
    );
  };

  return (
    <div className="an-root">
      <header className="an-page-head">
        <div>
          <span className="an-eyebrow">Otomasyon</span>
          <h1 className="an-display">Otomatik Bildirimler</h1>
          <p className="an-lede">
            Stüdyo kendi kendine konuşsun. Her bildirimi aç, zamanını ve sözlerini sen belirle.
          </p>
        </div>
        <div className="an-summary">
          <span className="an-summary-num">{activeCount}</span>
          <span className="an-summary-label">/ {rules.length || 4} aktif</span>
        </div>
      </header>

      {toast && <div className={`an-toast an-toast-${toast.kind}`}>{toast.text}</div>}

      {loading ? (
        <div className="an-loading">Yükleniyor…</div>
      ) : (
        <div className="an-grid">
          {rules.map((rule) => {
            const m = RULE_META[rule.ruleType];
            return (
              <article className={`an-card ${rule.enabled ? 'is-on' : 'is-off'}`} key={rule.ruleType}>
                <span className="an-card-rail-accent" />
                <div className="an-card-top">
                  <span className="an-tag">{m.category === 'scheduled' ? 'Zamanlanmış' : 'Anlık'}</span>
                  <label className="an-switch" title={rule.enabled ? 'Açık' : 'Kapalı'}>
                    <input
                      type="checkbox"
                      checked={!!rule.enabled}
                      onChange={(e) => handleToggle(rule, e.target.checked)}
                    />
                    <span className="an-slider" />
                  </label>
                </div>

                <div className="an-card-id">
                  <span className="an-stone">{m.icon}</span>
                  <div>
                    <h3 className="an-card-title">{m.label}</h3>
                    <p className="an-card-desc">{m.description}</p>
                  </div>
                </div>

                <TimingRail rule={rule} meta={m} />

                <button className="an-edit" onClick={() => openEdit(rule)}>
                  Düzenle
                  <span className="an-edit-arrow">→</span>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="an-modal-overlay" onClick={() => setEditing(null)}>
          <div className="an-modal" onClick={(e) => e.stopPropagation()}>
            <div className="an-modal-head">
              <div className="an-modal-id">
                <span className="an-stone an-stone-sm">{meta.icon}</span>
                <div>
                  <span className="an-eyebrow">{meta.category === 'scheduled' ? 'Zamanlanmış' : 'Anlık'}</span>
                  <h2>{meta.label}</h2>
                </div>
              </div>
              <button className="an-close" onClick={() => setEditing(null)} aria-label="Kapat">
                ✕
              </button>
            </div>

            <div className="an-modal-body">
              {/* Live notification preview — what the member actually sees */}
              <div className="an-preview-card">
                <div className="an-preview-banner">
                  <span className="an-preview-appicon">Z</span>
                  <div className="an-preview-text">
                    <div className="an-preview-row">
                      <span className="an-preview-app">Zenith Studio</span>
                      <span className="an-preview-now">şimdi</span>
                    </div>
                    <div className="an-preview-title">{preview?.title || 'Başlık'}</div>
                    <div className="an-preview-body">{preview?.body || 'Mesaj metni'}</div>
                  </div>
                </div>
                {meta.hasCancelTemplate && (
                  <button className="an-ghost" onClick={() => setPreviewCancel((c) => !c)}>
                    {previewCancel ? 'Onay mesajını göster' : 'İptal mesajını göster'}
                  </button>
                )}
              </div>

              <div className="an-row">
                <span className="an-label">Bu bildirim aktif</span>
                <label className="an-switch">
                  <input
                    type="checkbox"
                    checked={!!editing.enabled}
                    onChange={(e) => updateDraft({ enabled: e.target.checked })}
                  />
                  <span className="an-slider" />
                </label>
              </div>

              {meta.setting && Array.isArray(editing[meta.setting]) && (
                <div className="an-field">
                  <span className="an-label">{meta.settingLabel}</span>
                  <div className="an-chips">
                    {meta.settingOptions.map((opt) => (
                      <button
                        key={opt}
                        className={`an-chip ${editing[meta.setting].includes(opt) ? 'active' : ''}`}
                        onClick={() => toggleOffset(meta.setting, opt)}
                      >
                        {opt} {meta.settingUnit}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {meta.setting === 'threshold' && (
                <div className="an-field">
                  <span className="an-label">{meta.settingLabel}</span>
                  <input
                    className="an-input an-input-sm"
                    type="number"
                    min="0"
                    value={editing.threshold ?? ''}
                    onChange={(e) => updateDraft({ threshold: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              )}

              <div className="an-field">
                <span className="an-label">Öncelik</span>
                <div className="an-chips">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.key}
                      className={`an-chip ${(editing.priority || 'normal') === p.key ? 'active' : ''}`}
                      onClick={() => updateDraft({ priority: p.key })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="an-field">
                <span className="an-label">Değişkenler — mesaja ekleyebilirsin</span>
                <div className="an-vars">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <span className="an-var" key={v.key}>
                      <code>{`{${v.key}}`}</code>
                      <em>{v.label}</em>
                    </span>
                  ))}
                </div>
              </div>

              <div className="an-divider"><span>Mesaj</span></div>
              {renderTemplateEditor('Türkçe', 'tr', 'template')}
              {renderTemplateEditor('English', 'en', 'template')}

              {meta.hasCancelTemplate && (
                <>
                  <div className="an-divider"><span>İptal mesajı</span></div>
                  {renderTemplateEditor('Türkçe', 'tr', 'cancelTemplate')}
                  {renderTemplateEditor('English', 'en', 'cancelTemplate')}
                </>
              )}
            </div>

            <div className="an-modal-foot">
              <button className="an-btn-ghost" onClick={handleTest}>
                Test gönder
              </button>
              <button className="an-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoNotifications;
