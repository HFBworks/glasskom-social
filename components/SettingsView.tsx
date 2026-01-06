
import React, { useState, useEffect } from 'react';
import { User, UserPreferences, Post } from '../types';
import Button from './Button';
import PostCard from './PostCard';
import { Type, Palette, AlertTriangle, Check, Trash2, Power, Shield, Eye, Globe, Users, Archive, X, Bell, MessageSquare, Layout, Smartphone, MessageCircle } from 'lucide-react';
import { APP_THEMES, APP_ICONS } from '../constants';
import * as storageService from '../services/storageService';

interface SettingsViewProps {
  currentUser: User;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

const FONTS = [
  { id: 'sans', name: 'Inter', label: 'Aa' },
  { id: 'serif', name: 'Serif', label: 'Tt' },
  { id: 'mono', name: 'Mono', label: '<>' },
];

const SettingsView: React.FC<SettingsViewProps> = ({ 
  currentUser, 
  onUpdatePreferences, 
  onDeactivate, 
  onDelete 
}) => {
  const [currentPrefs, setCurrentPrefs] = useState<UserPreferences>(currentUser.preferences || {
    theme: 'default',
    font: 'sans',
    appIcon: 'dark',
    notificationPopups: true,
    privacy: { showLastSeen: true, defaultPostVisibility: 'public' },
    uiConfig: { notificationBadgeType: 'number', messageBadgeType: 'number' }
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Archive Modal State
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archivedPosts, setArchivedPosts] = useState<Post[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  useEffect(() => {
      if (showArchiveModal) {
          fetchArchivedPosts();
      }
  }, [showArchiveModal]);

  const fetchArchivedPosts = async () => {
      setLoadingArchive(true);
      const posts = await storageService.getArchivedPosts(currentUser.id);
      setArchivedPosts(posts);
      setLoadingArchive(false);
  };

  const handleFontChange = (fontId: 'sans' | 'serif' | 'mono') => {
    const newPrefs = { ...currentPrefs, font: fontId };
    setCurrentPrefs(newPrefs);
    onUpdatePreferences(newPrefs);
  };

  const handleThemeChange = (themeId: string) => {
    const newPrefs = { ...currentPrefs, theme: themeId };
    setCurrentPrefs(newPrefs);
    onUpdatePreferences(newPrefs);
  }

  // Changed 'neon' to 'vibrant' to match UserPreferences and APP_ICONS constants
  const handleIconChange = (iconId: 'dark' | 'light' | 'vibrant' | 'gold') => {
    const newPrefs = { ...currentPrefs, appIcon: iconId };
    setCurrentPrefs(newPrefs);
    onUpdatePreferences(newPrefs);
  }

  const handlePrivacyChange = (key: keyof NonNullable<UserPreferences['privacy']>, value: any) => {
      const currentPrivacy = currentPrefs.privacy || { showLastSeen: true, defaultPostVisibility: 'public' };
      const newPrefs = {
          ...currentPrefs,
          privacy: {
              ...currentPrivacy,
              [key]: value
          }
      };
      setCurrentPrefs(newPrefs);
      onUpdatePreferences(newPrefs);
  }

  const handleUiConfigChange = (key: 'notificationBadgeType' | 'messageBadgeType', value: 'number' | 'dot') => {
      const currentUi = currentPrefs.uiConfig || { notificationBadgeType: 'number', messageBadgeType: 'number' };
      const newPrefs = {
          ...currentPrefs,
          uiConfig: {
              ...currentUi,
              [key]: value
          }
      };
      setCurrentPrefs(newPrefs);
      onUpdatePreferences(newPrefs);
  };

  const toggleNotificationPopups = () => {
      const newPrefs = { ...currentPrefs, notificationPopups: !currentPrefs.notificationPopups };
      setCurrentPrefs(newPrefs);
      onUpdatePreferences(newPrefs);
  };

  const handleDeleteSubmit = async () => {
    if (deleteConfirmation === 'DELETE') {
      setIsDeleting(true);
      try {
          await storageService.deleteUserCompletely(currentUser.id);
          onDelete();
      } catch (e) {
          alert("Error deleting account. You might need to log in again to perform this sensitive action.");
      } finally {
          setIsDeleting(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300 pb-20">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      {/* App Icon Section */}
      <div className="aero-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-tr from-gray-700 to-gray-600 text-white rounded-lg shadow-lg">
            <Smartphone size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">App Icon</h3>
            <p className="text-sm text-gray-400">Personalize your home screen</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
            {APP_ICONS.map(icon => (
                <button
                    key={icon.id}
                    onClick={() => handleIconChange(icon.id as any)}
                    className={`relative flex flex-col items-center gap-2 group transition-all duration-300`}
                >
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 transition-all ${
                        currentPrefs.appIcon === icon.id || (!currentPrefs.appIcon && icon.id === 'dark') 
                        ? 'border-primary-500 scale-110 ring-2 ring-primary-500/30' 
                        : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                    }`}>
                        <img src={icon.dataUrl} alt={icon.label} className="w-full h-full object-cover" />
                    </div>
                    <span className={`text-xs font-medium ${
                        currentPrefs.appIcon === icon.id || (!currentPrefs.appIcon && icon.id === 'dark') 
                        ? 'text-primary-400' 
                        : 'text-gray-500 group-hover:text-gray-300'
                    }`}>
                        {icon.label}
                    </span>
                </button>
            ))}
        </div>
      </div>

      {/* Theme Section */}
      <div className="aero-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-primary text-white rounded-lg shadow-lg">
            <Palette size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">App Theme</h3>
            <p className="text-sm text-gray-400">Choose your vibrant style</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {APP_THEMES.map(theme => (
                <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`relative h-20 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 group border-2 ${
                        currentPrefs.theme === theme.id || (!currentPrefs.theme && theme.id === 'default') 
                        ? 'border-white ring-2 ring-white/30 scale-105 shadow-xl' 
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{
                        background: `linear-gradient(135deg, ${theme.start}, ${theme.end})`
                    }}
                >
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                        <span className="text-white font-bold text-xs drop-shadow-md px-2 text-center uppercase tracking-wide">
                            {theme.label}
                        </span>
                    </div>
                    {(currentPrefs.theme === theme.id || (!currentPrefs.theme && theme.id === 'default')) && (
                         <div className="absolute top-1 right-1 bg-white text-black rounded-full p-0.5 shadow-sm">
                             <Check size={12} strokeWidth={3} />
                         </div>
                    )}
                </button>
            ))}
        </div>
      </div>

      {/* Interface Settings */}
      <div className="aero-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Layout size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">Interface & Alerts</h3>
        </div>

        <div className="space-y-4">
            {/* Real-time Popups */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                 <div className="flex items-center gap-3">
                    <Bell className="text-primary-400" size={20} />
                    <div>
                        <p className="text-gray-200 font-medium">Real-time Popups</p>
                        <p className="text-xs text-gray-500">Show a toast when you receive new alerts.</p>
                    </div>
                </div>
                <div 
                    onClick={toggleNotificationPopups}
                    className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors ${currentPrefs.notificationPopups !== false ? 'bg-primary-500' : 'bg-gray-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentPrefs.notificationPopups !== false ? 'left-7' : 'left-1'}`}></div>
                </div>
            </div>

            {/* Notification Badge Setting */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                 <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white">1</div>
                    <div>
                        <p className="text-gray-200 font-medium">Notification Badge</p>
                        <p className="text-xs text-gray-500">Choose how new notifications appear.</p>
                    </div>
                </div>
                <div className="flex bg-black/40 rounded-lg p-1">
                    <button 
                        onClick={() => handleUiConfigChange('notificationBadgeType', 'number')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${currentPrefs.uiConfig?.notificationBadgeType !== 'dot' ? 'bg-charcoal-600 text-white' : 'text-gray-500'}`}
                    >
                        Count
                    </button>
                    <button 
                        onClick={() => handleUiConfigChange('notificationBadgeType', 'dot')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${currentPrefs.uiConfig?.notificationBadgeType === 'dot' ? 'bg-charcoal-600 text-white' : 'text-gray-500'}`}
                    >
                        Dot
                    </button>
                </div>
            </div>

            {/* Message Badge Setting */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                 <div className="flex items-center gap-3">
                    <MessageCircle className="text-gray-400" size={20} />
                    <div>
                        <p className="text-gray-200 font-medium">Message Badge</p>
                        <p className="text-xs text-gray-500">Choose how unread messages appear.</p>
                    </div>
                </div>
                <div className="flex bg-black/40 rounded-lg p-1">
                    <button 
                        onClick={() => handleUiConfigChange('messageBadgeType', 'number')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${currentPrefs.uiConfig?.messageBadgeType !== 'dot' ? 'bg-charcoal-600 text-white' : 'text-gray-500'}`}
                    >
                        Count
                    </button>
                    <button 
                        onClick={() => handleUiConfigChange('messageBadgeType', 'dot')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${currentPrefs.uiConfig?.messageBadgeType === 'dot' ? 'bg-charcoal-600 text-white' : 'text-gray-500'}`}
                    >
                        Dot
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="aero-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
            <Shield size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">Privacy</h3>
        </div>

        <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                    <Eye className="text-gray-400" size={20} />
                    <div>
                        <p className="text-gray-200 font-medium">Show "Last Seen" Status</p>
                        <p className="text-xs text-gray-500">Allow others to see when you were last online.</p>
                    </div>
                </div>
                <div 
                    onClick={() => handlePrivacyChange('showLastSeen', !currentPrefs.privacy?.showLastSeen)}
                    className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors ${currentPrefs.privacy?.showLastSeen ? 'bg-primary-500' : 'bg-gray-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentPrefs.privacy?.showLastSeen ? 'left-7' : 'left-1'}`}></div>
                </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                 <div className="flex items-center gap-3">
                    {currentPrefs.privacy?.defaultPostVisibility === 'friends' ? <Users className="text-gray-400" size={20} /> : <Globe className="text-gray-400" size={20} />}
                    <div>
                        <p className="text-gray-200 font-medium">Default Post Visibility</p>
                        <p className="text-xs text-gray-500">New posts will use this setting by default.</p>
                    </div>
                </div>
                <div className="flex bg-black/40 rounded-lg p-1">
                    <button 
                        onClick={() => handlePrivacyChange('defaultPostVisibility', 'public')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${currentPrefs.privacy?.defaultPostVisibility === 'public' ? 'bg-charcoal-600 text-white' : 'text-gray-500'}`}
                    >
                        Public
                    </button>
                    <button 
                        onClick={() => handlePrivacyChange('defaultPostVisibility', 'friends')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${currentPrefs.privacy?.defaultPostVisibility === 'friends' ? 'bg-charcoal-600 text-white' : 'text-gray-500'}`}
                    >
                        Friends
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="aero-card rounded-2xl p-6 border-l-4 border-l-red-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-red-500/20">
            <div>
              <h4 className="font-medium text-gray-200">Deactivate Profile</h4>
              <p className="text-sm text-gray-500">Hide your profile and content until you log in again.</p>
            </div>
            <Button variant="secondary" onClick={() => setShowDeactivateModal(true)}>
              Deactivate
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl border border-red-500/30">
            <div>
              <h4 className="font-medium text-red-400">Delete Profile</h4>
              <p className="text-sm text-red-300/70">Permanently delete your account and all data.</p>
            </div>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="aero-card rounded-2xl w-full max-w-md p-6 shadow-2xl border-t-4 border-red-500 border-b border-l border-r border-white/10">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <Trash2 />
              <h3 className="text-xl font-bold">Delete Account</h3>
            </div>
            <p className="text-gray-300 mb-6">
              This action is <span className="font-bold text-white">irreversible</span>. All your posts, comments, and profile data will be permanently removed.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm
              </label>
              <input 
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full aero-input rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="DELETE"
                disabled={isDeleting}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)} className="text-gray-300 hover:text-white" disabled={isDeleting}>Cancel</Button>
              <Button 
                variant="danger" 
                onClick={handleDeleteSubmit}
                disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                isLoading={isDeleting}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
