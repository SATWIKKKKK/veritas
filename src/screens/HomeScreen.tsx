import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HomeScreen() {
  const { user, authToken, signOut } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const copyToken = () => {
    if (authToken) {
      navigator.clipboard.writeText(authToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Mask token for display
  const displayToken = authToken 
    ? `${authToken.substring(0, 20)}...[MASKED_FOR_SECURITY]...${authToken.substring(authToken.length - 20)}`
    : 'No active session token.';

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* TopAppBar */}
      <header className="hidden md:flex bg-[#F5F5F1] dark:bg-[#111111] docked full-width top-0 border-b border-[#E5E5E1] dark:border-[#2A2A2A] flat no-shadows w-full z-50">
        <div className="flex justify-between items-center w-full px-8 py-4 max-w-360 mx-auto">
          <div className="font-headline-md italic text-2xl text-[#111111] dark:text-[#E5E5E1]">Vertisa</div>
          <nav className="flex gap-8">
            <a href="#" className="font-technical-mono uppercase tracking-widest text-[10px] font-semibold text-[#111111] dark:text-[#FFFFFF] border-b border-[#111111] dark:border-[#FFFFFF] pb-1 cursor-pointer opacity-90 hover:opacity-100 transition-colors duration-300">System</a>
            <a href="#" className="font-technical-mono uppercase tracking-widest text-[10px] font-semibold text-[#A1A1A1] dark:text-[#555555] cursor-pointer opacity-90 hover:opacity-100 hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors duration-300">Logs</a>
            <a href="#" className="font-technical-mono uppercase tracking-widest text-[10px] font-semibold text-[#A1A1A1] dark:text-[#555555] cursor-pointer opacity-90 hover:opacity-100 hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors duration-300">Access</a>
          </nav>
          <div className="flex items-center gap-4 text-[#111111] dark:text-[#E5E5E1]">
            <button onClick={handleSignOut} className="font-ui-label text-ui-label text-primary hover:text-outline transition-colors duration-200">Sign Out</button>
            <span className="material-symbols-outlined cursor-pointer opacity-90 hover:opacity-100">account_circle</span>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="grow max-w-360 mx-auto w-full px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-24 md:px-16 md:py-16 md:pb-16 relative z-10 flex flex-col gap-10 md:gap-12">
        
        {/* Welcome Header */}
        <section className="flex flex-col gap-2">
          <h1 className="font-display-xl text-4xl sm:text-5xl md:text-display-xl text-primary font-bold leading-[1.05]">Welcome Back, Operator</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Session authenticated. Protocol active. Awaiting secure instructions.
          </p>
        </section>

        {/* Bento Grid Layout */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Security Card (Spans 8 cols) */}
          <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 relative overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-outline">key</span>
              <h2 className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest">Active Session Token</h2>
            </div>
            
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
              <p className="font-technical-mono text-technical-mono text-on-surface break-all opacity-70">
                {displayToken}
              </p>
              <div className="flex flex-col gap-4 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
                <span className="font-technical-mono break-all">UID: {user?.uid || 'N/A'}</span>
                
                <button 
                  onClick={copyToken}
                  className="flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 border border-outline-variant rounded-full font-ui-label text-ui-label text-primary hover:bg-surface-variant transition-colors duration-200"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied ? 'Copied!' : 'Copy Token'}
                </button>
              </div>
            </div>
            
            {/* Decorative structural lines */}
            <div className="absolute top-0 left-8 w-[1px] h-full bg-outline-variant opacity-30"></div>
            <div className="absolute top-8 left-0 w-full h-[1px] bg-outline-variant opacity-30"></div>
          </div>

          {/* Status Indicator Card (Spans 4 cols) */}
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-outline">security</span>
              <h2 className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest">System Status</h2>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 border-b border-outline-variant pb-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-body-md text-body-md text-on-surface">Connection</span>
                <div className="bg-secondary-container px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#111111]"></div>
                  <span className="font-technical-mono text-technical-mono text-on-secondary-container uppercase">Secure</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-b border-outline-variant pb-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-body-md text-body-md text-on-surface">Uptime</span>
                <span className="font-technical-mono text-technical-mono text-on-surface-variant">99.99%</span>
              </div>
              <div className="flex flex-col gap-2 border-b border-outline-variant pb-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-body-md text-body-md text-on-surface">Last Sync</span>
                <span className="font-technical-mono text-technical-mono text-on-surface-variant">Just now</span>
              </div>
            </div>
          </div>

          {/* Contextual Image Card (Spans 12 cols) */}
          <div className="md:col-span-12 h-52 sm:h-64 bg-surface-variant rounded-xl overflow-hidden relative group">
            <img 
              alt="Security Abstract" 
              className="w-full h-full object-cover grayscale opacity-80 mix-blend-multiply transition-transform duration-700 group-hover:scale-105" 
              src="https://images.unsplash.com/photo-1555952494-efd681c7e3f9?q=80&w=2070&auto=format&fit=crop" 
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent"></div>
            <div className="absolute bottom-6 left-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              <span className="font-ui-label text-ui-label text-white uppercase tracking-widest">Firewall Active</span>
            </div>
          </div>
        </section>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden bg-[#F5F5F1]/80 dark:bg-[#111111]/80 backdrop-blur-md fixed bottom-0 left-0 w-full z-50 border-t border-[#E5E5E1] dark:border-[#2A2A2A] transition-all duration-200 ease-in-out flex justify-around items-center h-16 px-4">
        <a href="#" className="flex flex-col items-center gap-1 p-2 text-[#111111] dark:text-[#FFFFFF] font-bold hover:bg-[#E5E5E1]/30 rounded-lg">
          <span className="material-symbols-outlined">fingerprint</span>
          <span className="font-technical-mono text-[10px] uppercase tracking-tighter">Identity</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1 p-2 text-[#A1A1A1] dark:text-[#555555] hover:bg-[#E5E5E1]/30 rounded-lg transition-all duration-200 ease-in-out">
          <span className="material-symbols-outlined">shield</span>
          <span className="font-technical-mono text-[10px] uppercase tracking-tighter">Security</span>
        </a>
        <button onClick={handleSignOut} className="flex flex-col items-center gap-1 p-2 text-[#A1A1A1] dark:text-[#555555] hover:bg-[#E5E5E1]/30 rounded-lg transition-all duration-200 ease-in-out">
          <span className="material-symbols-outlined">logout</span>
          <span className="font-technical-mono text-[10px] uppercase tracking-tighter">Sign Out</span>
        </button>
      </nav>
    </div>
  );
}
