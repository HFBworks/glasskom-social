
import React, { useState, useEffect } from 'react';
import { User, Post } from '../types';
import * as storageService from '../services/storageService';
import PostCard from './PostCard';
import Avatar from './Avatar';
import Button from './Button';
import { MapPin, Calendar, Link as LinkIcon, Edit3, Grid, Image as ImageIcon, Heart, Wifi, Clock } from 'lucide-react';
import EditProfileModal from './EditProfileModal';
import { formatDistanceToNow } from 'date-fns';

interface ProfileViewProps {
  userId: string;
  currentUser: User | null;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userId, currentUser }) => {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribe = storageService.subscribeToUser(userId, (u) => {
        setUser(u);
    });
    loadPosts();

    const timer = setInterval(() => setNow(Date.now()), 30000); // Update relative time every 30s
    return () => {
        unsubscribe();
        clearInterval(timer);
    };
  }, [userId]);

  const loadPosts = async () => {
    setLoading(true);
    const p = await storageService.getPosts(userId);
    setPosts(p || []);
    setLoading(false);
  };

  if (loading && !user) return <div className="text-center py-20 animate-pulse text-gray-500 font-mono tracking-widest uppercase">Initializing...</div>;
  if (!user) return <div className="text-center py-20 text-gray-500">User not found.</div>;

  const isMe = currentUser?.id === user.id;

  // Real-time Presence Logic
  const isOnline = () => {
      if (!user.isOnline || !user.lastSeen) return false;
      const lastSeenDate = (user.lastSeen as any).toDate ? (user.lastSeen as any).toDate() : new Date(user.lastSeen);
      // Considered online if active in the last 2 minutes (matches 1min heartbeat + buffer)
      return (now - lastSeenDate.getTime()) < 2 * 60 * 1000;
  };

  const getStatusLabel = () => {
      if (isOnline()) return <span className="text-green-400 flex items-center gap-1.5"><Wifi size={10} className="animate-pulse" /> Active Now</span>;
      if (!user.lastSeen) return <span className="text-gray-500">Offline</span>;
      const lastSeenDate = (user.lastSeen as any).toDate ? (user.lastSeen as any).toDate() : new Date(user.lastSeen);
      return <span className="text-gray-500 flex items-center gap-1.5"><Clock size={10} /> Last seen {formatDistanceToNow(lastSeenDate, { addSuffix: true })}</span>;
  };

  const userFriends = user.friends || [];
  const userPostsCount = posts.length || 0;

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="aero-card rounded-[2.5rem] overflow-hidden mb-8 shadow-2xl border border-white/10">
        <div className="h-48 bg-gradient-primary relative">
          {user.coverUrl && <img src={user.coverUrl} className="w-full h-full object-cover opacity-60" />}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-charcoal-900/80"></div>
        </div>
        
        <div className="px-8 pb-8 -mt-16 relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div className="relative p-1 bg-charcoal-900 rounded-full">
               <Avatar src={user.avatarUrl} alt={user.name} size="xl" />
               <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-charcoal-900 ${isOnline() ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`}></div>
            </div>
            {isMe && (
              <Button onClick={() => setIsEditModalOpen(true)} variant="secondary" icon={<Edit3 size={18} />}>
                Edit Profile
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white">{user.name}</h1>
                <div className="text-[10px] font-black uppercase tracking-widest mt-1">
                    {getStatusLabel()}
                </div>
            </div>
            <p className="text-primary-400 font-mono text-sm">{user.handle}</p>
            {user.bio && <p className="text-gray-300 text-base leading-relaxed mt-4 max-w-lg">{user.bio}</p>}
            
            <div className="flex flex-wrap gap-4 mt-6 text-sm text-gray-500 font-medium">
              <span className="flex items-center gap-1.5"><Calendar size={14} /> Joined GlassKom</span>
              {user.email && <span className="flex items-center gap-1.5"><LinkIcon size={14} /> {user.email}</span>}
            </div>
          </div>
          
          <div className="flex gap-8 mt-8 border-t border-white/5 pt-6">
            <div className="text-center">
              <p className="text-xl font-black text-white">{userPostsCount}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-white">{userFriends.length}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Friends</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Feed */}
      <div className="space-y-6 pb-24">
        <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Grid size={20} className="text-primary-500" /> Posts
            </h3>
            <div className="flex gap-2">
              <div className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"><ImageIcon size={18} /></div>
              <div className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"><Heart size={18} /></div>
            </div>
        </div>
        
        {posts.length === 0 ? (
          <div className="aero-card p-12 text-center rounded-3xl border border-white/5 opacity-50">
            <p className="text-gray-500 italic">No posts yet.</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUser={currentUser} 
              onCommentAdd={(pid, c) => storageService.addComment(pid, {id: 'c_'+Date.now(), user: currentUser!, content: c, createdAt: new Date(), likes: 0})} 
              onLikeToggle={(pid) => storageService.toggleLike(pid, currentUser?.id || 'guest')}
            />
          ))
        )}
      </div>

      {isMe && currentUser && (
        <EditProfileModal 
          currentUser={currentUser} 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          onSave={(u) => {
            storageService.updateUser(u).then(() => loadPosts());
            setIsEditModalOpen(false);
          }} 
        />
      )}
    </div>
  );
};

export default ProfileView;