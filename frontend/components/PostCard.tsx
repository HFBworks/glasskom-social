
import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Globe, Users, Copy, X, Trash2, Archive, Edit2, Eye, Save, UserMinus, RefreshCw } from 'lucide-react';
import { Post, User } from '../types';
import Avatar from './Avatar';
import { formatDistanceToNow } from 'date-fns';
import * as storageService from '../services/storageService';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  onCommentAdd: (postId: string, content: string) => void;
  onLikeToggle?: (postId: string) => void;
  onUserClick?: (userId: string) => void;
  onAuthRequired?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onCommentAdd, onLikeToggle, onUserClick, onAuthRequired }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Menu State
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  
  // Visibility State for immediate UI feedback
  const [visibility, setVisibility] = useState(post.visibility || 'public');

  const isMe = currentUser?.id === post.user?.id;
  const isMentioned = currentUser && (post.mentionedUserIds || []).includes(currentUser.id);
  
  // Owner Rights: Author OR Mentioned User can Edit
  const canEdit = isMe || isMentioned;

  const checkAuth = () => {
      if (!currentUser) {
          if (onAuthRequired) onAuthRequired();
          return false;
      }
      return true;
  };

  const handleLike = () => {
    if (!checkAuth()) return;
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    if(onLikeToggle) onLikeToggle(post.id);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAuth()) return;
    if (!newComment.trim()) return;

    onCommentAdd(post.id, newComment);
    setNewComment('');
  };

  const toggleComments = () => {
      setShowComments(!showComments);
  }

  const handleDeleteComment = async (commentId: string) => {
      if (!checkAuth()) return;
      if (confirm('Delete this comment?')) {
          await storageService.deleteComment(post.id, commentId);
          window.location.reload(); 
      }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
    setShowShareModal(false);
  };

  // Management Actions
  const handleSaveEdit = async () => {
      if (!checkAuth()) return;
      await storageService.updatePost(post.id, { content: editContent });
      setIsEditing(false);
      setShowMenu(false);
      post.content = editContent; 
  };

  const handleToggleVisibility = async () => {
      if (!checkAuth()) return;
      const newVisibility = visibility === 'public' ? 'friends' : 'public';
      await storageService.updatePost(post.id, { visibility: newVisibility });
      setVisibility(newVisibility);
      setShowMenu(false);
  };

  const handleArchiveToggle = async () => {
      if (!checkAuth()) return;
      const newState = !post.isArchived;
      const msg = newState 
        ? 'Archive this post? It will be hidden from your profile and feed but not deleted.' 
        : 'Unarchive this post? It will appear on your profile again.';
        
      if (confirm(msg)) {
          await storageService.archivePost(post.id, newState);
          window.location.reload();
      }
  };

  const handleDelete = async () => {
      if (!checkAuth()) return;
      if (confirm('Permanently delete this post? This cannot be undone.')) {
          await storageService.deletePost(post.id);
          window.location.reload();
      }
  };

  const handleRemoveMention = async () => {
      if (!checkAuth()) return;
      if (!currentUser) return;
      if (confirm('Remove yourself from this post?')) {
          await storageService.removeMention(post.id, currentUser.id);
          window.location.reload();
      }
  };

  const renderContent = (text: string) => {
      if (!text) return null;
      const parts = text.split(/(\s+)/); 
      return parts.map((part, index) => {
          if (part.startsWith('#')) {
              return <span key={index} className="text-primary-400 cursor-pointer hover:underline">{part}</span>;
          }
          if (part.startsWith('@')) {
               return <span key={index} className="text-pink-400 font-medium cursor-pointer hover:underline">{part}</span>;
          }
          return part;
      });
  };

  const postComments = post.comments || [];
  const postTags = post.tags || [];
  const mentionedIds = post.mentionedUserIds || [];

  return (
    <div 
      className={`aero-card rounded-xl mb-4 hover:border-white/20 transition-all duration-300 relative group/card ${post.isArchived ? 'opacity-75 border-l-4 border-l-yellow-500' : ''}`}
      style={{ overflow: showMenu ? 'visible' : 'hidden' }}
    >
      <div className="p-4 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-3 group cursor-pointer" onClick={() => onUserClick && onUserClick(post.user?.id)}>
            <Avatar src={post.user?.avatarUrl} alt={post.user?.name || 'User'} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white group-hover:underline">{post.user?.name || 'Anonymous'}</h3>
                {mentionedIds.length > 0 && (
                    <span className="text-gray-400 text-sm">
                        with <span className="text-white font-medium">{mentionedIds.length} others</span>
                    </span>
                )}
                <span className="text-gray-400 text-sm">{post.user?.handle || ''}</span>
                <span className="text-gray-500 text-xs flex items-center gap-1">
                    • {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : 'just now'}
                    {post.isArchived && <span className="text-yellow-500 font-bold ml-1">(Archived)</span>}
                    {visibility === 'friends' ? 
                      <span title="Friends Only"><Users size={10} /></span> : 
                      <span title="Public"><Globe size={10} /></span>
                    }
                </span>
              </div>
              {post.user?.bio && <p className="text-xs text-gray-500 line-clamp-1">{post.user.bio}</p>}
            </div>
          </div>
          
          <div className="relative">
            <button 
                onClick={() => setShowMenu(!showMenu)} 
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5"
            >
                <MoreHorizontal size={20} />
            </button>
            
            {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-charcoal-800 border border-white/10 rounded-xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 overflow-hidden ring-1 ring-black/5">
                    <div className="py-1">
                        {canEdit ? (
                            <>
                                <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-sm text-gray-200">
                                    <Edit2 size={16} /> Edit Post
                                </button>
                                
                                {isMe && (
                                    <>
                                        <button onClick={handleToggleVisibility} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-sm text-gray-200">
                                            <Eye size={16} /> Change Visibility
                                        </button>
                                        <button onClick={handleArchiveToggle} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-sm text-gray-200">
                                            {post.isArchived ? <RefreshCw size={16} /> : <Archive size={16} />}
                                            {post.isArchived ? 'Unarchive' : 'Archive'}
                                        </button>
                                    </>
                                )}
                                
                                {isMentioned && !isMe && (
                                    <button onClick={handleRemoveMention} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-sm text-yellow-400">
                                        <UserMinus size={16} /> Remove Mention
                                    </button>
                                )}
                                
                                {isMe && (
                                    <>
                                        <div className="h-px bg-white/5 my-1"></div>
                                        <button onClick={handleDelete} className="w-full text-left px-4 py-3 hover:bg-red-500/10 flex items-center gap-2 text-sm text-red-400 font-semibold bg-red-500/5">
                                            <Trash2 size={16} /> Delete Permanently
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <button onClick={() => alert('Reported')} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-sm text-red-400">
                                 Report Post
                            </button>
                        )}
                    </div>
                </div>
            )}
            {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>}
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
            <div className="mb-3 animate-in fade-in">
                <textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full aero-input rounded-lg p-3 min-h-[100px] text-sm mb-2"
                />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                        <Save size={12} /> Save
                    </button>
                </div>
            </div>
        ) : (
            <p className="text-gray-200 text-base leading-relaxed mb-3 whitespace-pre-wrap">
                {renderContent(post.content)}
            </p>
        )}

        {/* Tags */}
        {postTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {postTags.map(tag => (
              <span key={tag} className="text-primary-500 text-sm hover:text-primary-400 hover:underline cursor-pointer">#{tag}</span>
            ))}
          </div>
        )}

        {/* Image */}
        {post.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border border-white/10 shadow-lg">
            <img src={post.imageUrl} alt="Post content" className="w-full h-auto object-cover max-h-[500px]" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex gap-6 w-full">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
              <span>{likeCount}</span>
            </button>
            
            <button 
              onClick={toggleComments}
              className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-primary-500 transition-colors"
            >
              <MessageCircle size={20} />
              <span>{postComments.length}</span>
            </button>

            <button 
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-green-400 transition-colors"
            >
              <Share2 size={20} />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal Dialog */}
      {showShareModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm rounded-xl animate-in fade-in">
              <div className="bg-charcoal-800 border border-white/20 p-4 rounded-xl shadow-2xl w-full max-w-sm">
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="text-white font-bold">Share Post</h4>
                      <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white">
                          <X size={18} />
                      </button>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">Copy link to share:</p>
                  <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={`${window.location.origin}/post/${post.id}`} 
                        className="flex-1 aero-input rounded-lg px-3 py-2 text-sm text-gray-300"
                      />
                      <button 
                        onClick={handleCopyLink}
                        className="p-2 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/30 transition-colors"
                        title="Copy"
                      >
                          <Copy size={18} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="bg-black/20 p-4 rounded-b-xl border-t border-white/10 relative z-10">
          <div className="space-y-4 mb-4">
            {postComments.map(comment => (
              <div key={comment.id} className="flex gap-3 group/comment">
                <Avatar src={comment.user?.avatarUrl} alt={comment.user?.name || 'User'} size="sm" />
                <div className="flex-1 bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 relative">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-semibold text-sm text-gray-200">{comment.user?.name || 'Anonymous'}</span>
                    <span className="text-xs text-gray-500">{comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt)) : 'just now'}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{comment.content}</p>
                  
                  {(currentUser && (comment.user?.id === currentUser.id || post.user?.id === currentUser.id)) && (
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                        title="Delete Comment"
                      >
                          <Trash2 size={12} />
                      </button>
                  )}
                </div>
              </div>
            ))}
            {postComments.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-2">No comments yet. Be the first!</p>
            )}
          </div>
          
          <form onSubmit={handlePostComment} className="flex gap-3 items-center">
            {currentUser && <Avatar src={currentUser.avatarUrl} alt={currentUser.name} size="sm" />}
            <input 
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={currentUser ? "Write a comment..." : "Log in to comment..."}
              className="flex-1 aero-input rounded-full px-4 py-2 text-sm focus:outline-none"
              disabled={!currentUser}
              onClick={() => !currentUser && onAuthRequired && onAuthRequired()}
            />
            <button 
              type="submit" 
              disabled={!newComment.trim() || !currentUser}
              className="text-primary-500 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:text-primary-400"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PostCard;
