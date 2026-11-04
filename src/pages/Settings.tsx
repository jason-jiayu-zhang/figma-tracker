import React, { useEffect, useMemo, useState } from 'react';
import posthog from "posthog-js";
import axios from 'axios';
import { Settings as SettingsIcon, User as UserIcon, ShieldCheck, Database, Link2, SlidersHorizontal } from 'lucide-react';
import { useSession } from '../session';
import { ConfirmDialog } from '../components/ui';
import { AnalyticsSection } from '../components/AnalyticsConsent';
import AppShell, { SidebarControls, SidebarSwitcher } from '../components/AppShell';
import { BTN_DANGER, BTN_GHOST, PanelHeading } from '../components/pageStyles';
import { allTimezones, browserTimezone, getSavedTimezone, saveTimezone } from '../timezone';

type Panel = 'preferences' | 'connection' | 'privacy' | 'data';
const PANELS: { id: Panel; label: string; icon?: React.ReactNode }[] = [
  { id: 'preferences', label: 'Preferences', icon: <SlidersHorizontal size={15} /> },
  { id: 'connection', label: 'Connection', icon: <Link2 size={15} /> },
  { id: 'privacy', label: 'Privacy', icon: <ShieldCheck size={15} /> },
  { id: 'data', label: 'Data', icon: <Database size={15} /> },
];

const SCOPE_INFO: Record<string, string> = {
  'current_user:read': 'Your name and avatar',
  'file_metadata:read': 'File names, projects and last-modified times',
  'file_versions:read': 'Version history, which powers the heatmap and streaks',
  'file_comments:read': 'Comments on your tracked files',
  'file_dev_resources:read': 'Dev resources attached to your tracked files',
};

const FIELD =
  'h-11 rounded-full border border-line bg-surface px-5 text-[14px] text-ink outline-none transition-colors focus:border-accent min-w-0';

function Preferences() {
  const browserTz = browserTimezone();
  const zones = useMemo(() => allTimezones(), []);
  const [tz, setTz] = useState<string>(() => getSavedTimezone() ?? '');
  const onChange = (v: string) => {
    setTz(v);
    saveTimezone(v || null);
  };
  return (
    <>
      <PanelHeading title="Preferences">
        How Fimanu shows your activity on this device.
      </PanelHeading>
      <div className="flex flex-col gap-2">
        <label htmlFor="timezone" className="ui-text text-ink">Timezone</label>
        <select id="timezone" value={tz} onChange={(e) => onChange(e.target.value)} className={FIELD}>
          <option value="">Same as this browser ({browserTz})</option>
          {zones.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <p className="text-[13px] text-muted leading-relaxed">
          Decides which calendar day a version counts toward in Studio. It applies the next time Studio loads, and
          doesn’t change published embeds, which follow each viewer’s own timezone.
        </p>
      </div>
    </>
  );
}

function Connection() {
  const [info, setInfo] = useState<{ scopes: string[]; connected_at: string | null } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    axios.get('/api/user/connection').then((r) => setInfo(r.data)).catch(() => setFailed(true));
  }, []);
  return (
    <>
      <PanelHeading title="Connection">
        Fimanu reads your Figma account with read-only access. It never touches design content.
      </PanelHeading>
      <div className="flex flex-col gap-2">
        <span className="ui-text text-ink">Allowed to read</span>
        {failed ? (
          <p className="text-[13px] text-muted">Couldn’t load your connection details.</p>
        ) : !info ? (
          <p className="text-[13px] text-muted">Loading…</p>
        ) : info.scopes.length === 0 ? (
          <p className="text-[13px] text-muted">No permissions on record. Reconnect to refresh them.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {info.scopes.map((sc) => (
              <li key={sc} className="text-[14px] text-body">{SCOPE_INFO[sc] ?? sc}</li>
            ))}
          </ul>
        )}
        {info?.connected_at && (
          <p className="text-[13px] text-muted">
            Connected {new Date(info.connected_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
        )}
      </div>
      <div className="flex flex-col items-start gap-3">
        {/* Plain navigation to the GET endpoint (302 to Figma), as on the landing page. */}
        <a href="/api/oauth/start" className={BTN_GHOST}>Reconnect Figma</a>
        <p className="text-[13px] text-muted leading-relaxed">
          Use this if syncing stops working or you want to refresh permissions. Your files and history are kept.
        </p>
      </div>
    </>
  );
}

export default function Settings() {
  const { user } = useSession();
  const [panel, setPanel] = useState<Panel>('preferences');

  // Account deletion.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const displayName = user?.handle || 'Your account';

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
      label="Settings sections"
      sections={[
        {
          id: 'section',
          label: 'Settings',
          icon: <SettingsIcon size={15} />,
          content: (
            <SidebarSwitcher label="Settings section" value={panel} onChange={setPanel} options={PANELS} columns={2} />
          ),
        },
      ]}
    />
  );

  return (
    <AppShell sidebarTop={sidebarTop} sidebar={sidebar}>
      <div className="flex-1 min-h-0 p-4 pb-8 lg:p-6 lg:overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-lg mx-auto flex flex-col gap-8 py-6 animate-fade-in-up">
          {panel === 'preferences' ? (
            <Preferences />
          ) : panel === 'connection' ? (
            <Connection />
          ) : panel === 'privacy' ? (
            <AnalyticsSection />
          ) : (
            <>
              <PanelHeading title="Your data">
                Download everything Fimanu stores about you, or remove it all.
              </PanelHeading>

              <div className="flex flex-col items-start gap-3">
                <span className="ui-text text-ink">Export</span>
                <p className="text-[14px] text-body leading-relaxed">
                  A JSON file with your account details, tracked files, version history and daily activity. Access tokens are
                  never included.
                </p>
                <a href="/api/user/export" download className={BTN_GHOST}>Download my data</a>
              </div>

              <div className="flex flex-col items-start gap-3">
                <span className="ui-text text-ink">Delete account</span>
                <p className="text-[14px] text-body leading-relaxed">
                  This deletes your stored Figma tokens, your published handle, and every file’s tracked history. Any embed
                  you’ve placed elsewhere stops rendering. It cannot be undone. You can reconnect later by signing in again.
                </p>
                <button type="button" onClick={() => setConfirmingDelete(true)} className={BTN_DANGER}>
                  Delete my account
                </button>
              </div>
              <ConfirmDialog
                open={confirmingDelete}
                onClose={() => { setConfirmingDelete(false); setDeleteError(null); }}
                onConfirm={deleteAccount}
                busy={deleting}
                tone="danger"
                title="Delete your account?"
                description="This permanently deletes your Figma authorization, published handle and all tracked file history. Embeds you've placed elsewhere will stop rendering. It can't be undone."
                confirmLabel="Delete everything"
                error={deleteError}
              />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
