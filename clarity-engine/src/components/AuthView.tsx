import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { ViewMode } from '../types';

interface AuthViewProps {
  onLogin: (token: string, username: string, authProvider?: string) => void;
  onNavigate: (view: ViewMode) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin, onNavigate }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    
    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed");
      }
      
      onLogin(data.access_token, data.username, data.auth_provider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Google Authentication failed");
      }
      
      onLogin(data.access_token, data.username, data.auth_provider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google Login failed. Please try again.");
  };

  return (
    <div className="flex flex-col items-center justify-center relative z-10 w-full h-full bg-[var(--color-background)] overflow-y-auto overflow-x-hidden p-6">
      
      {/* Background Decorative Layer */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-5 select-none -z-10">
        <span className="font-display font-bold text-[20rem] md:text-[30rem] leading-none tracking-tighter text-[var(--color-foreground)]">02</span>
      </div>

      <div className="w-full max-w-md bg-[var(--color-card)] border border-[var(--color-border)] p-8 shadow-2xl relative z-20">
        <div className="flex items-center gap-4 mb-8">
          <span className="w-12 h-1 bg-[var(--color-accent)] block" />
          <span className="font-mono text-sm font-semibold text-[var(--color-accent)] uppercase tracking-[0.2em]">
            {isLogin ? "Authenticate" : "Initialize"}
          </span>
        </div>
        
        <h2 className="font-display font-bold text-4xl text-[var(--color-foreground)] tracking-tighter mb-8">
          {isLogin ? "Welcome Back." : "Create Account."}
        </h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-900 text-red-500 font-mono text-xs uppercase tracking-wider">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-[0.1em]">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-[var(--color-input)] border border-[var(--color-border)] h-12 px-4 text-sm font-mono focus:border-[var(--color-accent)] focus:outline-none transition-colors rounded-none"
              placeholder="admin"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-[0.1em]">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[var(--color-input)] border border-[var(--color-border)] h-12 px-4 text-sm font-mono focus:border-[var(--color-accent)] focus:outline-none transition-colors rounded-none"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full mt-4 h-12"
          >
            {loading ? "Processing..." : (isLogin ? "Login" : "Register")}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-[var(--color-border)] flex-1"></div>
          <span className="font-mono text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest">OR</span>
          <div className="h-px bg-[var(--color-border)] flex-1"></div>
        </div>
        
        <div className="w-full flex justify-center mt-2">
          {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              shape="square"
            />
          ) : (
            <button
              onClick={() => handleGoogleSuccess({ credential: 'mock_testuser@google.com' })}
              className="w-full h-10 border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-input)] flex items-center justify-center gap-3 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">Sign in with Google (Dev Mock)</span>
            </button>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="font-mono text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] uppercase tracking-wider transition-colors"
          >
            {isLogin ? "Need an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
      
      <button 
        onClick={() => onNavigate('landing')}
        className="mt-8 font-mono text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] uppercase tracking-wider transition-colors"
      >
        ← Back to Home
      </button>
    </div>
  );
};
