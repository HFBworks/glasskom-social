import React, { useState, useEffect } from 'react';
import { User, Post, AI_AGENT_ID } from '../types';
import * as storageService from '../services/storageService';
import Avatar from './Avatar';
import Button from './Button';
import { Search, UserPlus, UserMinus, Users, Globe, Wifi, ShieldCheck, RefreshCw, Clock, Check } from 'lucide-react';

interface FriendsViewProps {
  currentUser: User;
  onViewProfile: (userId: string) => void;
}

type TabState = 'DISCOVER' | 'FRIENDS' | 'REQUESTS' | 'SUGGESTIONS' | 'SEARCH_ALL';

const FriendsView: React.FC<FriendsViewProps> = ({ currentUser, onViewProfile }) => {
  const [activeTab, setActiveTab] = useState<TabState>('DISCOVER');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'reconnecting'>('connected');
  const [isRefreshingDb, setIsRefreshingDb] = useState(false);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<{users: User[]}>({ users: [] });
  
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    loadSocialData();
    const timer = setInterval(() => setNow(Date.now()), 10000); // Check every 10s
    return () => clearInterval(timer);
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) handleSearch();
    else setSearchResults({ users: [] });
  }, [searchQuery]);

  const loadSocialData = async () => {
    setLoading(true);
    try {
        const usersData = await storageService.getUsers();
        const humanUsers = usersData.filter(u => u.id !== AI_AGENT_ID);
        setAllUsers(humanUsers);
        
        const myUser = usersData.find(u => u.id === currentUser.id);
        if (myUser) {
            setFriends(humanUsers.filter(u => (myUser.friends || []).includes(u.id)));
            setRequests(humanUsers.filter(u => (myUser.friendRequests || []).includes(u.id)));
            setSuggestions(humanUsers.filter(u => 
                u.id !== currentUser.id && 
                !(myUser.friends || []).includes(u.id) && 
                !(myUser.friendRequests || []).includes(u.id) &&
                !(myUser.friendRequestsSent || []).includes(u.id)
            ));
        }
    } catch (e) {
        setDbStatus('reconnecting');
    } finally {
        setLoading(false);
    }
  };

  const handleSearch = async () => {
      const results = await storageService.searchApp(searchQuery);
      setSearchResults({ users: results.users.filter(u => u.id !== AI_AGENT_ID) });
  };

  const handleSendRequest = async (target: User) => {
      await storageService.sendFriendRequest(currentUser.id, target.id);
      window.dispatchEvent(new CustomEvent('new_notification', { 
        detail: { content: `Friend request sent to ${target.name}`, id: Date.now().toString(), recipientId: currentUser.id } 
      }));
      loadSocialData();
  };

  const handleCancelRequest = async (target: User) => {
      if (confirm(`Cancel friend request to ${target.name}?`)) {
          await storageService.cancelFriendRequest(currentUser.id, target.id);
          loadSocialData();
      }
  };

  const handleAcceptRequest = async (requester: User) => {
      await storageService.acceptFriendRequest(currentUser.id, requester.id);
      loadSocialData();
  };

  const handleUnfriend = async (target: User) => {
      if (confirm(`Remove ${target.name} from your connections?`)) {
          await storageService.removeFriend(currentUser.id, target.id);
          loadSocialData();
      }
  };

  const isUserOnline = (user: User) => {
      if (!user || user.id === AI_AGENT_ID) return true;
      if (!user.isOnline || !user.lastSeen) return false;
      const lastSeenDate = (user.lastSeen as any).toDate ? (user.lastSeen as any).toDate() : new Date(user.lastSeen);
      // Synchronized threshold: 2 minutes
      return (now - lastSeenDate.getTime()) < 2 * 60 * 1000;
  };

  const renderUserCard = (user: User) => {
      if (!user) return null;
      const isFriend = (currentUser.friends || []).includes(user.id);
      const isMe = user.id === currentUser.id;
      const hasSentRequest = (currentUser.friendRequestsSent || []).includes(user.id);
      const hasIncomingRequest = (currentUser.friendRequests || []).includes(user.id);
      const online = isUserOnline(user);

      return (
        <div key={user.id} className="aero-card p-4 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-colors border border-white/5">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(user.id)}>
                <div className="relative">
                    <Avatar src={user.avatarUrl} alt={user.name} size="lg" />
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-charcoal-900 ${online ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
                </div>
                <div>
                    <h4 className="font-bold text-gray-100 flex items-center gap-1">
                        {user.name}
                        {isMe && <span className="text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded uppercase">You</span>}
                    </h4>
                    <p className="text-sm text-gray-400">{user.handle}</p>
                </div>
            </div>

            <div className="flex gap-2">
                {!isMe && (
                    <>
                        {hasIncomingRequest ? (
                            <div className="flex gap-1">
                                <Button size="sm" onClick={() => handleAcceptRequest(user)} icon={<Check size={14}/>}>Confirm</Button>
                                <Button size="sm" variant="secondary" onClick={() => storageService.declineFriendRequest(currentUser.id, user.id).then(loadSocialData)}>X</Button>
                            </div>
                        ) : isFriend ? (
                            <Button size="sm" variant="secondary" onClick={() => handleUnfriend(user)} icon={<UserMinus size={16} />}>
                                Unfriend
                            </Button>
                        ) : hasSentRequest ? (
                            <Button size="sm" variant="ghost" className="text-amber-400 hover:bg-amber-400/10" onClick={() => handleCancelRequest(user)} icon={<Clock size={16} />}>
                                Pending
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => handleSendRequest(user)} icon={<UserPlus size={16} />}>
                                Add
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-20 animate-in fade-in">
        <div className="sticky top-0 z-30 bg-charcoal-900/80 backdrop-blur-md pb-4 border-b border-white/5 pt-2">
            <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for people..."
                    className="w-full aero-input rounded-full py-3 pl-12 pr-4 text-base outline-none"
                />
            </div>

            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400"><Users size={18} /></div>
                    <p className="text-sm font-bold text-white">{allUsers.length} <span className="text-gray-400 font-normal">Total Users</span></p>
                </div>
                <div className={`text-[9px] font-bold flex items-center gap-1 ${dbStatus === 'connected' ? 'text-green-400' : 'text-amber-400'}`}>
                    {dbStatus === 'connected' ? 'CONNECTED' : 'RECONNECTING...'} <Wifi size={10} className="animate-pulse" />
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button onClick={() => setActiveTab('DISCOVER')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'DISCOVER' ? 'bg-gradient-primary text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Discover</button>
                <button onClick={() => setActiveTab('FRIENDS')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'FRIENDS' ? 'bg-gradient-primary text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Friends ({friends.length})</button>
                <button onClick={() => setActiveTab('REQUESTS')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'REQUESTS' ? 'bg-gradient-primary text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Requests ({requests.length})</button>
            </div>
        </div>

        <div className="space-y-3">
            {loading && !allUsers.length ? (
                <div className="py-10 text-center animate-pulse text-gray-500">Loading people...</div>
            ) : (
                <>
                    {searchQuery ? searchResults.users.map(renderUserCard) : (
                        <>
                            {activeTab === 'DISCOVER' && allUsers.map(renderUserCard)}
                            {activeTab === 'FRIENDS' && friends.map(renderUserCard)}
                            {activeTab === 'REQUESTS' && requests.map(renderUserCard)}
                            {activeTab === 'DISCOVER' && allUsers.length === 0 && <p className="text-center text-gray-500 py-10">No users found.</p>}
                        </>
                    )}
                </>
            )}
        </div>
    </div>
  );
};

export default FriendsView;