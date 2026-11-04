import React, { useState, useEffect } from 'react';
import posthog from "posthog-js";
import axios from 'axios';
import { formatDistanceToNowStrict } from 'date-fns';
import { Globe, LogOut, User as UserIcon } from 'lucide-react';
import { useSession } from '../session';
import { APP_ORIGIN } from '../config';
import { useFigmaData } from '../useFigmaData';
import AppShell, { SidebarControls } from '../components/AppShell';
import { BTN_PRIMARY, BTN_GHOST, PanelHeading } from '../components/pageStyles';

export default function Profile() {
  const { user, refresh } = useSession();
  const { allFiles, stats } = useFigmaData();

  const [slug, setSlug] = useState('');
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSlug(user.profile_slug ?? '');
      setPublicEnabled(user.public_enabled ?? false);
    }
  }, [user]);

  const embedUrl = slug ? `${APP_ORIGIN}/embed-widget?slug=${slug}` : '';
  const displayName = user?.handle || 'Your account';
  const tracked = allFiles.filter((f) => !f.archived_at).length;
  const lastSync = stats?.lastSync
    ? formatDistanceToNowStrict(new Date(stats.lastSync), { addSuffix: true })
    : 'Never';

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
      setSaveError(err?.response?.data?.error || 'Failed to save. The slug may already be taken.');
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
    window.location.href = '/?loggedout=1';
  };

  const copy = (text: string, which: string) => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1800);
  };

  const sidebarTop = (
    <div className="flex items-center gap-3">
      <div className="rounded-full shrink-0 size-12 overflow-hidden bg-hairline">
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
        <span className="text-[12px] text-body truncate">Figma account connected</span>
      </div>
    </div>
  );

  const sidebar = (
    <SidebarControls
      label="Profile"
      sections={[
        {
          id: 'account',
          label: 'Account',
          icon: <Globe size={15} />,
          content: (
            <dl className="flex flex-col gap-3 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Files tracked</dt>
                <dd className="text-ink tabular-nums">{tracked}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Last sync</dt>
                <dd className="text-ink">{lastSync}</dd>
              </div>
            </dl>
          ),
        },
        {
          id: 'session',
          label: 'Session',
          icon: <LogOut size={15} />,
          content: (
            <button type="button" onClick={logout} className={`${BTN_GHOST} h-9 px-4 text-[13px]`}>
              Log out
            </button>
          ),
        },
      ]}
    />
  );

  return (
    <AppShell sidebarTop={sidebarTop} sidebar={sidebar}>
      <div className="flex-1 min-h-0 p-4 pb-8 lg:p-6 lg:overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-lg mx-auto flex flex-col gap-8 py-6 animate-fade-in-up">
          <>
              <PanelHeading title="Profile">
                Your name and photo come from Figma. Your handle addresses your embeds, and publishing is what lets them render.
              </PanelHeading>

              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <label htmlFor="profile-slug" className="ui-text text-ink">Public handle</label>
                  <input
                    id="profile-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase())}
                    placeholder="your-handle"
                    aria-invalid={saveError ? true : undefined}
                    aria-describedby={saveError ? 'slug-hint slug-error' : 'slug-hint'}
                    className="h-11 rounded-full border border-line bg-surface px-5 text-[14px] font-mono text-ink outline-none transition-colors placeholder:text-muted focus:border-accent min-w-0"
                  />
                  <p id="slug-hint" className="text-[13px] text-muted leading-relaxed">
                    Lowercase letters, numbers, and dashes only.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="flex flex-col gap-0.5">
                    <span id="public-toggle-label" className="ui-text text-ink">Publish my embeds</span>
                    <span className="text-[13px] text-muted">When off, your embeds and public stats return nothing.</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={publicEnabled}
                    aria-labelledby="public-toggle-label"
                    onClick={() => setPublicEnabled((v) => !v)}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${publicEnabled ? 'bg-accent' : 'bg-ink/15'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform ${publicEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                {slug && publicEnabled && (
                  <div className="flex flex-col gap-2">
                    <span className="ui-text text-ink">Embed link</span>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={embedUrl}
                        aria-label="Embed link"
                        className="flex-1 h-11 rounded-full border border-line bg-surface px-5 text-[13px] font-mono text-body outline-none min-w-0"
                      />
                      <button type="button" onClick={() => copy(embedUrl, 'embed')} className={`${BTN_GHOST} shrink-0`}>
                        {copied === 'embed' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {saveError && <p id="slug-error" role="alert" className="text-[13px] text-red">{saveError}</p>}

              <div className="flex items-center gap-4">
                <button type="button" onClick={saveProfile} disabled={saving} className={BTN_PRIMARY}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {saved && <span role="status" className="text-[13px] text-body">Saved</span>}
              </div>
            </>
        </div>
      </div>
    </AppShell>
  );
}
