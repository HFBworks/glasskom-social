
import React, { useState, useEffect, useRef } from 'react';
import { User, Community, Post, CommunityRole } from '../types';
import * as storageService from '../services/storageService';
import Button from './Button';
import Avatar from './Avatar';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import { Users, MessageSquare, Settings, Lock, Globe, ArrowLeft, Camera, Trash2, Check } from 'lucide-react';

interface CommunityPageProps {
  currentUser: User;
  communityId: string;
  onBack: () => void;
  onPostCreate: (content: string, image?: string, tags?: string[], visibility?: 'public' | 'friends', communityId?: string) => void;
  onChatClick?: () => void;
}

const CommunityPage: React.FC<CommunityPageProps> = ({ currentUser, communityId, onBack, onPostCreate, onChatClick }) => {
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'feed' | 'about' | 'members' | 'settings'>('feed');
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCover, setEditCover] = useState('');
  const [memberDetails, setMemberDetails] = useState<User[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [communityId]);

  useEffect(() => {
      if (activeTab === 'settings' || activeTab === 'members') {
          loadMemberDetails();
      }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    const [comm, commPosts] = await Promise.all([
        storageService.getCommunity(communityId),
        storageService.getPosts(undefined, communityId)
    ]);
    setCommunity(comm);
    setPosts(commPosts);
    
    if (comm) {
        setEditName(comm.name);
        setEditDesc(comm.description);
        setEditAvatar(comm.avatarUrl);
        setEditCover(comm.coverUrl);
    }
    setLoading(false);
  };

  const loadMemberDetails = async () => {
      if (!community) return;
      const ids = Object.keys(community.members);
      // Ideally batch fetch, for now loop
      const details: User[] = [];
      for (const id of ids) {
          const u = await storageService.getUserById(id);
          if (u) details.push(u);
      }
      setMemberDetails(details);
  };

  const handleJoin = async () => {
    if (!currentUser || currentUser.id === 'guest') return;
    await storageService.joinCommunity(communityId, currentUser.id);
    loadData();
  };

  const handleLeave = async () => {
    if (!currentUser || currentUser.id === 'guest') return;
    if(confirm("Are you sure you want to leave this community?")) {
        await storageService.leaveCommunity(communityId, currentUser.id);
        loadData();
    }
  };

  // Settings Actions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setUrl: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
      if (!community) return;
      await storageService.updateCommunity(community.id, {
          name: editName,
          description: editDesc,
          avatarUrl: editAvatar,
          coverUrl: editCover
      });
      alert('Settings saved!');
      loadData();
  };

  const handleRoleChange = async (targetUserId: string, newRole: CommunityRole) => {
      if (!community) return;
      await storageService.updateCommunityMemberRole(community.id, targetUserId, newRole);
      // Optimistic update
      community.members[targetUserId] = newRole;
      setCommunity({...community});
  };

  const handleDeleteCommunity = async () => {
      if (!community) return;
      const confirmName = prompt(`To delete this community, type "${community.name}" below:`);
      if (confirmName === community.name) {
          await storageService.deleteCommunity(community.id);
          onBack();
      } else {
          alert('Name did not match. Deletion cancelled.');
      }
  };

  if (loading) return <div className="p-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>;
  if (!community) return <div className="p-10 text-center">Community not found.</div>;

  const role = currentUser?.id ? community.members[currentUser.id] : undefined; 
  const isMember = !!role;
  const isCreator = role === 'creator';
  const memberCount = Object.keys(community.members).length;

  return (
    <div className="animate-in fade-in pb-20">
      {/* Back Button */}
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4">
        <ArrowLeft size={16} /> Back to Communities
      </button>

      {/* Header / Cover */}
      <div className="aero-card rounded-xl overflow-hidden mb-6 relative">
          <div className="h-40 bg-gray-800 relative">
             {community.coverUrl ? (
                 <img src={community.coverUrl} className="w-full h-full object-cover opacity-80" alt="Cover" />
             ) : (
                 <div className="w-full h-full bg-gradient-to-r from-blue-900 to-purple-900 opacity-80"></div>
             )}
          </div>
          
          <div className="px-6 pb-6 pt-12 relative">
             <div className="absolute -top-10 left-6 p-1 bg-charcoal-900 rounded-xl">
                 <img src={community.avatarUrl} className="w-20 h-20 rounded-lg bg-gray-800 border border-white/10" alt="Avatar" />
             </div>
             
             <div className="flex justify-between items-start pl-24">
                 <div>
                     <h1 className="text-2xl font-bold text-white">{community.name}</h1>
                     <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                         <span className="flex items-center gap-1">
                             {community.privacy === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                             {community.privacy === 'public' ? 'Public Group' : 'Private Group'}
                         </span>
                         <span>•</span>
                         <span>{memberCount} Members</span>
                     </div>
                 </div>
                 
                 <div className="flex gap-2">
                     {isMember ? (
                         <>
                             <Button size="sm" variant="secondary" icon={<MessageSquare size={16} />} onClick={onChatClick}>
                                 Chat
                             </Button>
                             {!isCreator && (
                                <Button size="sm" variant="danger" onClick={handleLeave}>Leave</Button>
                             )}
                         </>
                     ) : (
                         <Button onClick={handleJoin}>Join Community</Button>
                     )}
                     
                     {isCreator && (
                         <Button 
                            size="sm" 
                            variant={activeTab === 'settings' ? 'primary' : 'ghost'} 
                            icon={<Settings size={18} />} 
                            onClick={() => setActiveTab('settings')} 
                        />
                     )}
                 </div>
             </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-t border-white/5 px-6">
              <button onClick={() => setActiveTab('feed')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'feed' ? 'border-primary-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>Feed</button>
              <button onClick={() => setActiveTab('about')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'about' ? 'border-primary-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>About</button>
              <button onClick={() => setActiveTab('members')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'members' ? 'border-primary-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>Members</button>
              {isCreator && (
                  <button onClick={() => setActiveTab('settings')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>Settings</button>
              )}
          </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
              {activeTab === 'feed' && (
                  <>
                    {isMember && <CreatePost currentUser={currentUser} onPostCreate={async (c, i, t, v, cid) => {
                        await onPostCreate(c, i, t, v, cid);
                        loadData(); // refresh
                    }} communityId={communityId} />}
                    
                    {posts.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No posts yet.</div>
                    ) : (
                        posts.map(post => (
                            <PostCard 
                                key={post.id} 
                                post={post} 
                                currentUser={currentUser} 
                                onCommentAdd={async (pid, c) => {
                                    await storageService.addComment(pid, {
                                        id: `c_${Date.now()}`,
                                        user: currentUser!,
                                        content: c,
                                        createdAt: new Date(),
                                        likes: 0
                                    });
                                    loadData();
                                }}
                                onLikeToggle={async (pid) => {
                                    await storageService.toggleLike(pid, currentUser?.id || 'guest');
                                    loadData();
                                }}
                            />
                        ))
                    )}
                  </>
              )}
              
              {activeTab === 'about' && (
                  <div className="aero-card p-6 rounded-xl">
                      <h3 className="text-xl font-bold text-white mb-2">About this Community</h3>
                      <p className="text-gray-300 whitespace-pre-line">{community.description}</p>
                      
                      <div className="mt-6 pt-4 border-t border-white/10">
                          <p className="text-gray-500 text-sm">Created {community.createdAt.toLocaleDateString()}</p>
                      </div>
                  </div>
              )}

              {activeTab === 'members' && (
                  <div className="aero-card p-4 rounded-xl">
                      <h3 className="font-bold text-white mb-4">Members ({memberCount})</h3>
                      <div className="space-y-2">
                           {memberDetails.length === 0 ? (
                               <div className="text-center py-4 text-gray-500">Loading members...</div>
                           ) : (
                               memberDetails.map(member => (
                                   <div key={member?.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
                                       <div className="flex items-center gap-3">
                                           <Avatar src={member?.avatarUrl} alt={member?.name || ''} />
                                           <div>
                                               <p className="text-sm font-bold text-gray-200">{member?.name}</p>
                                               <p className="text-xs text-gray-500">{member?.handle}</p>
                                           </div>
                                       </div>
                                       <span className="text-xs text-gray-400 capitalize bg-white/5 px-2 py-1 rounded">
                                           {member?.id ? community.members[member.id] : ''}
                                       </span>
                                   </div>
                               ))
                           )}
                      </div>
                  </div>
              )}

              {activeTab === 'settings' && isCreator && (
                  <div className="space-y-6">
                      <div className="aero-card p-6 rounded-xl">
                          <h3 className="text-xl font-bold text-white mb-6">General Settings</h3>
                          
                          {/* Image Settings */}
                          <div className="mb-6 grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-sm font-bold text-gray-400">Icon</label>
                                  <div onClick={() => avatarInputRef.current?.click()} className="w-24 h-24 rounded-xl border border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:bg-white/5 relative overflow-hidden group">
                                      {editAvatar ? <img src={editAvatar} className="w-full h-full object-cover" /> : <Camera className="text-gray-400" />}
                                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-xs text-white">Change</div>
                                  </div>
                                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setEditAvatar)} />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-bold text-gray-400">Cover Image</label>
                                  <div onClick={() => coverInputRef.current?.click()} className="w-full h-24 rounded-xl border border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:bg-white/5 relative overflow-hidden group">
                                      {editCover ? <img src={editCover} className="w-full h-full object-cover" /> : <Camera className="text-gray-400" />}
                                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-xs text-white">Change</div>
                                  </div>
                                  <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setEditCover)} />
                              </div>
                          </div>

                          {/* Text Settings */}
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-sm font-bold text-gray-400 mb-1">Community Name</label>
                                  <input 
                                      type="text" 
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="w-full aero-input rounded-lg p-2.5 outline-none"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-400 mb-1">About</label>
                                  <textarea 
                                      value={editDesc}
                                      onChange={(e) => setEditDesc(e.target.value)}
                                      className="w-full aero-input rounded-lg p-2.5 outline-none h-24 resize-none"
                                  />
                              </div>
                              <div className="flex justify-end pt-2">
                                  <Button onClick={handleSaveSettings} icon={<Check size={16} />}>Save Changes</Button>
                              </div>
                          </div>
                      </div>

                      {/* Member Management */}
                      <div className="aero-card p-6 rounded-xl">
                          <h3 className="text-xl font-bold text-white mb-4">Manage Roles</h3>
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                               {memberDetails.map(member => (
                                   <div key={member?.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                       <div className="flex items-center gap-3">
                                           <Avatar src={member?.avatarUrl} alt={member?.name || ''} size="sm" />
                                           <div>
                                               <p className="text-sm font-bold text-gray-200">{member?.name}</p>
                                               <p className="text-xs text-gray-500">{member?.handle}</p>
                                           </div>
                                       </div>
                                       
                                       {member?.id !== currentUser?.id && (
                                           <select 
                                               value={community.members[member.id]} 
                                               onChange={(e) => handleRoleChange(member.id, e.target.value as CommunityRole)}
                                               className="bg-black/30 text-xs text-white border border-white/10 rounded px-2 py-1 outline-none"
                                           >
                                               <option value="member">Member</option>
                                               <option value="moderator">Moderator</option>
                                           </select>
                                       )}
                                       {member?.id === currentUser?.id && (
                                           <span className="text-xs font-bold text-primary-400">Owner</span>
                                       )}
                                   </div>
                               ))}
                          </div>
                      </div>

                      {/* Danger Zone */}
                      <div className="aero-card p-6 rounded-xl border border-red-500/20">
                          <h3 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h3>
                          <p className="text-gray-400 text-sm mb-4">Irreversible actions.</p>
                          <Button variant="danger" onClick={handleDeleteCommunity} icon={<Trash2 size={16} />}>
                              Delete Community
                          </Button>
                      </div>
                  </div>
              )}
          </div>

          <div className="hidden md:block">
               <div className="aero-card p-4 rounded-xl sticky top-6">
                   <div className="flex items-center gap-2 mb-4">
                       <Avatar src={currentUser?.avatarUrl} alt={currentUser?.name || 'Guest'} size="sm" />
                       <div className="flex-1 overflow-hidden">
                           <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Guest User'}</p>
                           <p className="text-[10px] text-gray-500">{(role || 'Viewer').toUpperCase()}</p>
                       </div>
                   </div>
                   <h3 className="font-bold text-white mb-2">Community Stats</h3>
                   <div className="space-y-2 text-sm text-gray-400">
                       <div className="flex justify-between">
                           <span>Total Posts</span>
                           <span className="text-white font-medium">{posts.length}</span>
                       </div>
                       <div className="flex justify-between">
                           <span>New this week</span>
                           <span className="text-white font-medium">{posts.filter(p => p.createdAt && (Date.now() - new Date(p.createdAt).getTime()) < 7*24*60*60*1000).length}</span>
                       </div>
                   </div>
               </div>
          </div>
      </div>
    </div>
  );
};

export default CommunityPage;
