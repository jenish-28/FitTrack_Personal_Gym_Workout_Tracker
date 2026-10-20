import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Dumbbell,
  PlayCircle,
  BookOpen,
  ClipboardList,
  History,
  TrendingUp,
  Trophy,
  Settings,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/workout', label: 'Workout Logger', icon: PlayCircle },
  { to: '/routines', label: 'Routines', icon: ClipboardList },
  { to: '/exercises', label: 'Exercises', icon: BookOpen },
  { to: '/history', label: 'History', icon: History },
  { to: '/progress', label: 'Analytics', icon: TrendingUp },
  { to: '/records', label: 'Records', icon: Trophy },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Layout: React.FC = () => {
  const { user, theme, weightUnit, setThemePreference, setWeightUnitPreference, logout, toasts, dismissToast } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const hasLocalDraft = Boolean(localStorage.getItem('fittrack_active_workout_draft'));
  const isOnWorkoutPage = location.pathname.startsWith('/workout');

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-charcoal-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 dark:border-charcoal-800 bg-white dark:bg-charcoal-900 z-30">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200 dark:border-charcoal-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-lime-400 flex items-center justify-center text-charcoal-950 shadow-sm">
              <Dumbbell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                Fit<span className="text-lime-500 dark:text-lime-400">Track</span>
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold -mt-1">
                Performance Log
              </span>
            </div>
          </div>
        </div>

        {/* Quick Start Button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => navigate('/workout')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-lime-400 hover:bg-lime-300 text-charcoal-950 font-bold text-sm transition-colors shadow-sm"
          >
            <PlayCircle className="w-4 h-4 stroke-[2.5]" />
            {hasLocalDraft ? 'Resume Workout' : 'Start Workout'}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Sidebar Navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-lime-400/15 text-lime-600 dark:text-lime-400 font-semibold border border-lime-400/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-charcoal-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Controls & User Profile */}
        <div className="p-4 border-t border-slate-200 dark:border-charcoal-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            {/* Unit Toggle */}
            <button
              type="button"
              onClick={() => setWeightUnitPreference(weightUnit === 'kg' ? 'lbs' : 'kg')}
              className="flex-1 py-1.5 px-2.5 rounded-md text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-charcoal-700 bg-slate-100 dark:bg-charcoal-800 text-slate-700 dark:text-slate-300 hover:border-lime-400/50 transition-colors"
              title="Toggle Weight Unit (KG / LBS)"
            >
              Unit: <span className="text-lime-600 dark:text-lime-400">{weightUnit.toUpperCase()}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setThemePreference(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-md border border-slate-200 dark:border-charcoal-700 bg-slate-100 dark:bg-charcoal-800 text-slate-700 dark:text-slate-300 hover:border-lime-400/50 transition-colors"
              aria-label="Toggle Theme"
              title="Toggle Dark/Light Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-lime-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {user && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-lime-400/20 border border-lime-400/40 flex items-center justify-center text-lime-600 dark:text-lime-400 font-bold text-xs shrink-0">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-md transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur border-b border-slate-200 dark:border-charcoal-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-lime-400 flex items-center justify-center text-charcoal-950">
            <Dumbbell className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-base tracking-tight">
            Fit<span className="text-lime-500 dark:text-lime-400">Track</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeightUnitPreference(weightUnit === 'kg' ? 'lbs' : 'kg')}
            className="px-2 py-1 rounded text-xs font-bold uppercase border border-slate-200 dark:border-charcoal-700 bg-slate-100 dark:bg-charcoal-800"
          >
            {weightUnit}
          </button>
          <button
            type="button"
            onClick={() => setThemePreference(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded border border-slate-200 dark:border-charcoal-700 bg-slate-100 dark:bg-charcoal-800"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-lime-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-20 md:pb-8">
        {/* Active Workout Banner when navigated away */}
        {hasLocalDraft && !isOnWorkoutPage && (
          <div className="bg-lime-400/15 border-b border-lime-400/30 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-lime-700 dark:text-lime-300">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span>Active workout session in progress (autosaved)</span>
            </div>
            <button
              onClick={() => navigate('/workout')}
              className="px-3 py-1 rounded-md bg-lime-400 text-charcoal-950 font-bold text-xs hover:bg-lime-300 transition-colors"
            >
              Return to Logger
            </button>
          </div>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-charcoal-900 border-t border-slate-200 dark:border-charcoal-800 grid grid-cols-6 h-16"
        aria-label="Mobile Navigation"
      >
        {[
          NAV_ITEMS[0],
          NAV_ITEMS[1],
          NAV_ITEMS[2],
          NAV_ITEMS[3],
          NAV_ITEMS[5],
          NAV_ITEMS[7],
        ].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isActive
                  ? 'text-lime-600 dark:text-lime-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span className="truncate max-w-[56px]">{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>

      {/* Toast Notifications */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${
              t.type === 'error'
                ? 'bg-red-950/95 border-red-500/40 text-red-200'
                : t.type === 'info'
                ? 'bg-charcoal-800/95 border-slate-600/40 text-slate-100'
                : 'bg-charcoal-900/95 border-lime-400/50 text-lime-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : t.type === 'info' ? (
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
              )}
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-slate-400 hover:text-white p-0.5"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
