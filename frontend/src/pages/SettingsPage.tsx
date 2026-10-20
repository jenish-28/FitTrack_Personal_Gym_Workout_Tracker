import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Sliders,
  Lock,
  LogOut,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { settingsApi, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { WeightUnit, ThemeMode } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    user,
    weightUnit,
    theme,
    refreshUser,
    setWeightUnitPreference,
    setThemePreference,
    logout,
    showToast,
  } = useAuth();
  const navigate = useNavigate();

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Workout Preferences form state
  const [weeklyGoal, setWeeklyGoal] = useState(user?.settings?.weekly_goal || 4);
  const [defaultRest, setDefaultRest] = useState(user?.settings?.default_rest_seconds || 90);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Account deletion modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await settingsApi.updateProfile({
        name: name.trim(),
        email: email.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      await refreshUser();
      showToast('Profile information updated', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to update profile'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await settingsApi.updateSettings({
        weekly_goal: Number(weeklyGoal),
        default_rest_seconds: Number(defaultRest),
      });
      await refreshUser();
      showToast('Training preferences saved', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to update preferences'), 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await settingsApi.updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password updated successfully', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to change password'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await settingsApi.deleteAccount(deletePassword || undefined);
      logout();
      navigate('/login');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete account'), 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Profile &amp; Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage your personal athlete profile, weight units, theme preferences, and account
          security.
        </p>
      </div>

      {/* Athlete Profile Section */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-charcoal-800 pb-3">
          <UserIcon className="w-4 h-4 text-lime-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Athlete Profile
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-14 h-14 rounded-full object-cover border border-lime-400/50"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-lime-400/20 border border-lime-400/40 flex items-center justify-center text-lime-500 dark:text-lime-400 font-extrabold text-lg">
              {name.slice(0, 2).toUpperCase() || 'FT'}
            </div>
          )}
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Profile Photo URL (Optional)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-xs sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-xs font-semibold uppercase text-slate-400 mb-1"
            >
              Display Name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="block text-xs font-semibold uppercase text-slate-400 mb-1"
            >
              Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="profile-bio"
            className="block text-xs font-semibold uppercase text-slate-400 mb-1"
          >
            Training Bio / Goals
          </label>
          <textarea
            id="profile-bio"
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share your current training block or strength goals..."
            className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-xs transition-colors"
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Units, Theme & Workout Goal Preferences */}
      <form
        onSubmit={handleSavePreferences}
        className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-charcoal-800 pb-3">
          <Sliders className="w-4 h-4 text-lime-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Preferences &amp; Goals
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Weight Unit Preference
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['kg', 'lbs'] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setWeightUnitPreference(u)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-colors ${
                    weightUnit === u
                      ? 'bg-lime-400 text-charcoal-950 border-lime-400'
                      : 'bg-slate-50 dark:bg-charcoal-950 border-slate-200 dark:border-charcoal-700 text-slate-400'
                  }`}
                >
                  {u === 'kg' ? 'Kilograms (KG)' : 'Pounds (LBS)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Interface Theme
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['dark', 'light'] as ThemeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setThemePreference(m)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-colors ${
                    theme === m
                      ? 'bg-lime-400 text-charcoal-950 border-lime-400'
                      : 'bg-slate-50 dark:bg-charcoal-950 border-slate-200 dark:border-charcoal-700 text-slate-400'
                  }`}
                >
                  {m === 'dark' ? 'Dark Charcoal (Default)' : 'Light Mode'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label
              htmlFor="weekly-goal-input"
              className="block text-xs font-semibold uppercase text-slate-400 mb-1"
            >
              Weekly Workout Goal (Days / Week)
            </label>
            <input
              id="weekly-goal-input"
              type="number"
              min={1}
              max={14}
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="default-rest-input"
              className="block text-xs font-semibold uppercase text-slate-400 mb-1"
            >
              Default Rest Timer (Seconds)
            </label>
            <input
              id="default-rest-input"
              type="number"
              min={15}
              max={600}
              step={15}
              value={defaultRest}
              onChange={(e) => setDefaultRest(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPrefs}
            className="px-5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-xs transition-colors"
          >
            {savingPrefs ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Password & Security Section */}
      <form
        onSubmit={handleChangePassword}
        className="rounded-xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800 p-6 space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-charcoal-800 pb-3">
          <Lock className="w-4 h-4 text-lime-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Security &amp; Password
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="current-password"
              className="block text-xs font-semibold uppercase text-slate-400 mb-1"
            >
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-semibold uppercase text-slate-400 mb-1"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-charcoal-700 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPassword || !currentPassword || !newPassword}
            className="px-5 py-2 rounded-lg bg-slate-200 dark:bg-charcoal-800 hover:bg-lime-400 hover:text-charcoal-950 disabled:opacity-40 font-bold text-xs transition-colors"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* Session & Account Danger Zone */}
      <div className="rounded-xl bg-white dark:bg-charcoal-900 border border-red-500/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Session &amp; Account Management
          </h2>
          <p className="text-xs text-slate-400">
            Sign out of your current device or permanently delete your account and workout data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-charcoal-700 text-xs font-bold hover:border-lime-400 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-charcoal-900 border border-red-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Delete Account Permanently?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              This action is permanent and cannot be undone. All of your workouts, sets, routines,
              custom exercises, and personal records will be deleted.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Confirm Password (Optional for Demo)
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password to confirm..."
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-charcoal-700 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-charcoal-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs"
              >
                {deletingAccount ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
