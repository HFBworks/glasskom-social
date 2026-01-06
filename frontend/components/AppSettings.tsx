
import React, { useState } from 'react';
import { User, UserPreferences, ConnectedAccount } from '../types';
import Button from './Button';
import Avatar from './Avatar';
import { ArrowLeft, Check, AlertCircle, FileText, Table2, Presentation, Link as LinkIcon, LogOut, Plus, Trash2, Mail, Video, HardDrive, Calendar, Eye, EyeOff, Globe, RefreshCw } from 'lucide-react';

declare const google: any;

interface AppSettingsProps {
  currentUser: User;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  onBack: () => void;
}

const AppSettings: React.FC<AppSettingsProps> = ({ currentUser, onUpdatePreferences, onBack }) => {
  const [prefs, setPrefs] = useState<UserPreferences>(currentUser.preferences || {
      theme: 'default',
      font: 'sans',
      privacy: { showLastSeen: true, defaultPostVisibility: 'public' },
      accounts: [],
      launcherConfig: { hiddenApps: [], favorites: [] }
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
      prefs.accounts && prefs.accounts.length > 0 ? prefs.accounts[0].id : null
  );

  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [clientId, setClientId] = useState(''); // Optional: Allow user to input their own Client ID for testing
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Selected Account for Editing Links
  const activeAccount = prefs.accounts?.find(a => a.id === selectedAccountId);

  // Link States (Loaded when account selected)
  const [linkForm, setLinkForm] = useState({
      docs: '', sheets: '', slides: '', mail: '', drive: '', meet: '', calendar: ''
  });

  // Sync form when active account changes
  React.useEffect(() => {
      if (activeAccount) {
          setLinkForm({
              docs: activeAccount.customLinks?.docs || '',
              sheets: activeAccount.customLinks?.sheets || '',
              slides: activeAccount.customLinks?.slides || '',
              mail: activeAccount.customLinks?.mail || '',
              drive: activeAccount.customLinks?.drive || '',
              meet: activeAccount.customLinks?.meet || '',
              calendar: activeAccount.customLinks?.calendar || ''
          });
      }
  }, [activeAccount]);

  // Google OAuth Logic
  const handleGoogleLogin = () => {
    // Note: In a real production app, this Client ID would be an env var from your GCP project.
    // Since we don't have the user's Client ID, we allow them to input one, or we attempt to use a placeholder 
    // which might fail if the origin isn't whitelisted.
    const googleClientId = clientId || "YOUR_GOOGLE_CLIENT_ID_HERE"; 
    
    if (typeof google === 'undefined') {
        alert("Google Scripts not loaded. Please check internet connection.");
        return;
    }

    // @ts-ignore
    const client = google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (response: any) => {
        if (response.access_token) {
           setIsLoadingAuth(true);
           try {
               // Fetch User Info
               const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                   headers: { Authorization: `Bearer ${response.access_token}` }
               }).then(res => res.json());

               const newAccount: ConnectedAccount = {
                   id: `acc_${Date.now()}`,
                   provider: 'google',
                   email: userInfo.email,
                   avatarUrl: userInfo.picture,
                   customLinks: {}
               };

               saveNewAccount(newAccount);

           } catch (e) {
               console.error("Failed to fetch Google profile", e);
               alert("Failed to fetch Google profile details.");
           } finally {
               setIsLoadingAuth(false);
           }
        }
      },
    });
    
    // Check if client ID is dummy
    if (googleClientId === "YOUR_GOOGLE_CLIENT_ID_HERE") {
        if(confirm("To use real Google Login, you need a Google Cloud Client ID. \n\nClick OK to simulate a successful login with a mock account, or Cancel to enter your Client ID.")) {
            // Simulation Path
            const mockAccount: ConnectedAccount = {
                id: `acc_${Date.now()}`,
                provider: 'google',
                email: 'demo.user@gmail.com',
                avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
                customLinks: {}
            };
            saveNewAccount(mockAccount);
            return;
        } else {
           // Let them enter ID
           return; 
        }
    }

    client.requestAccessToken();
  };

  const saveNewAccount = (newAccount: ConnectedAccount) => {
      // Check duplicate
      if (prefs.accounts?.find(a => a.email === newAccount.email)) {
          alert('This account is already connected.');
          return;
      }

      const updatedPrefs = {
          ...prefs,
          accounts: [...(prefs.accounts || []), newAccount]
      };
      
      setPrefs(updatedPrefs);
      onUpdatePreferences(updatedPrefs);
      setIsAddingAccount(false);
      setSelectedAccountId(newAccount.id);
  }

  const handleRemoveAccount = (id: string) => {
      if(confirm('Disconnect this account? Custom links will be lost.')) {
          const updatedPrefs = {
              ...prefs,
              accounts: (prefs.accounts || []).filter(a => a.id !== id)
          };
          setPrefs(updatedPrefs);
          onUpdatePreferences(updatedPrefs);
          if (selectedAccountId === id) setSelectedAccountId(null);
      }
  };

  const handleSaveLinks = (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeAccount) return;

      const updatedAccounts = (prefs.accounts || []).map(acc => {
          if (acc.id === activeAccount.id) {
              return {
                  ...acc,
                  customLinks: { ...linkForm }
              };
          }
          return acc;
      });

      const updatedPrefs = { ...prefs, accounts: updatedAccounts };
      setPrefs(updatedPrefs);
      onUpdatePreferences(updatedPrefs);
      alert('Links updated for ' + activeAccount.email);
  };

  const toggleAppVisibility = (appId: string) => {
      const currentHidden = prefs.launcherConfig?.hiddenApps || [];
      let newHidden;
      if (currentHidden.includes(appId)) {
          newHidden = currentHidden.filter(id => id !== appId);
      } else {
          newHidden = [...currentHidden, appId];
      }

      const updatedPrefs = {
          ...prefs,
          launcherConfig: {
              ...prefs.launcherConfig,
              hiddenApps: newHidden
          }
      };
      setPrefs(updatedPrefs);
      onUpdatePreferences(updatedPrefs);
  };

  return (
    <div className="animate-in fade-in pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ArrowLeft size={16} /> Back to Launcher
      </button>

      <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">App Settings</h2>
            <p className="text-gray-400">Manage connections and customize your launcher.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Account List & Visibility */}
          <div className="space-y-6">
              
              {/* Account Management */}
              <div className="aero-card p-5 rounded-xl">
                  <h3 className="text-lg font-bold text-white mb-4">Connected Accounts</h3>
                  
                  <div className="space-y-3 mb-4">
                      {(prefs.accounts || []).map(acc => (
                          <div 
                            key={acc.id} 
                            onClick={() => setSelectedAccountId(acc.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-2 ${selectedAccountId === acc.id ? 'bg-primary-500/10 border-primary-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                          >
                              <div className="flex items-center justify-between w-full group">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                      <Avatar src={acc.avatarUrl || ''} alt="" size="sm" />
                                      <span className="text-sm font-medium text-gray-200 truncate">{acc.email}</span>
                                  </div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveAccount(acc.id); }}
                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                                    title="Disconnect Account"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-md">
                                 <RefreshCw size={10} className="text-primary-400" />
                                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Last Synced: Just now</span>
                              </div>
                          </div>
                      ))}
                      {(prefs.accounts || []).length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-2">No accounts connected.</p>
                      )}
                  </div>

                  {isAddingAccount ? (
                      <div className="bg-black/20 p-3 rounded-lg animate-in fade-in">
                          <p className="text-xs text-gray-400 mb-2">Connect Google Account:</p>
                          <Button 
                            size="sm" 
                            className="w-full mb-3 flex items-center justify-center gap-2 bg-white text-gray-900 hover:bg-gray-100 border-none"
                            onClick={handleGoogleLogin}
                            isLoading={isLoadingAuth}
                          >
                            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
                            Sign in with Google
                          </Button>

                          {/* Hidden config for advanced users to add Client ID */}
                          <details className="mb-2">
                              <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400">Advanced: Client ID</summary>
                              <input 
                                type="text"
                                placeholder="Google Client ID..."
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="w-full aero-input rounded px-2 py-1 text-xs mt-1 bg-black/40"
                              />
                          </details>

                          <div className="flex justify-end pt-2 border-t border-white/5">
                              <Button size="sm" variant="ghost" onClick={() => setIsAddingAccount(false)}>Cancel</Button>
                          </div>
                      </div>
                  ) : (
                      <Button variant="secondary" className="w-full" onClick={() => setIsAddingAccount(true)} icon={<Plus size={16} />}>
                          Add Account
                      </Button>
                  )}
              </div>

              {/* Launcher Customization (Visibility) */}
              <div className="aero-card p-5 rounded-xl">
                  <h3 className="text-lg font-bold text-white mb-4">App Visibility</h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      {['gk_cloud', 'gk_music', 'gk_studio', 'g_meet', 'g_drive', 'g_mail'].map(appId => {
                          const isHidden = (prefs.launcherConfig?.hiddenApps || []).includes(appId);
                          return (
                              <div key={appId} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors">
                                  <span className="text-sm text-gray-300 capitalize">{appId.replace('gk_', 'GlassKom ').replace('g_', 'Google ')}</span>
                                  <button onClick={() => toggleAppVisibility(appId)} className={`p-1 rounded ${isHidden ? 'text-gray-600' : 'text-primary-400'}`}>
                                      {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>

          {/* Right Column: Configuration Details */}
          <div className="lg:col-span-2">
              <div className="aero-card p-8 rounded-xl min-h-[500px]">
                  {!activeAccount ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500">
                          <div className="p-4 bg-white/5 rounded-full mb-4"><LinkIcon size={32} /></div>
                          <p>Select an account to configure custom links.</p>
                      </div>
                  ) : (
                      <form onSubmit={handleSaveLinks} className="animate-in fade-in">
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                              <Avatar src={activeAccount.avatarUrl || ''} alt="" />
                              <div className="flex-1">
                                  <h3 className="font-bold text-white">Configuring: {activeAccount.email}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                      <p className="text-[10px] text-green-400 font-black uppercase tracking-widest">Connected & Synced</p>
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-4">
                                   <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Office Tools</h4>
                                   <div>
                                       <label className="flex items-center gap-2 text-xs font-bold text-gray-300 mb-1">
                                           <FileText size={12} className="text-blue-500" /> Docs
                                       </label>
                                       <input type="url" className="w-full aero-input rounded px-3 py-2 text-sm" placeholder="https://docs.google.com/..." value={linkForm.docs} onChange={e => setLinkForm({...linkForm, docs: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="flex items-center gap-2 text-xs font-bold text-gray-300 mb-1">
                                           <Table2 size={12} className="text-green-500" /> Sheets
                                       </label>
                                       <input type="url" className="w-full aero-input rounded px-3 py-2 text-sm" placeholder="https://sheets.google.com/..." value={linkForm.sheets} onChange={e => setLinkForm({...linkForm, sheets: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="flex items-center gap-2 text-xs font-bold text-gray-300 mb-1">
                                           <Presentation size={12} className="text-yellow-500" /> Slides
                                       </label>
                                       <input type="url" className="w-full aero-input rounded px-3 py-2 text-sm" placeholder="https://slides.google.com/..." value={linkForm.slides} onChange={e => setLinkForm({...linkForm, slides: e.target.value})} />
                                   </div>
                               </div>

                               <div className="space-y-4">
                                   <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Communications & Files</h4>
                                   <div>
                                       <label className="flex items-center gap-2 text-xs font-bold text-gray-300 mb-1">
                                           <Mail size={12} className="text-red-500" /> Gmail
                                       </label>
                                       <input type="url" className="w-full aero-input rounded px-3 py-2 text-sm" placeholder="https://mail.google.com/..." value={linkForm.mail} onChange={e => setLinkForm({...linkForm, mail: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="flex items-center gap-2 text-xs font-bold text-gray-300 mb-1">
                                           <Video size={12} className="text-purple-500" /> Meet
                                       </label>
                                       <input type="url" className="w-full aero-input rounded px-3 py-2 text-sm" placeholder="https://meet.google.com/..." value={linkForm.meet} onChange={e => setLinkForm({...linkForm, meet: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="flex items-center gap-2 text-xs font-bold text-gray-300 mb-1">
                                           <HardDrive size={12} className="text-green-400" /> Drive
                                       </label>
                                       <input type="url" className="w-full aero-input rounded px-3 py-2 text-sm" placeholder="https://drive.google.com/..." value={linkForm.drive} onChange={e => setLinkForm({...linkForm, drive: e.target.value})} />
                                   </div>
                               </div>
                          </div>

                          <div className="mt-8 flex justify-end">
                              <Button type="submit">Save Configurations</Button>
                          </div>
                      </form>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default AppSettings;
