export interface Visit {
  id: string;
  userId: string;
  restaurantId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  receiptImageUrl: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  retakeDeadline: string | null;
  wasInMustVisit: boolean;
  taggedBuddies: string[];
  createdAt: string;
  updatedAt: string;

  // Relations
  user?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profileImage?: string;
  };
  restaurant?: {
    id: string;
    name: string;
    place: string;
    address?: string;
    thumbnailUrl?: string;
    rating?: number;
    priceLevel?: number;
  };
  receipt?: Receipt;
  experience?: Experience;
}

export interface Receipt {
  id: string;
  userId: string;
  restaurantId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  fullscreenUrl?: string;
  originalUrl?: string;
  imageHash: string;
  status: 'pending' | 'approved' | 'rejected';

  // OCR Fields
  totalAmount?: number;
  issueDate?: string;
  issueTime?: string;
  jir?: string;
  zki?: string;
  oib?: string;
  merchantName?: string;
  merchantAddress?: string;

  // OCR Confidence
  rawOcrText?: string;
  visionConfidence?: number;
  parserConfidence?: number;
  consistencyScore?: number;
  autoApproveScore?: number;
  fraudFlags?: string[];

  // Verification
  verifierId?: string;
  verifiedAt?: string;
  rejectionReason?: string;

  // Points
  pointsAwarded?: number;
  hasReservationBonus: boolean;

  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  id: string;
  userId: string;
  restaurantId: string;
  visitId?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  title: string;
  description?: string;
  mediaKind: 'VIDEO' | 'CAROUSEL';
  media?: ExperienceMedia[];
  likesCount: number;
  savesCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceMedia {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  storageKey: string;
  cdnUrl?: string;
  width?: number;
  height?: number;
  orderIndex: number;
  transcodingStatus: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
}

export interface VisitsResponse {
  visits: Visit[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface VisitStats {
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

export interface UpdateReceiptPayload {
  totalAmount?: number;
  issueDate?: string;
  issueTime?: string;
  jir?: string;
  zki?: string;
  oib?: string;
  merchantName?: string;
  merchantAddress?: string;
}

export interface ApproveVisitResponse {
  message: string;
  visit: Visit;
  pointsAwarded: number;
}

export interface RejectVisitPayload {
  reason: string;
}
