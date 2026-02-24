import { Timestamp } from "firebase/firestore";

export interface Campaign {
  id: string;
  title: string;
  dateCreated: Timestamp;
  dateEnd: Timestamp;
  organizationId: string;
  image: string;
  raised: number;
  goal: number;
  donors: number;
  category: string;
  description: string;
  storyImages: Array<string>;
}

export interface Organization {
  id: string;
  name: string;
  logo: string;
  description: string;
  campaignCount: number;
  totalRaised: number;
}

export interface CampaignWithOrganization extends Campaign {
  organization: Organization;
}

export interface User {
  id: string;
  UID: string; // UID từ Firebase Auth
  email: string;
  password: string;
  fullName: string;
  gender: number; // 0: Nam, 1: Nữ, 2: Khác
  phoneNumber: string;
  avatar: string;
  role: number; // 0: admin, 1: user, 2: organization
}

export interface OrganizationRequest {
  id: string;
  userId: string;
  organizationName: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  image: string;
  summary: string;
  content: string;
  date: Timestamp;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  images: string[];
  likes: string[]; // array of userIds
  commentCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: Timestamp;
}

export interface Donation {
  id: string;
  userId: string;
  campaignId: string;
  amount: number;
  donationDate: Timestamp;
  message?: string;
}

export interface Notification {
  id: string;
  userId: string; // receiver
  type: 'approved' | 'like' | 'comment' | 'new_campaign' | 'new_news';
  message: string;
  read: boolean;
  createdAt: Timestamp;
  link?: string;
}