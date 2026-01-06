
import React, { useState, useEffect } from 'react';
import { Post, ViewState, User, UserPreferences, Comment, CallType, CallStatus, Notification } from './types';
import Sidebar from './components/Sidebar';
import CreatePost from './components/CreatePost';
import PostCard from './components/PostCard';
import Auth from './components/Auth';
import SettingsView from './components/SettingsView';
import MessagesView from './components/MessagesView';
import FriendsView from './components/FriendsView';
import NotificationsView from './components/NotificationsView';
import CommunitiesView from './components/CommunitiesView';
import CommunityPage from './components/CommunityPage';
import ExploreView from './components/ExploreView';
import AppsLauncher from './components/AppsLauncher';
import AssistantView from './components/AssistantView';
import CallOverlay from './components/CallOverlay';
import ProfileView from './components/ProfileView';
import InstallPrompt from './components/InstallPrompt';
import { LogOut, MessageSquare, Bell, Home, X, Sparkles, Users, RefreshCw, Compass } from 'lucide-react';
import * as storageService from './services/storageService';
import { APP_THEMES } from './constants';
import { format } from 'date-fns';

const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-bottom-5 fade-in duration-300 w-[92%] md:w-auto">
    <div className="aero-panel px-6 py-4 rounded-3xl flex items-center gap-4 border border-primary-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-charcoal-900/90 backdrop-blur-2xl">
      <div className="p-2 bg-primary-500/20 text-primary-400 rounded-2xl shrink-0 border border-primary-500/20"><Sparkles size={18} /></div>
      <p className="text-sm font-bold text-white flex-1">{message}</p>
      <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={16} /></button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.ASSISTANT); 
  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);
  const [viewedCommunityId, setViewedCommunityId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [assistantLandingTrigger, setAssistantLandingTrigger] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  useEffect(() => {
    const initApp = async () => {
      await storageService.initializeDB();
    };
    initApp();

    const unsubscribeAuth = storageService.observeAuth(async (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
      setLastSyncTime(new Date());
    });

    return () => unsubscribeAuth();
  }, []);

  const refreshFeed = async () => {
    const newPosts = await storageService.getPosts();
    setPosts(newPosts || []);
    setLastSyncTime(new Date());
  };

  useEffect(() => {
    refreshFeed();
    const interval = setInterval(refreshFeed, 30000); // 30s auto-refresh for feed
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUser) {
        const u1 = storageService.subscribeToUnreadNotifications(currentUser.id, setUnreadNotifications);
        const handleNewNotification = (e: any) => {
            const notif = e.detail as Notification;
            if (notif.recipientId === currentUser.id) {
                const tid = 'toast_' + Date.now();
                setToasts(prev => [...prev, { id: tid, message: notif.content }]);
                setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 5000);
            }
        };
        window.addEventListener('new_notification', handleNewNotification);
        return () => { u1(); window.removeEventListener('new_notification', handleNewNotification); };
    }
  }, [currentUser?.id]);

  const handleLogout = async () => { await storageService.logout(); setCurrentUser(null); setCurrentView(ViewState.ASSISTANT); };

  const handleAuthClick = (mode: 'login' | 'register' = 'login') => {
      setAuthMode(mode);
      setIsAuthModalOpen(true);
  };

  const renderContent = () => {
    switch(currentView) {
      case ViewState.ASSISTANT: return (
        <AssistantView currentUser={currentUser} onBack={() => setCurrentView(ViewState.HOME)} onLoginClick={(mode) => handleAuthClick(mode)} landingTrigger={assistantLandingTrigger} />
      );
      case ViewState.HOME: return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-2xl mx-auto px-4 md:px-0">
           <div className="flex items-center justify-between mb-8 pt-6">
              <div>
                <h2 className="text-3xl font-black text-white">Feed</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Last Synced: {format(lastSyncTime, 'HH:mm:ss')}</p>
              </div>
              <button onClick={refreshFeed} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all">
                  <RefreshCw size={20} className="text-primary-400" />
              </button>
           </div>
           <CreatePost currentUser={currentUser} onPostCreate={async (c, i) => { 
               await storageService.createPost({ id: 'p_'+Date.now(), user: currentUser!, content: c, imageUrl: i, likes: 0, comments: [], createdAt: new Date(), visibility: 'public' });
               refreshFeed();
           }} />
           <div className="space-y-6">
              {posts.map(post => (
                <PostCard 
                  key={post.id} post={post} currentUser={currentUser} 
                  onCommentAdd={async (pid, c) => { await storageService.addComment(pid, {id: 'c_'+Date.now(), user: currentUser!, content: c, createdAt: new Date(), likes: 0}); refreshFeed(); }} 
                  onLikeToggle={async (pid) => { await storageService.toggleLike(pid, currentUser?.id || 'guest'); refreshFeed(); }} 
                  onUserClick={(uid) => { setViewedProfileId(uid); setCurrentView(ViewState.PROFILE); }} onAuthRequired={() => handleAuthClick('login')}
                />
              ))}
           </div>
        </div>
      );
      case ViewState.EXPLORE: return <ExploreView currentUser={currentUser} onViewProfile={(uid) => { setViewedProfileId(uid); setCurrentView(ViewState.PROFILE); }} />;
      case ViewState.PROFILE: return viewedProfileId ? <ProfileView userId={viewedProfileId} currentUser={currentUser} /> : null;
      case ViewState.NOTIFICATIONS: return currentUser ? <NotificationsView currentUser={currentUser} /> : null;
      case ViewState.FRIENDS: return currentUser ? <FriendsView currentUser={currentUser} onViewProfile={(uid) => { setViewedProfileId(uid); setCurrentView(ViewState.PROFILE); }} /> : null;
      case ViewState.MESSAGES: return currentUser ? <MessagesView currentUser={currentUser} onInitiateCall={(cid, ou, t) => setActiveCall({cid, ou, t, status: 'calling', isCaller: true})} /> : null;
      case ViewState.COMMUNITIES: return <CommunitiesView currentUser={currentUser || {id: 'guest'} as User} onNavigateToCommunity={(id) => { setViewedCommunityId(id); setCurrentView(ViewState.COMMUNITY_PAGE); }} onAuthRequired={() => handleAuthClick('register')} />;
      case ViewState.SETTINGS: return currentUser ? <SettingsView currentUser={currentUser} onUpdatePreferences={(p) => storageService.updateUser({...currentUser, preferences: p}).then(setCurrentUser)} onDeactivate={handleLogout} onDelete={handleLogout} /> : null;
      case ViewState.APPS: return currentUser ? <AppsLauncher currentUser={currentUser} onNavigateSettings={() => setCurrentView(ViewState.APPS_SETTINGS)} /> : null;
      default: return null;
    }
  };

  const isAiView = currentView === ViewState.ASSISTANT;

  return (
    <div className="min-h-screen bg-charcoal-900 text-gray-100 font-sans overflow-x-hidden">
      <InstallPrompt />
      <div className={`flex flex-col md:flex-row w-full ${isAiView ? 'h-screen' : 'max-w-7xl mx-auto md:px-6 gap-8'}`}>
          <Sidebar 
              currentView={currentView} 
              onChangeView={(v) => { 
                if (v === ViewState.PROFILE) setViewedProfileId(currentUser?.id || null); 
                setCurrentView(v); 
              }} 
              currentUser={currentUser} onLogout={handleLogout} onLoginClick={() => handleAuthClick('login')} 
              unreadCount={unreadNotifications} unreadMessageCount={unreadMessageCount} 
              onAssistantLandingReq={() => setAssistantLandingTrigger(prev => prev + 1)}
          />
          <main className={`flex-1 ${isAiView ? 'h-full' : 'py-8 mb-24 md:mb-0 w-full overflow-y-auto'}`}>{renderContent()}</main>
      </div>

      {!isAiView && (
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 aero-panel px-6 py-4 flex justify-between items-center rounded-[2.5rem] bg-charcoal-900/60 backdrop-blur-3xl border border-white/10">
              <button onClick={() => setCurrentView(ViewState.HOME)} className={`p-2 rounded-2xl ${currentView === ViewState.HOME ? 'text-primary-400' : 'text-gray-500'}`}><Home size={24} /></button>
              <button onClick={() => setCurrentView(ViewState.EXPLORE)} className={`p-2 rounded-2xl ${currentView === ViewState.EXPLORE ? 'text-primary-400' : 'text-gray-500'}`}><Compass size={24} /></button>
              <button onClick={() => setCurrentView(ViewState.ASSISTANT)} className="p-4 bg-gradient-primary rounded-[1.8rem] text-white -mt-12 shadow-xl border-4 border-charcoal-900"><Sparkles size={24} /></button>
              <button onClick={() => { if(!currentUser) handleAuthClick('login'); else setCurrentView(ViewState.MESSAGES); }} className={`p-2 rounded-2xl ${currentView === ViewState.MESSAGES ? 'text-primary-400' : 'text-gray-500'}`}><MessageSquare size={24} /></button>
              <button onClick={() => { if(!currentUser) handleAuthClick('login'); else setCurrentView(ViewState.NOTIFICATIONS); }} className={`p-2 rounded-2xl ${currentView === ViewState.NOTIFICATIONS ? 'text-primary-400' : 'text-gray-500'}`}><Bell size={24} /></button>
          </div>
      )}
      
      {toasts.map(t => <Toast key={t.id} message={t.message} onClose={() => setToasts(prev => prev.filter(i => i.id !== t.id))} />)}
      {isAuthModalOpen && <Auth variant="modal" initialMode={authMode} onLogin={() => setIsAuthModalOpen(false)} onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
};

export default App;
