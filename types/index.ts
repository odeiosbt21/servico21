export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  userType: 'prestador' | 'contratante';
  cpf?: string | null;
  phone?: string | null;
  cep?: string | null;
  address?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  serviceType?: string | null;
  isProfileComplete: boolean;
  status?: 'disponivel' | 'ocupado' | null;
  rating?: number | null;
  reviewCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  isPremium?: boolean;
  premiumExpiresAt?: Date | null;
  createdAt: Date;
}

export interface Service {
  id: string;
  name: string;
  icon: string;
}

export interface Provider {
  uid: string;
  displayName: string;
  photoURL?: string;
  serviceType: string;
  neighborhood: string;
  rating: number;
  reviewCount: number;
  status: 'disponivel' | 'ocupado';
  distance?: number;
  latitude: number;
  longitude: number;
  isPremium?: boolean;
}

export interface Review {
  id: string;
  providerId: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'image' | 'location';
  text?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: { [key: string]: string };
  lastMessage?: string;
  lastMessageTime?: Date;
  providerId: string;
  clientId: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  serviceType: string;
  radius: number; // in kilometers
  emailNotifications: boolean;
  createdAt: Date;
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  serviceType: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  radius: number;
  description?: string;
  createdAt: Date;
  status: 'active' | 'fulfilled' | 'cancelled';
}