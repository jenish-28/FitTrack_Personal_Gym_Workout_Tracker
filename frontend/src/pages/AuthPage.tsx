import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Lock, Mail, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';
import { authApi, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const { loginWithToken, showToast } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'register') {
        if (name.trim().length < 2) {
          throw new Error('Please enter your name (at least 2 characters).');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const res = await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        loginWithToken(res.access_token, res.user);
        showToast(`Welcome to FitTrack, ${res.user.name}!`, 'success');
        navigate('/');
      } else {
        const res = await authApi.login({
          email: email.trim(),
          password,
        });
        loginWithToken(res.access_token, res.user);
        showToast(`Welcome back, ${res.user.name}!`, 'success');
        navigate('/');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Authentication failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.demoLogin();
      loginWithToken(res.access_token, res.user);
      showToast('Signed in with Development Demo Athlete account', 'success');
      navigate('/');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to sign into demo account'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal-950 text-slate-100 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-lime-400 text-charcoal-950 shadow-md">
            <Dumbbell className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Fit<span className="text-lime-400">Track</span>
          </h1>
          <p className="text-sm text-slate-400">
            Personal Gym &amp; Strength Progression Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl bg-charcoal-900 border border-charcoal-800 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="grid grid-cols-2 p-1 rounded-lg bg-charcoal-950 border border-charcoal-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-lime-400 text-charcoal-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-lime-400 text-charcoal-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-medium"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-charcoal-950 border border-charcoal-700 text-sm text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@fittrack.app"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-charcoal-950 border border-charcoal-700 text-sm text-white focus:outline-none focus:border-lime-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-charcoal-950 border border-charcoal-700 text-sm text-white focus:outline-none focus:border-lime-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-charcoal-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span>{submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-charcoal-800" />
            <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Or Instant Dev Access
            </span>
            <div className="flex-grow border-t border-charcoal-800" />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleDemoLogin}
            className="w-full py-2.5 px-4 rounded-lg border border-lime-400/40 bg-lime-400/10 hover:bg-lime-400/20 text-lime-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-lime-400" />
            <span>Continue with Demo Athlete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
