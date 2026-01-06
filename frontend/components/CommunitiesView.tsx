
import React, { useState, useEffect } from 'react';
import { User, Community } from '../types';
import * as storageService from '../services/storageService';
import Button from './Button';
import Avatar from './Avatar';
import { Plus, Users, Lock, Globe, ArrowRight } from 'lucide-react';

interface CommunitiesViewProps {
  currentUser: User;
  onNavigateToCommunity: (communityId: string) => void;
  onAuthRequired?: () => void;
}

const CommunitiesView: React.FC<CommunitiesViewProps> = ({ currentUser, onNavigateToCommunity, onAuthRequired }) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Create Form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrivacy, setNewPrivacy] = useState<'public' | 'private'>('public');

  useEffect(() => {
    loadCommunities();
    const handleUpdate = () => loadCommunities();
    window.addEventListener('db_update', handleUpdate);
    return () => window.removeEventListener('db_update', handleUpdate);
  }, []);

  const loadCommunities = async () => {
    const list = await storageService.getCommunities();
    setCommunities(list);
  };

  const handleCreateClick = () => {
      if (currentUser.id === 'guest') {
          if (onAuthRequired) onAuthRequired();
          return;
      }
      setIsCreateModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newName || !newDesc) return;
    
    const newComm = await storageService.createCommunity(newName, newDesc, newPrivacy, currentUser.id);
    onNavigateToCommunity(newComm.id);
    setIsCreateModalOpen(false);
    setNewName('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                   <Users size={24} className="text-primary-400" /> Communities
                </h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                    <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">{communities.length} Active Groups</span>
                </div>
            </div>
            {currentUser.id !== 'guest' && (
                <Button onClick={handleCreateClick} icon={<Plus size={18} />}>
                    Create
                </Button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communities.map(comm => {
                const isMember = (currentUser.joinedCommunities || []).includes(comm.id);
                return (
                    <div key={comm.id} className="aero-card p-4 rounded-xl flex flex-col justify-between group hover:bg-white/5 transition-colors">
                        <div className="flex items-start gap-4 mb-3">
                            <Avatar src={comm.avatarUrl} alt={comm.name} size="lg" />
                            <div>
                                <h3 className="font-bold text-white text-lg group-hover:text-primary-400 transition-colors">{comm.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                    <span className="flex items-center gap-1">
                                        {comm.privacy === 'public' ? <Globe size={10} /> : <Lock size={10} />}
                                        {comm.privacy === 'public' ? 'Public' : 'Private'}
                                    </span>
                                    <span>•</span>
                                    <span>{Object.keys(comm.members || {}).length} Members</span>
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-2">{comm.description}</p>
                            </div>
                        </div>
                        
                        <div className="mt-2 pt-3 border-t border-white/5 flex justify-between items-center">
                            <div className="flex -space-x-2">
                                {[...Array(Math.min(3, Object.keys(comm.members).length))].map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-gray-700 border border-charcoal-900"></div>
                                ))}
                            </div>
                            <Button 
                                size="sm" 
                                variant={isMember ? 'secondary' : 'primary'}
                                onClick={() => onNavigateToCommunity(comm.id)}
                            >
                                {isMember ? 'Enter' : 'Join'}
                            </Button>
                        </div>
                    </div>
                );
            })}
            
            {communities.length === 0 && (
                <div className="col-span-2 text-center py-10 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No communities found. Be the first to create one!</p>
                </div>
            )}
        </div>

        {/* Create Modal */}
        {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <div className="aero-card rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10 animate-in zoom-in-95">
                    <h3 className="text-xl font-bold text-white mb-4">Create a Community</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1">Name</label>
                            <input 
                                type="text" 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full aero-input rounded-lg p-2.5 outline-none"
                                placeholder="e.g. AI Enthusiasts"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-1">Description</label>
                            <textarea 
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                className="w-full aero-input rounded-lg p-2.5 outline-none"
                                rows={3}
                                placeholder="What is this community about?"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2">Privacy</label>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setNewPrivacy('public')}
                                    className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors ${newPrivacy === 'public' ? 'bg-primary-500/20 border-primary-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                >
                                    <Globe size={20} />
                                    <span className="text-sm font-bold">Public</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setNewPrivacy('private')}
                                    className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors ${newPrivacy === 'private' ? 'bg-primary-500/20 border-primary-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                >
                                    <Lock size={20} />
                                    <span className="text-sm font-bold">Private</span>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button type="submit">Create Community</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default CommunitiesView;
