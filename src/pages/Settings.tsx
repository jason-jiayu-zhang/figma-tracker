import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../session';
import { APP_ORIGIN } from '../config';
import { Settings as SettingsIcon, User as UserIcon, Globe, Copy, Check, LogOut } from 'lucide-react';

export default function Settings() {
  const { user, refresh } = useSession();

  // Public profile controls.
  const [slug, setSlug] = useState('');
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSlug(user.profile_slug ?? '');
      setPublicEnabled(user.public_enabled ?? false);
    }
  }, [user]);

  const publicUrl = slug ? `${APP_ORIGIN}/u/${slug}` : '';
  const embedUrl = slug ? `${APP_ORIGIN}/embed-widget?slug=${slug}` : '';
  const displayName = user?.handle || 'Your account';

  const saveProfile = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await axios.put('/api/user/profile', {
        profile_slug: slug.trim() || null,
        public_enabled: publicEnabled,
      });
      await refresh();
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
    window.location.href = '/';
  };

  const copy = (text: string, which: string) => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="flex flex-col gap-8 w-full min-h-[768px]">
      {/* Header */}
      <div className="flex gap-3 items-center">
        <div className="size-10 flex items-center justify-center bg-[#F5F5F5] rounded-xl text-[#1A1A1A]">
          <SettingsIcon size={22} />
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="font-bold text-[24px] tracking-[-0.24px] leading-none text-[#1A1A1A]">Settings</h1>
          <p className="text-[12px] text-[#A6A6A6] tracking-[-0.12px] leading-none">Manage your account and public profile.</p>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white flex flex-col gap-5 p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)]">
        <h2 className="font-bold text-[18px] tracking-[-0.18px] text-[#1A1A1A]">Account</h2>
        <div className="flex items-center gap-4">
          <div className="relative rounded-full shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 size-16 overflow-hidden bg-[#F5F5F5]">
            {user?.img_url ? (
              <img src={user.img_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#A6A6A6]">
                <UserIcon size={32} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-[18px] tracking-[-0.18px] leading-tight text-black">{displayName}</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0acf83]" />
              <span className="text-[13px] text-[#737373] font-medium">Figma account connected</span>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-[#F5F5F5]">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-[13px] font-bold text-[#f43f5e] hover:opacity-80 transition-opacity"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </div>

      {/* Public profile publishing controls */}
      <div className="bg-white flex flex-col gap-5 p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)]">
        <div className="flex gap-3 items-center">
          <div className="size-10 flex items-center justify-center bg-[#F5F5F5] rounded-xl text-[#1abcfe]">
            <Globe size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-bold text-[20px] tracking-[-0.24px] leading-none text-[#1A1A1A]">Public Profile</h2>
            <p className="text-[12px] text-[#A6A6A6] tracking-[-0.12px] leading-none">Publish a read-only heatmap and share it anywhere.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-[560px]">
          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[#A6A6A6] uppercase tracking-wider">Profile URL</label>
            <div className="flex items-center gap-1 bg-[#fffaf4] border border-[#EBEBEB] rounded-xl px-3 py-2 focus-within:border-[#1ABCFE] transition-colors">
              <span className="text-[13px] text-[#A6A6A6] font-mono whitespace-nowrap">{APP_ORIGIN}/u/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase())}
                placeholder="your-handle"
                className="flex-1 bg-transparent outline-none text-[13px] font-mono text-[#181818] min-w-0"
              />
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-black">Enable public profile</span>
              <span className="text-[12px] text-[#A6A6A6]">When off, the public URL and embeds return nothing.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={publicEnabled}
              onClick={() => setPublicEnabled((v) => !v)}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${publicEnabled ? 'bg-[#0acf83]' : 'bg-[#d9d9d9]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${publicEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {saveError && <p className="text-[12px] text-[#f43f5e] font-medium">{saveError}</p>}

          <div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="bg-[#1ABCFE] hover:bg-[#16a6e0] text-white px-5 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {/* Share links (only meaningful once published) */}
          {slug && publicEnabled && (
            <div className="flex flex-col gap-3 pt-2 border-t border-[#F5F5F5]">
              <ShareRow label="Public link" value={publicUrl} onCopy={() => copy(publicUrl, 'public')} copied={copied === 'public'} />
              <ShareRow label="Embed link" value={embedUrl} onCopy={() => copy(embedUrl, 'embed')} copied={copied === 'embed'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold text-[#A6A6A6] uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 bg-[#fffaf4] border border-[#EBEBEB] rounded-lg px-3 py-2 text-[12px] font-mono text-[#181818] outline-none min-w-0"
        />
        <button
          onClick={onCopy}
          className="shrink-0 flex items-center gap-1.5 bg-[#181818] hover:bg-black text-white px-3 py-2 rounded-lg text-[12px] font-bold transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
