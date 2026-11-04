import React, { useState, useEffect } from 'react';
import posthog from "posthog-js";
import axios from 'axios';
import { useSession } from '../session';
import { APP_ORIGIN } from '../config';
import { Settings as SettingsIcon, User as UserIcon, Globe, Copy, Check, LogOut, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, SectionHeader, Button } from '../components/ui';
import { AnalyticsCard } from '../components/AnalyticsConsent';
import AppShell, { SidebarControls, SidebarSwitcher } from '../components/AppShell';

type Panel = 'publishing' | 'privacy' | 'danger';
const PANELS: { id: Panel; label: string; icon: React.ReactNode }[] = [
  { id: 'publishing', label: 'Publishing', icon: <Globe size={15} /> },
  { id: 'privacy', label: 'Privacy', icon: <ShieldCheck size={15} /> },
  { id: 'danger', label: 'Delete', icon: <Trash2 size={15} /> },
];

export default function Settings() {
  const { user, refresh } = useSession();

  // Embed publishing controls.
  const [slug, setSlug] = useState('');
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [panel, setPanel] = useState<Panel>('publishing');

  // Account deletion.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSlug(user.profile_slug ?? '');
      setPublicEnabled(user.public_enabled ?? false);
    }
  }, [user]);

  const embedUrl = slug ? `${APP_ORIGIN}/embed-widget?slug=${slug}` : '';
  const displayName = user?.handle || 'Your account';

  const saveProfile = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await axios.put('/api/user/profile', {
        profile_slug: slug.trim() || null,
        public_enabled: publicEnabled,
      });
      await refresh();
      posthog.capture('settings_update_profile');
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.error || 'Failed to save. The slug may already be taken.'
      );
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/user/logout');
    } catch {
      /* ignore */
    }
    posthog.capture('settings_logout');
    // ?loggedout=1 tells the app shell to show the marketing landing page
    // instead of bouncing a session-less visit straight back into OAuth.
    window.location.href = '/?loggedout=1';
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await axios.post('/api/user/disconnect');
      posthog.capture('settings_delete_account');
      window.location.href = '/?loggedout=1';
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  const copy = (text: string, which: string) => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1800);
  };

  const sidebarTop = (
    <div className="flex items-center gap-3">
      <div className="relative rounded-full shadow-card shrink-0 size-12 overflow-hidden bg-hairline">
        {user?.img_url ? (
          <img src={user.img_url} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            <UserIcon size={24} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="display text-[16px] leading-tight text-ink truncate">{displayName}</h1>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green shrink-0" />
          <span className="text-[12px] text-body font-medium truncate">Figma account connected</span>
        </div>
      </div>
    </div>
  );

  const sidebar = (
    <SidebarControls
      label="Settings sections"
      sections={[
        {
          id: 'section',
          label: 'Settings',
          icon: <SettingsIcon size={15} />,
          content: (
            <SidebarSwitcher label="Settings section" value={panel} onChange={setPanel} options={PANELS} />
          ),
        },
        {
          id: 'session',
          label: 'Session',
          icon: <LogOut size={15} />,
          content: (
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 h-9 rounded-lg border border-line bg-canvas text-[13px] font-bold text-red hover:bg-hairline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <LogOut size={15} /> Log out
            </button>
          ),
        },
      ]}
    />
  );

  return (
    <AppShell sidebarTop={sidebarTop} sidebar={sidebar}>
      <div className="flex-1 min-h-0 p-4 pb-8 lg:p-6 lg:overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-[720px] mx-auto">
          {panel === 'publishing' ? (
              <Card className="flex flex-col gap-5 p-6 animate-fade-in-up">
                <SectionHeader
                  plain
                  icon={<Globe size={20} />}
                  title="Embed Publishing"
                  subtitle="Your handle addresses your embeds, and publishing is what lets them render."
                />

                <div className="flex flex-col gap-4 w-full max-w-[560px]">
                  {/* Slug */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-slug" className="text-[13px] font-bold text-muted uppercase tracking-wider">Public handle</label>
                    <div className="flex items-center gap-1 bg-canvas border border-line rounded-xl px-3 py-2 focus-within:border-accent transition-colors">
                      <input
                        id="profile-slug"
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase())}
                        placeholder="your-handle"
                        aria-invalid={saveError ? true : undefined}
                        aria-describedby={saveError ? 'slug-hint slug-error' : 'slug-hint'}
                        className="flex-1 bg-transparent outline-none text-[13px] font-mono text-ink min-w-0"
                      />
                    </div>
                    <p id="slug-hint" className="text-[12px] text-muted leading-relaxed">
                      Lowercase letters, numbers, and dashes only. Every embed you publish is addressed by this handle.
                    </p>
                  </div>

                  {/* Public toggle */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span id="public-toggle-label" className="text-[14px] font-semibold text-black">Publish my embeds</span>
                      <span className="text-[12px] text-muted">When off, your embeds and public stats return nothing.</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={publicEnabled}
                      aria-labelledby="public-toggle-label"
                      onClick={() => setPublicEnabled((v) => !v)}
                      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${publicEnabled ? 'bg-green' : 'bg-[#d9d9d9]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform ${publicEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {saveError && <p id="slug-error" role="alert" className="text-[12px] text-red font-medium">{saveError}</p>}

                  <div className="flex items-center gap-3">
                    <Button onClick={saveProfile} disabled={saving} className="rounded-xl">
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                    {saved && (
                      <span role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-green">
                        <Check size={15} /> Saved
                      </span>
                    )}
                  </div>

                  {/* Share links (only meaningful once published) */}
                  {slug && publicEnabled && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-hairline">
                      <ShareRow label="Embed link" value={embedUrl} onCopy={() => copy(embedUrl, 'embed')} copied={copied === 'embed'} />
                    </div>
                  )}
                </div>
              </Card>
          ) : panel === 'privacy' ? (
            <AnalyticsCard />
          ) : (
              <Card className="flex flex-col gap-5 p-6 border-red/30! animate-fade-in-up">
                <SectionHeader
                  plain
                  icon={<AlertTriangle size={20} className="text-red" />}
                  title="Delete account"
                  subtitle="Permanently remove your account, Figma authorization, and all tracked file activity."
                />
                <p className="text-[13px] text-muted leading-relaxed max-w-[560px]">
                  This deletes your stored Figma tokens, your published handle, and every file’s
                  tracked history — any embed you’ve placed elsewhere stops rendering. It cannot
                  be undone. You can reconnect later by signing in again.
                </p>

                {!confirmingDelete ? (
                  <div>
                    <button
                      onClick={() => setConfirmingDelete(true)}
                      className="flex items-center gap-2 bg-red/10 hover:bg-red/15 text-red px-4 py-2 rounded-xl text-[13px] font-bold transition-colors"
                    >
                      <Trash2 size={15} /> Delete my account
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-w-[560px]">
                    <p className="text-[13px] font-semibold text-black">
                      Are you sure? This permanently deletes your account and all data.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={deleteAccount}
                        disabled={deleting}
                        className="flex items-center gap-2 bg-red hover:bg-red/90 text-white px-4 py-2 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-60"
                      >
                        <Trash2 size={15} /> {deleting ? 'Deleting…' : 'Yes, delete everything'}
                      </button>
                      <button
                        onClick={() => { setConfirmingDelete(false); setDeleteError(null); }}
                        disabled={deleting}
                        className="text-[13px] font-bold text-muted hover:text-ink transition-colors disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {deleteError && (
                  <p role="alert" className="text-[12px] text-red font-medium">{deleteError}</p>
                )}
              </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ShareRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold text-muted uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          aria-label={label}
          className="flex-1 bg-canvas border border-line rounded-lg px-3 py-2 text-[12px] font-mono text-ink outline-none min-w-0"
        />
        <button
          onClick={onCopy}
          className="shrink-0 flex items-center gap-1.5 bg-ink hover:bg-black text-white px-3 py-2 rounded-lg text-[12px] font-bold transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
