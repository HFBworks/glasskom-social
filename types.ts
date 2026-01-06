
export const AI_AGENT_ID = 'gk_assistant_ai';

export enum ViewState {
  HOME = 'HOME',
  PROFILE = 'PROFILE',
  EXPLORE = 'EXPLORE',
  SETTINGS = 'SETTINGS',
  MESSAGES = 'MESSAGES',
  FRIENDS = 'FRIENDS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  COMMUNITIES = 'COMMUNITIES',
  COMMUNITY_PAGE = 'COMMUNITY_PAGE',
  APPS = 'APPS',
  APPS_SETTINGS = 'APPS_SETTINGS',
  ASSISTANT = 'ASSISTANT'
}

export interface ConnectedAccount {
  id: string;
  provider: 'google';
  email: string;
  avatarUrl?: string;
  customLinks?: {
    docs?: string;
    sheets?: string;
    slides?: string;
    mail?: string;
    drive?: string;
    meet?: string;
    calendar?: string;
  };
}

export interface UserPreferences {
  theme: string;
  font: 'sans' | 'serif' | 'mono';
  appIcon?: 'dark' | 'light' | 'vibrant' | 'gold';
  notificationPopups?: boolean;
  privacy?: {
    showLastSeen: boolean;
    defaultPostVisibility: 'public' | 'friends';
  };
  uiConfig?: {
    notificationBadgeType: 'number' | 'dot';
    messageBadgeType: 'number' | 'dot';
  };
  accounts?: ConnectedAccount[];
  launcherConfig?: {
    hiddenApps: string[];
    favorites: string[];
  };
}

export interface User {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  coverUrl?: string;
  email?: string;
  preferences?: UserPreferences;
  isOnline?: boolean;
  lastSeen?: Date;
  friends?: string[];
  friendRequests?: string[];
  friendRequestsSent?: string[];
  joinedCommunities?: string[];
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string; // Base64 Encrypted
  timestamp: Date;
  reactions: Reaction[];
  readBy: string[];
  isEdited?: boolean;
  isDeletedEveryone?: boolean;
  deletedFor?: string[];
  isVoice?: boolean;
}

export type ChatFolder = 'inbox' | 'archived' | 'requests' | 'blocked';

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'community' | 'ai';
  name?: string;
  avatarUrl?: string;
  participantIds: string[];
  participantStatus?: Record<string, ChatFolder>; 
  typing?: Record<string, boolean>; // Maps userId to typing status
  messages: Message[];
  createdAt: Date;
  createdBy: string;
  lastMessageAt?: Date;
}

export interface Post {
  id: string;
  user: User;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: Comment[];
  createdAt: Date;
  tags?: string[];
  visibility: 'public' | 'friends';
  communityId?: string;
  isArchived?: boolean;
  mentionedUserIds?: string[];
}

export interface Comment {
  id: string;
  user: User;
  content: string;
  createdAt: Date;
  likes: number;
}

export type CommunityRole = 'creator' | 'moderator' | 'member';

export interface Community {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  coverUrl: string;
  privacy: 'public' | 'private';
  members: Record<string, CommunityRole>;
  createdAt: Date;
  createdBy: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId?: string;
  type: 'LOGIN' | 'LIKE' | 'COMMENT' | 'FRIEND_REQ' | 'FRIEND_ACCEPT' | 'NEW_POST' | 'COMMUNITY_INVITE' | 'MENTION';
  content: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: Date;
}

export type CallType = 'voice' | 'video' | 'ai';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

export interface SignalingPayload {
    type: 'offer' | 'answer' | 'candidate' | 'hangup';
    callerId: string;
    receiverId: string;
    chatId: string;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    callType: CallType;
}
