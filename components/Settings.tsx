import React, { useRef, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, auth as apiAuth, inventar } from '../lib/apiClient';

interface SettingsProps {
  userProfile: UserProfile;
}

const PRESET_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBNsFqWF5iQVNoUnwyaSNFSunX3-x1P3ttQm5pyya4GFxDRald1TQRNJ-pm7yRDH_DXIbLa7Gf1SXid866fs9ZRN-8knroGfTH_N_G-SlVwrSyBjqHgpQ-PrQw3wmDociqLcHIV5exvR0KDaFwS86J5lOIJxU8ccJZei2AWW0WnK0tUea-eXfEy3fa3GETpPANrkA7ipZp1c2bEWI1YyoMaea-hPMGkJnYM3lreBtaTxfJVmW5CDhlRaQ-XVzLDSlB-vtrPmzzrtLUI',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBCq-OX_ftzyJeveBb5umMg9V7eJxPvIg3MSmcvx0tb1K7k_EPMGVNzdrqsElA3mV6tPwcrS9qmja8QRML_JEbjsXFKeR7fcRzyH_4onr7EpCgV1z1FKsEav4HOPoRSU37uLJbk4AocKgiln-4odJ6qYwLaQI4NDOAdqA9Afs0pIa11mp--glasl1uvFPgCmAroVdEPW9Zrt5gPwT_ZD6XWZbX193F9278i-0UsB1leuDZz0iZhdm-rwtSL-AsDsBrHhHZj9tAFtTxC',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuARKp7un_J6viDTzhW62zcaIX54n_gduphy8RFH1nb5LrOpPsFRtd3uFEWCD1AnQrvArVRpdsoDPdspjUMk2IMXcBWI-3mu8TpCO2o_4B71YZJVTZcOLHNPt8cyFXUNfAO4W6aTM9PgtX9BOOe9lQXTqdRyd-SmNOjI4Knd2Rtqpn4QXicuxXkfYFzplomomOUFkfiP6j-PSRevX9SzXraWGKTBqUVOfCuy_CYr9xbxbRY_wmpJ2vLGJMMK3mdJ5yDD4PiaKKN_ueJ6NZ',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDEpHeiSrrPHbvB2-uuBcgp-foKKgcTrOYuVNZWOXTYk6N3Zd2GPPgMwAnM3h36g3iQ6_ZEVI6vzCY_DXhWQsUns2Tdoj0Y90c6VW7K6j6TY2bs9AaDC7ZPZwMaUectRIiSwothZyI7AAr0qSflM1C4wuko6THJvSvC6unydYDuHCz3YqFPD0QHgtjZnXpCL-yT8BmMYM-s3Pypd-EsvqgmmltjKG-3Si8_LwEFFGBd-tH-1ExCMTNDHMFNQDTHtoAoWXTEA_Cat37B',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDnZ2XAj7F7L6r95sxqCYV64WIdofvv1YjiKKKUBGOhUlJaVXMix4l24TKjK9CxhQynwGFyMHJPIJYoh6Y7d-nnLuFg915We6hRpy7yeDYivVbc1tdMJhTo0JfYWpDJIqign0WKCFo0H6mkHj1k94JcMR8RwfuAGjdv1Bn3839sZfeASz2jivDsuLSUghxaF-5NBvhRpM0F7Z0uZv9363906RQg4iTVQk0vq8R9T55Ceb3TgU3TSAekvvyd6K1zJnwoSj-rncgFbnNB'
];

export const Settings: React.FC<SettingsProps> = ({ userProfile }) => {
  const { user, profile, signOut, refreshProfile, updatePassword } = useAuth();
  const [name, setName] = useState(userProfile.name);
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile.avatarUrl);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Admin reset state
  const [adminUsers, setAdminUsers] = useState<{ id: string; email: string; full_name: string }[]>([]);
  const [adminTargetId, setAdminTargetId] = useState('');
  const [adminNewPw, setAdminNewPw] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminCopied, setAdminCopied] = useState(false);

  // Sync with profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || 'Creator');
      setSelectedAvatar(profile.avatar_url || PRESET_AVATARS[0]);
    }
  }, [profile]);

  // Load user list for admins
  useEffect(() => {
    if (profile?.role === 'admin') {
      inventar.profiles.list().then(list => {
        setAdminUsers(list.filter(u => u.id !== profile.id));
      }).catch(() => {});
    }
  }, [profile]);

  function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  async function handleAdminReset(e: React.FormEvent) {
    e.preventDefault();
    if (!adminTargetId || !adminNewPw) return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      await apiAuth.adminResetPassword(adminTargetId, adminNewPw);
      setAdminSuccess(true);
      setTimeout(() => { setAdminSuccess(false); setAdminTargetId(''); setAdminNewPw(''); }, 4000);
    } catch (err: any) {
      setAdminError(err.message || 'Reset failed');
    } finally {
      setAdminLoading(false);
    }
  }

  function copyAdminPw() {
    navigator.clipboard.writeText(adminNewPw);
    setAdminCopied(true);
    setTimeout(() => setAdminCopied(false), 2000);
  }

  const handleSave = async () => {
    if (!user) return;

    setError(null);
    setIsUploading(true);

    try {
      await apiAuth.updateProfile({
        full_name: name,
        avatar_url: selectedAvatar,
      });

      // Refresh profile in context
      await refreshProfile();

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      // Upload to Cloudflare R2
      const avatarUrl = await uploadFile(file, 'avatars');
      setSelectedAvatar(avatarUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Bitte aktuelles Passwort eingeben');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await apiAuth.updatePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await signOut();
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-[#0a0f18] border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">

        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <span className="material-icons-round text-primary">manage_accounts</span>
          User Settings
        </h2>

        <div className="space-y-8 relative z-10">

          {/* Avatar Section */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Profile Avatar</label>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Current Preview */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full p-1 border-2 border-primary shadow-[0_0_20px_rgba(19,91,236,0.3)]">
                  <img src={selectedAvatar} alt="Current Avatar" className="w-full h-full rounded-full object-cover" />
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#1a1f2e] border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors shadow-lg disabled:opacity-50"
                >
                  <span className="material-icons-round text-sm">{isUploading ? 'hourglass_empty' : 'upload'}</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>

              {/* Presets */}
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-3">Choose a preset or upload your own:</p>
                <div className="flex flex-wrap gap-3">
                  {PRESET_AVATARS.map((avatar, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAvatar(avatar)}
                      disabled={isUploading}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all duration-300 ${selectedAvatar === avatar ? 'border-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:border-white/20'} disabled:opacity-30`}
                    >
                      <img src={avatar} alt={`Preset ${index}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-white/5"></div>

          {/* Name Section */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Screen Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isUploading}
              className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
              placeholder="Enter your display name"
            />
            <p className="text-[10px] text-slate-500">This name will be displayed on your dashboard and generated content.</p>
          </div>

          <div className="w-full h-px bg-white/5"></div>

          {/* Password Change Section */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Change Password</label>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-xs text-slate-400 mb-2">Aktuelles Passwort</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordLoading}
                  className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                  placeholder="Aktuelles Passwort eingeben"
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-xs text-slate-400 mb-2">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                  className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs text-slate-400 mb-2">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                  className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
                  <span className="material-icons-round text-sm">check_circle</span>
                  Password updated successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading || !newPassword || !confirmPassword}
                className="w-full py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-icons-round text-sm">lock_reset</span>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Admin: Reset User Password */}
          {profile?.role === 'admin' && (
            <>
              <div className="w-full h-px bg-white/5" />
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                  <span className="material-icons-round text-sm">admin_panel_settings</span>
                  Admin: User-Passwort zurücksetzen
                </label>
                <form onSubmit={handleAdminReset} className="space-y-3">
                  <select
                    value={adminTargetId}
                    onChange={e => setAdminTargetId(e.target.value)}
                    className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-amber-400 outline-none transition-all"
                  >
                    <option value="">— User auswählen —</option>
                    {adminUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminNewPw}
                      onChange={e => setAdminNewPw(e.target.value)}
                      placeholder="Neues Passwort (min. 6 Zeichen)"
                      className="flex-1 bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-amber-400 outline-none transition-all font-mono text-sm placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setAdminNewPw(generatePassword())}
                      title="Passwort generieren"
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-all"
                    >
                      <span className="material-icons-round text-sm">casino</span>
                    </button>
                    <button
                      type="button"
                      onClick={copyAdminPw}
                      disabled={!adminNewPw}
                      title="Passwort kopieren"
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-all disabled:opacity-30"
                    >
                      <span className="material-icons-round text-sm">{adminCopied ? 'check' : 'content_copy'}</span>
                    </button>
                  </div>

                  {adminError && <div className="text-red-400 text-sm">{adminError}</div>}
                  {adminSuccess && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
                      <span className="material-icons-round text-sm">check_circle</span>
                      Passwort erfolgreich gesetzt! User muss informiert werden.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={adminLoading || !adminTargetId || adminNewPw.length < 6}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-icons-round text-sm">lock_reset</span>
                    {adminLoading ? 'Wird gesetzt...' : 'Passwort zurücksetzen'}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="pt-6 flex justify-between items-center">
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2"
            >
              <span className="material-icons-round">logout</span>
              Logout
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isUploading}
              className={`px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${isSaved ? 'bg-green-500 text-white' : 'bg-primary hover:bg-primary-hover text-white'} disabled:opacity-50`}
            >
              {isSaved ? (
                <>
                  <span className="material-icons-round">check</span>
                  Saved
                </>
              ) : (
                <>
                  <span className="material-icons-round">save</span>
                  Save Changes
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
