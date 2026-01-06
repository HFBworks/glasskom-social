
import React, { useState, useEffect } from 'react';
import { Post, User, ViewState } from '../types';
import * as storageService from '../services/storageService';
import PostCard from './PostCard';
import Avatar from './Avatar';
import { Hash, TrendingUp, Calendar, Newspaper, ArrowRight, X, Search, User as UserIcon, Sparkles } from 'lucide-react';

interface ExploreViewProps {
  currentUser: User | null;
  onPostAction?: () => void;
  onViewProfile?: (userId: string) => void;
}

const ExploreView: React.FC<ExploreViewProps> = ({ currentUser, onPostAction, onViewProfile }) => {
  const [trendingTopics, setTrendingTopics] = useState<{tag: string, count: number}[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('For You');
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchResults, setSearchResults] = useState<{users: User[], posts: Post[]} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const DEFAULT_TOPICS = ['For You', 'Today', 'Tech'];

  useEffect(() => {
      loadData();
  }, []);

  useEffect(() => {
      if (searchQuery.length > 2) {
          handleGlobalSearch();
      } else {
          setSearchResults(null);
          if (!loading) loadTopicData();
      }
  }, [searchQuery]);

  useEffect(() => {
      if (!loading && !searchQuery) loadTopicData();
  }, [selectedTopic]);

  const loadData = async () => {
      setLoading(true);
      const trends = await storageService.getTrendingTags();
      setTrendingTopics(trends);
      await loadTopicData();
      setLoading(false);
  };

  const loadTopicData = async () => {
      let data: Post[] = [];
      if (selectedTopic === 'For You') {
          data = await storageService.getDiscoveryFeed();
      } else {
          const allPosts = await storageService.getPosts();
          data = allPosts.filter(p => 
             p.content.toLowerCase().includes(selectedTopic.toLowerCase()) ||
             p.tags?.some(t => t.toLowerCase() === selectedTopic.toLowerCase().replace('#', ''))
          );
      }
      setPosts(data);
  };

  const handleGlobalSearch = async () => {
      setIsSearching(true);
      const results = await storageService.globalSearch(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
  };

  const handleClearSearch = () => {
      setSearchQuery('');
      setSearchResults(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in pb-20 max-w-6xl mx-auto px-4">
        {/* Main Feed Column */}
        <div className="flex-1 order-2 md:order-1">
            {/* Search Bar */}
            <div className="relative mb-8 group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search size={20} className="text-gray-500 group-focus-within:text-primary-400 transition-colors" />
                </div>
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users, posts, or tags..."
                    className="w-full aero-input rounded-2xl py-4 pl-12 pr-12 text-lg focus:ring-4 focus:ring-primary-500/10 outline-none transition-all placeholder-gray-600 bg-white/5 border border-white/10"
                />
                {searchQuery && (
                    <button 
                        onClick={handleClearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {searchQuery && searchResults ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    {/* People Results */}
                    {searchResults.users.length > 0 && (
                        <section>
                            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <UserIcon size={14} /> People
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {searchResults.users.map(user => (
                                    <div 
                                        key={user.id} 
                                        onClick={() => onViewProfile?.(user.id)}
                                        className="aero-card p-3 rounded-xl flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-colors border border-white/5"
                                    >
                                        <Avatar src={user.avatarUrl} alt={user.name} size="md" />
                                        <div className="overflow-hidden">
                                            <p className="font-bold text-white truncate text-sm">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.handle}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Post Results */}
                    <section>
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Newspaper size={14} /> Posts
                        </h3>
                        {searchResults.posts.length === 0 ? (
                            <div className="text-center py-10 opacity-30 italic">No posts found matching your search.</div>
                        ) : (
                            <div className="space-y-4">
                                {searchResults.posts.map(post => (
                                    <PostCard 
                                        key={post.id} 
                                        post={post} 
                                        currentUser={currentUser as any}
                                        onCommentAdd={() => {}} 
                                        onUserClick={onViewProfile}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            ) : (
                <>
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {selectedTopic === 'For You' ? <Sparkles size={24} className="text-primary-400" /> : <Hash size={24} className="text-primary-400" />}
                            <h2 className="text-2xl font-black text-white">{selectedTopic}</h2>
                        </div>
                        {loading && <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>}
                    </div>

                    <div className="space-y-6">
                        {posts.length === 0 && !loading ? (
                            <div className="py-20 text-center opacity-30">
                                <Search size={48} className="mx-auto mb-4" />
                                <p>Nothing found in this universe.</p>
                            </div>
                        ) : (
                            posts.map(post => (
                                <PostCard 
                                    key={post.id} 
                                    post={post} 
                                    currentUser={currentUser as any}
                                    onCommentAdd={() => {}}
                                    onUserClick={onViewProfile}
                                />
                            ))
                        )}
                    </div>
                </>
            )}
        </div>

        {/* Sidebar Column */}
        <div className="w-full md:w-72 space-y-6">
            {/* Quick Navigation */}
            <div className="aero-panel rounded-2xl p-2 bg-white/5 border border-white/10">
                {DEFAULT_TOPICS.map(topic => (
                    <button
                        key={topic}
                        onClick={() => { setSelectedTopic(topic); handleClearSearch(); }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${selectedTopic === topic && !searchQuery ? 'bg-gradient-primary text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        {topic === 'For You' ? <Sparkles size={18} /> : topic === 'Today' ? <Calendar size={18} /> : <Hash size={18} />}
                        <span className="font-bold text-sm tracking-tight">{topic}</span>
                    </button>
                ))}
            </div>

            {/* Trending Topics */}
            <div className="aero-panel rounded-2xl p-6 bg-white/5 border border-white/10">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-green-500" /> Trending Now
                </h3>
                <div className="space-y-4">
                    {trendingTopics.map((topic, idx) => (
                        <div 
                            key={topic.tag} 
                            onClick={() => { setSelectedTopic(topic.tag); handleClearSearch(); }}
                            className="group cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">{idx + 1} • Trending</p>
                                    <p className="font-black text-white group-hover:text-primary-400 transition-colors">#{topic.tag}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">{topic.count} interactions</p>
                                </div>
                                <div className="p-1 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                                    <ArrowRight size={14} className="text-primary-400" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {trendingTopics.length === 0 && <p className="text-xs text-gray-600 italic">Calculating the nebula's trends...</p>}
                </div>
            </div>

            {/* Ad/Promo Placeholder */}
            <div className="aero-card rounded-2xl p-6 bg-gradient-to-br from-primary-600/20 to-purple-600/20 border border-primary-500/20 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-500/10 blur-3xl group-hover:scale-150 transition-transform"></div>
                <h4 className="text-white font-black text-sm uppercase tracking-widest mb-2">GK:Premium</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">Get early access to native tools and exclusive UI themes.</p>
                <button className="text-[10px] font-black uppercase text-primary-400 flex items-center gap-1 hover:gap-2 transition-all">
                    Explore Plans <ArrowRight size={10} />
                </button>
            </div>
        </div>
    </div>
  );
};

export default ExploreView;
