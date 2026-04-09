import React, { useRef, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, auth as apiAuth, inventar, profileSettings } from '../lib/apiClient';

interface SettingsProps {
  userProfile: UserProfile;
}

export const Settings: React.FC<SettingsProps> = ({ userProfile }) => {
  const { user, profile, signOut, refreshProfile, updatePassword } = useAuth();
  const [name, setName] = useState(userProfile.name);
  
  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null);
  
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
    }
  }, [profile]);

  // Load avatar signed URL when profile changes
  useEffect(() => {
    if (profile?.avatar_url && !avatarPreview) {
      if (profile.avatar_url.startsWith('http')) {
        setAvatarDisplayUrl(profile.avatar_url);
      } else {
        profileSettings.getAvatarSignedUrl(profile.avatar_url)
          .then(url => setAvatarDisplayUrl(url))
          .catch(err => {
            console.error('Error loading avatar URL:', err);
            setAvatarDisplayUrl(profile.avatar_url); // Fallback to raw URL
          });
      }
    }
  }, [profile?.avatar_url, avatarPreview]);

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
      });

      // Refresh profile in context
      await refreshProfile();

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile name');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;
    setIsUploading(true);
    setError(null);

    try {
      // Upload avatar to Cloudflare R2 via new endpoint
      const storagePath = await profileSettings.uploadAvatar(avatarFile);
      
      // Delete old avatar if exists and isn't external
      if (profile?.avatar_url && profile.avatar_url !== storagePath && !profile.avatar_url.startsWith('http')) {
        await profileSettings.deleteOldAvatar(profile.avatar_url);
      }

      // Update backend profile
      await apiAuth.updateProfile({ avatar_url: storagePath });
      
      // Refresh context
      await refreshProfile();
      
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsUploading(false);
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload custom avatar');
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
      <div className="max-w-2xl w-full bg-card border border-border rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">

        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
          <span className="material-icons-round text-primary">manage_accounts</span>
          User Settings
        </h2>

        <div className="space-y-8 relative z-10">

          {/* Avatar Section */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Profile Avatar</label>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full p-1 border-2 border-primary shadow-[0_0_20px_rgba(19,91,236,0.3)] bg-muted overflow-hidden">
                  <img src={avatarPreview || avatarDisplayUrl || 'https://picsum.photos/seed/default/200/200'} alt="Current Avatar" className="w-full h-full rounded-full object-cover" />
                </div>
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full mt-1 ml-1 mb-1 mr-1">
                    <span className="material-icons-round text-foreground animate-spin">hourglass_empty</span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-muted/80 hover:bg-muted border border-border text-foreground rounded-lg transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
                  >
                    <span className="material-icons-round text-[18px]">imagesmode</span>
                    Choose Image
                  </button>
                  {avatarFile && (
                    <button
                      onClick={handleAvatarUpload}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors shadow-lg disabled:opacity-50 text-sm font-medium border border-primary/20"
                    >
                      <span className="material-icons-round text-[18px]">{isUploading ? 'hourglass_empty' : 'cloud_upload'}</span>
                      {isUploading ? 'Uploading...' : 'Save Avatar'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground opacity-80">
                  JPG, PNG or GIF. Max size 5MB. Uploading a custom avatar will automatically save it.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isUploading}
                />
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-white/5"></div>

          {/* Name Section */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Screen Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isUploading}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-muted-foreground/80 disabled:opacity-50"
              placeholder="Enter your display name"
            />
            <p className="text-[10px] text-muted-foreground">This name will be displayed on your dashboard and generated content.</p>
          </div>

          <div className="w-full h-px bg-white/5"></div>

          {/* Password Change Section */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Change Password</label>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-xs text-muted-foreground mb-2">Aktuelles Passwort</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordLoading}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-muted-foreground/80 disabled:opacity-50"
                  placeholder="Aktuelles Passwort eingeben"
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-xs text-muted-foreground mb-2">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-muted-foreground/80 disabled:opacity-50"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs text-muted-foreground mb-2">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-muted-foreground/80 disabled:opacity-50"
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
                className="w-full py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 border border-border text-foreground transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-amber-400 outline-none transition-all"
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
                      className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-amber-400 outline-none transition-all font-mono text-sm placeholder:text-muted-foreground/80"
                    />
                    <button
                      type="button"
                      onClick={() => setAdminNewPw(generatePassword())}
                      title="Passwort generieren"
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-border rounded-xl text-foreground/90 transition-all"
                    >
                      <span className="material-icons-round text-sm">casino</span>
                    </button>
                    <button
                      type="button"
                      onClick={copyAdminPw}
                      disabled={!adminNewPw}
                      title="Passwort kopieren"
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-border rounded-xl text-foreground/90 transition-all disabled:opacity-30"
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
              className={`px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${isSaved ? 'bg-green-500 text-foreground' : 'bg-primary hover:bg-primary-hover text-foreground'} disabled:opacity-50`}
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
