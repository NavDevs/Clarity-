import React, { useState, useEffect } from 'react';

interface SettingsViewProps {
  token: string;
  username: string;
  authProvider?: string;
  onLogout: () => void;
  vigilantMode: boolean;
  onToggleVigilantMode: () => void;
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  token,
  username,
  authProvider,
  onLogout,
  vigilantMode,
  onToggleVigilantMode,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'engine'>('profile');
  
  // Profile State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  // Engine State
  const [scanSensitivity, setScanSensitivity] = useState('Balanced');

  useEffect(() => {
    const saved = localStorage.getItem('clarity_scan_sensitivity');
    if (saved) setScanSensitivity(saved);
  }, []);

  const handleSaveSensitivity = (mode: string) => {
    setScanSensitivity(mode);
    localStorage.setItem('clarity_scan_sensitivity', mode);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("Password must be at least 6 characters.");
      return;
    }

    setIsUpdatingPwd(true);
    try {
      const res = await fetch('/api/auth/update_password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.detail || "Failed to update password.");
      } else {
        setPwdSuccess("Password updated successfully.");
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPwdError("Network error occurred.");
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  return (
    <div className="flex flex-col relative z-10 w-full h-full bg-[var(--color-background)] overflow-y-auto overflow-x-hidden p-8 md:p-16">
      <div className="absolute top-0 right-0 pointer-events-none opacity-5 select-none -z-10">
        <span className="font-display font-bold text-[15rem] leading-none tracking-tighter text-[var(--color-foreground)]">CFG</span>
      </div>

      <div className="flex flex-col w-full max-w-5xl mx-auto relative z-20">
        <div className="flex flex-col mb-12">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-[var(--color-foreground)] tracking-tighter mb-4">
            Settings.
          </h1>
          <div className="flex items-center gap-4">
            <span className="w-12 h-1 bg-[var(--color-accent)] block" />
            <span className="font-mono text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-[0.2em]">
              Preferences & Profile
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          {/* Side Menu */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <button 
              onClick={onBack}
              className="flex items-center gap-3 px-4 py-4 text-left transition-colors border-l-2 border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)]"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Back</span>
            </button>
            <div className="h-px bg-[var(--color-border)] my-2"></div>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-4 py-4 text-left transition-colors border-l-2 ${activeTab === 'profile' ? 'border-[var(--color-accent)] bg-[var(--color-card)] text-[var(--color-foreground)]' : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)]'}`}
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider">My Profile</span>
            </button>
            <button 
              onClick={() => setActiveTab('engine')}
              className={`flex items-center gap-3 px-4 py-4 text-left transition-colors border-l-2 ${activeTab === 'engine' ? 'border-[var(--color-accent)] bg-[var(--color-card)] text-[var(--color-foreground)]' : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)]'}`}
            >
              <span className="material-symbols-outlined text-[20px]">settings_suggest</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Engine Config</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-[var(--color-card)] border border-[var(--color-border)] p-8 md:p-12 min-h-[500px]">
            
            {activeTab === 'profile' && (
              <div className="flex flex-col max-w-md">
                <h2 className="font-display font-bold text-2xl text-[var(--color-foreground)] mb-8">Profile Configuration</h2>
                
                <div className="mb-8">
                  <label className="block font-mono text-xs text-[var(--color-muted-foreground)] uppercase mb-2">Username / Email</label>
                  <div className="bg-[var(--color-input)] border border-[var(--color-border)] p-4 text-sm font-mono text-[var(--color-foreground)] opacity-70 flex items-center justify-between">
                    <span>{username}</span>
                    {authProvider === 'google' && (
                      <span className="bg-[#4285F4]/20 text-[#4285F4] px-2 py-1 text-[10px] font-bold uppercase tracking-wider">Google Account</span>
                    )}
                  </div>
                </div>

                {authProvider !== 'google' ? (
                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4 mb-12">
                    <h3 className="font-mono text-xs font-bold text-[var(--color-foreground)] uppercase tracking-[0.1em] border-b border-[var(--color-border)] pb-2 mb-2">Change Password</h3>
                  
                  {pwdError && <div className="text-red-500 font-mono text-xs bg-red-500/10 p-4 border border-red-500/20">{pwdError}</div>}
                  {pwdSuccess && <div className="text-green-500 font-mono text-xs bg-green-500/10 p-4 border border-green-500/20">{pwdSuccess}</div>}
                  
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    className="bg-[var(--color-input)] border border-[var(--color-border)] h-12 px-4 text-sm font-mono text-[var(--color-foreground)] focus:border-[var(--color-accent)] outline-none"
                    required
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="bg-[var(--color-input)] border border-[var(--color-border)] h-12 px-4 text-sm font-mono text-[var(--color-foreground)] focus:border-[var(--color-accent)] outline-none"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-[var(--color-input)] border border-[var(--color-border)] h-12 px-4 text-sm font-mono text-[var(--color-foreground)] focus:border-[var(--color-accent)] outline-none"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={isUpdatingPwd || !oldPassword || !newPassword || !confirmPassword}
                    className="btn-primary h-12 text-xs mt-2 disabled:opacity-50"
                  >
                    {isUpdatingPwd ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
                ) : (
                  <div className="mb-12">
                    <h3 className="font-mono text-xs font-bold text-[var(--color-foreground)] uppercase tracking-[0.1em] border-b border-[var(--color-border)] pb-2 mb-4">Authentication</h3>
                    <p className="text-sm font-mono text-[var(--color-muted-foreground)]">
                      You are signed in using your Google Account. Password changes are managed through Google.
                    </p>
                  </div>
                )}

                <div className="mt-auto pt-8 border-t border-[var(--color-border)]">
                  <h3 className="font-mono text-xs font-bold text-red-500 uppercase tracking-[0.1em] mb-4">Danger Zone</h3>
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 h-12 border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors font-mono text-xs font-bold uppercase tracking-wider"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out of Account
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'engine' && (
              <div className="flex flex-col">
                <h2 className="font-display font-bold text-2xl text-[var(--color-foreground)] mb-8">Engine Configuration</h2>

                {/* AI Key Notice */}
                <div className="p-6 bg-[var(--color-input)] border border-[var(--color-border)] space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-[var(--color-foreground)] font-bold font-mono text-sm uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[var(--color-accent)] text-[24px]">check_circle</span>
                    Groq AI Integration Ready
                  </div>
                  <p className="text-[var(--color-muted-foreground)] text-sm leading-relaxed max-w-xl">
                    Your Groq API Key is loaded automatically from system environment variables. 
                    <strong className="text-[var(--color-foreground)]"> Llama 3.3 70B</strong> powers real-time, lightning-fast codebase reasoning.
                  </p>
                </div>

                {/* Scan Sensitivity */}
                <div className="mb-12">
                  <label className="block text-[var(--color-foreground)] font-mono text-xs tracking-widest uppercase font-semibold mb-4">
                    Scan Sensitivity
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-[var(--color-border)] p-1 bg-[var(--color-input)] max-w-lg">
                    {['Strict', 'Balanced', 'Fast'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleSaveSensitivity(mode)}
                        className={`py-4 px-4 font-mono text-xs tracking-widest uppercase transition-colors ${
                          scanSensitivity === mode
                            ? 'bg-[var(--color-accent)] text-[var(--color-background)] font-bold'
                            : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-background)]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vigilant Mode Toggle */}
                <div className="flex items-start justify-between p-6 bg-[var(--color-input)] border border-[var(--color-border)] max-w-lg">
                  <div>
                    <h4 className="font-mono text-sm font-semibold tracking-widest uppercase text-[var(--color-foreground)] mb-2">Vigilant Background Mode</h4>
                    <p className="text-[var(--color-muted-foreground)] text-sm leading-relaxed max-w-sm pr-4">
                      Continuously monitor active GitHub repositories for secret leaks and schema drifts.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onToggleVigilantMode();
                      localStorage.setItem('clarity_vigilant_mode', (!vigilantMode).toString());
                    }}
                    className={`w-14 h-8 rounded-none transition-colors relative p-1 mt-1 border ${
                      vigilantMode ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'bg-[var(--color-muted)] border-[var(--color-border)]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-none transition-transform ${
                        vigilantMode ? 'translate-x-6 bg-[var(--color-background)]' : 'translate-x-0 bg-[var(--color-muted-foreground)]'
                      }`}
                    />
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
