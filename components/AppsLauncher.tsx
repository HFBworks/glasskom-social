
import React, { useState, useEffect } from 'react';
import { User, ConnectedAccount } from '../types';
import Button from './Button';
import Avatar from './Avatar';
import Logo from './Logo';
import { FileText, Table2, Presentation, Calendar, Video, Mail, HardDrive, Settings, ExternalLink, Lock, ChevronDown, Check, Construction, RefreshCw } from 'lucide-react';

interface AppsLauncherProps {
  currentUser: User;
  onNavigateSettings: () => void;
}

const AppsLauncher: React.FC<AppsLauncherProps> = ({ currentUser, onNavigateSettings }) => {
  const accounts = currentUser.preferences?.accounts || [];
  const hiddenApps = currentUser.preferences?.launcherConfig?.hiddenApps || [];
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
      accounts.length > 0 ? accounts[0].id : null
  );
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Update selection if accounts change
  useEffect(() => {
      if (accounts.length > 0 && !accounts.find(a => a.id === selectedAccountId)) {
          setSelectedAccountId(accounts[0].id);
      } else if (accounts.length === 0) {
          setSelectedAccountId(null);
      }
  }, [accounts]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleLaunch = (url: string) => {
    // Standardize opening in new tab
    window.open(url, '_blank');
  };

  // Helper to generate Google Workspace URLs with authuser hint
  const getGoogleUrl = (base: string, account: ConnectedAccount) => {
      // If user provided a custom link override, use that exactly
      // Otherwise, construct a smart link using the authuser param
      return `${base}?authuser=${account.email}`;
  };

  // Connected Google Apps (Context Aware)
  const getGoogleApps = (account: ConnectedAccount) => [
    { 
      id: 'g_docs',
      name: 'Docs', 
      icon: <FileText size={32} className="text-blue-500" />, 
      url: account.customLinks?.docs || getGoogleUrl('https://docs.google.com/document/u/0/', account),
      desc: 'Editor'
    },
    { 
      id: 'g_sheets',
      name: 'Sheets', 
      icon: <Table2 size={32} className="text-green-500" />, 
      url: account.customLinks?.sheets || getGoogleUrl('https://docs.google.com/spreadsheets/u/0/', account),
      desc: 'Sheets'
    },
    { 
      id: 'g_slides',
      name: 'Slides', 
      icon: <Presentation size={32} className="text-yellow-500" />, 
      url: account.customLinks?.slides || getGoogleUrl('https://docs.google.com/presentation/u/0/', account),
      desc: 'Slides'
    },
    { 
      id: 'g_cal',
      name: 'Calendar', 
      icon: <Calendar size={32} className="text-blue-400" />, 
      url: account.customLinks?.calendar || getGoogleUrl('https://calendar.google.com/calendar/u/0/r', account),
      desc: 'Schedule'
    },
    { 
      id: 'g_meet',
      name: 'Meet', 
      icon: <Video size={32} className="text-purple-400" />, 
      url: account.customLinks?.meet || getGoogleUrl('https://meet.google.com/landing', account),
      desc: 'Calls'
    },
    { 
      id: 'g_mail',
      name: 'Gmail', 
      icon: <Mail size={32} className="text-red-500" />, 
      url: account.customLinks?.mail || getGoogleUrl('https://mail.google.com/mail/u/0/', account),
      desc: 'Email'
    },
    { 
      id: 'g_drive',
      name: 'Drive', 
      icon: <HardDrive size={32} className="text-green-400" />, 
      url: account.customLinks?.drive || getGoogleUrl('https://drive.google.com/drive/u/0/', account),
      desc: 'Files'
    }
  ].filter(app => !hiddenApps.includes(app.id));

  return (
    <div className="animate-in fade-in zoom-in-95 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                <Logo size="sm" /> Launcher
            </h2>
            <p className="text-gray-400">Your digital command center.</p>
        </div>
        <div className="flex gap-3">
             {accounts.length > 0 && (
                 <div className="relative">
                     <button 
                        onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
                     >
                         <Avatar src={selectedAccount?.avatarUrl || ''} alt="" size="sm" />
                         <span className="text-sm font-medium text-white max-w-[100px] truncate">
                             {selectedAccount?.email || 'Select Account'}
                         </span>
                         <ChevronDown size={14} className="text-gray-400" />
                     </button>
                     
                     {isSelectorOpen && (
                         <div className="absolute top-full right-0 mt-2 w-64 bg-charcoal-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
                             <div className="px-4 py-2 bg-black/20 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                 Switch Account
                             </div>
                             {accounts.map(acc => (
                                 <button
                                    key={acc.id}
                                    onClick={() => { setSelectedAccountId(acc.id); setIsSelectorOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors"
                                 >
                                     <Avatar src={acc.avatarUrl || ''} alt="" size="sm" />
                                     <div className="flex-1 overflow-hidden">
                                         <p className="text-sm text-white truncate">{acc.email}</p>
                                     </div>
                                     {selectedAccountId === acc.id && <Check size={16} className="text-primary-500" />}
                                 </button>
                             ))}
                             <div className="border-t border-white/5 p-2">
                                 <button 
                                    onClick={onNavigateSettings}
                                    className="w-full text-center py-2 text-xs text-primary-400 hover:text-white transition-colors"
                                 >
                                     Manage Accounts
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
             )}
            <Button variant="secondary" onClick={onNavigateSettings} icon={<Settings size={18} />}>
                Customize
            </Button>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Connected Sync Info */}
        {selectedAccount && (
          <div className="flex items-center gap-4 px-6 py-4 bg-primary-500/5 border border-primary-500/20 rounded-2xl animate-in slide-in-from-top-2">
            <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
               <RefreshCw size={18} className="animate-spin duration-[4000ms]" />
            </div>
            <div>
               <p className="text-xs font-black text-primary-400 uppercase tracking-widest">Active Sync</p>
               <p className="text-sm text-white font-medium">Connected as <span className="text-primary-400">{selectedAccount.email}</span></p>
            </div>
            <div className="ml-auto hidden md:flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
               <span className="text-[10px] text-green-400 font-black uppercase">Data Secure</span>
            </div>
          </div>
        )}

        {/* GlassKom Native Ecosystem - Under Development */}
        <section>
             <h3 className="text-lg font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                 <Logo size="sm" /> Ecosystem
             </h3>
             
             <div className="aero-card p-10 rounded-2xl flex flex-col items-center justify-center text-center border border-white/5 bg-white/[0.02]">
                 <div className="p-5 bg-white/5 rounded-full mb-6 relative group">
                    <Construction size={40} className="text-gray-500 group-hover:text-primary-400 transition-colors" />
                    <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 </div>
                 <h4 className="text-xl font-bold text-white mb-2">Under Development</h4>
                 <p className="text-gray-400 max-w-md text-sm leading-relaxed">
                     We are currently building the next generation of native tools for the GlassKom ecosystem. 
                     Stay tuned for Cloud Storage, Music Streaming, and the Creative Studio.
                 </p>
             </div>
        </section>

        {/* Connected Google Workspace */}
        <section className="aero-card rounded-2xl p-6 min-h-[300px]">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-2">
                <h3 className="text-lg font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                     <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-1">
                         <img src="https://www.google.com/favicon.ico" alt="G" className="w-full h-full" />
                     </div>
                     Connected Workspace
                </h3>
                {selectedAccount && <span className="text-xs text-gray-500 font-mono">Sync Active</span>}
            </div>
            
            {!selectedAccount ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <div className="bg-white/10 p-4 rounded-full mb-4">
                        <Lock size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Account Selected</h3>
                    <p className="text-gray-400 max-w-md mb-6 text-sm">
                        Connect a Google Account in settings to access your workspace tools here.
                    </p>
                    <Button onClick={onNavigateSettings}>
                        Connect Account
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in">
                    {getGoogleApps(selectedAccount).map((app) => (
                        <button
                            key={app.id}
                            onClick={() => handleLaunch(app.url)}
                            className="group flex flex-col items-center justify-center p-6 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                            title={`Open as ${selectedAccount.email}`}
                        >
                            <div className="mb-4 p-4 rounded-full bg-charcoal-900 group-hover:scale-110 transition-transform shadow-lg relative z-10">
                                {app.icon}
                            </div>
                            <h4 className="font-bold text-white mb-1 relative z-10">{app.name}</h4>
                            <p className="text-xs text-gray-500 relative z-10">{app.desc}</p>
                            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary-400 relative z-10">
                                <ExternalLink size={14} />
                            </div>
                            
                            {/* Hover Glow */}
                            <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </button>
                    ))}
                </div>
            )}
        </section>
      </div>
    </div>
  );
};

export default AppsLauncher;
