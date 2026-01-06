
import React, { useState, useRef, useEffect } from 'react';
import { Home, Bell, Settings, LogOut, MessageSquare, User as UserIcon, Users, Grid, LogIn, Sparkles, Globe, Compass } from 'lucide-react';
import { ViewState, User } from '../types';
import Avatar from './Avatar';
import Logo from './Logo';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentUser: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
  unreadCount?: number;
  unreadMessageCount?: number;
  onAssistantLandingReq?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onChangeView, 
  currentUser, 
  onLogout, 
  onLoginClick, 
  unreadCount = 0, 
  unreadMessageCount = 0, 
  onAssistantLandingReq 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: ViewState.ASSISTANT, label: 'Assistant', icon: Sparkles, isPrimary: true },
    { id: ViewState.HOME, label: 'Home', icon: Home },
    { id: ViewState.EXPLORE, label: 'Explore', icon: Compass },
    { id: ViewState.COMMUNITIES, label: 'Communities', icon: Users },
    { id: ViewState.MESSAGES, label: 'Messages', icon: MessageSquare, auth: true, badge: unreadMessageCount },
    { id: ViewState.FRIENDS, label: 'Friends', icon: Globe, auth: true },
    { id: ViewState.NOTIFICATIONS, label: 'Notifications', icon: Bell, auth: true, badge: unreadCount },
    { id: ViewState.APPS, label: 'Apps', icon: Grid, auth: true },
  ];

  const filteredItems = navItems.filter(item => !item.auth || currentUser);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="hidden md:flex flex-col h-screen sticky top-0 py-6 pr-6 w-24 lg:w-64 z-50">
      <div className="flex flex-col items-center lg:items-start mb-8 px-4 cursor-pointer" onClick={() => onChangeView(ViewState.ASSISTANT)}>
        <Logo size="md" />
      </div>

      <nav className="flex-1 space-y-2 px-2">
        {filteredItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                  onChangeView(item.id);
                  if (item.id === ViewState.ASSISTANT && onAssistantLandingReq) onAssistantLandingReq();
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 relative group ${
                isActive 
                  ? 'bg-gradient-primary text-white shadow-lg shadow-primary-500/20 border border-white/10' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              } ${item.isPrimary ? 'mb-6 bg-primary-500/5 border border-primary-500/20' : ''}`}
            >
              <div className="relative">
                  <item.icon size={22} className={isActive ? 'text-white' : 'group-hover:text-white transition-colors'} />
                  {item.badge && item.badge > 0 ? (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[18px] h-4.5 flex items-center justify-center border-2 border-charcoal-900 shadow-xl px-1 animate-in zoom-in">
                          {item.badge > 9 ? '9+' : item.badge}
                      </span>
                  ) : null}
              </div>
              <span className="hidden lg:block text-sm font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-4 relative" ref={menuRef}>
        {isMenuOpen && currentUser && (
          <div className="absolute bottom-full left-0 mb-4 bg-charcoal-800/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl p-2 w-60 animate-in slide-in-from-bottom-4">
            <div className="px-4 py-3 border-b border-white/5 mb-2">
                <p className="font-black text-white text-xs uppercase tracking-widest truncate">{currentUser.name}</p>
                <p className="text-[10px] text-gray-500 font-mono truncate mt-0.5">{currentUser.handle}</p>
            </div>
            <button onClick={() => { onChangeView(ViewState.PROFILE); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-200 hover:bg-white/5 rounded-xl transition-colors"><UserIcon size={14} />View Profile</button>
            <button onClick={() => { onChangeView(ViewState.SETTINGS); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-200 hover:bg-white/5 rounded-xl transition-colors"><Settings size={14} />Settings</button>
            <div className="h-px bg-white/5 my-1 mx-2"></div>
            <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"><LogOut size={14} />Sign Out</button>
          </div>
        )}
        <button 
          onClick={() => currentUser ? setIsMenuOpen(!isMenuOpen) : onLoginClick()} 
          className="p-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-inner"
        >
          <Avatar src={currentUser?.avatarUrl} alt="" isGuest={!currentUser} size="md" />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
