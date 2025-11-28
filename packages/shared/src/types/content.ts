/**
 * Content Management Types
 */

export enum GenerationType {
  TEXT_TO_IMAGE = 'text_to_image',
  TEXT_TO_VIDEO = 'text_to_video',
  TEXT_TO_MUSIC = 'text_to_music',
  IMAGE_TO_IMAGE = 'image_to_image',
  VIDEO_TO_VIDEO = 'video_to_video',
  EDIT_IMAGE = 'edit_image',
  EDIT_VIDEO = 'edit_video',
}

export enum ContentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

export interface Generation {
  id: string;
  uid: string;
  type: GenerationType;
  prompt: string;
  status: ContentStatus;
  aestheticScore?: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  urls: string[];
  metadata?: Record<string, any>;
}

export interface ContentModerationAction {
  id: string;
  generationId: string;
  adminId: string;
  action: 'approve' | 'reject' | 'flag' | 'unflag' | 'delete';
  reason?: string;
  createdAt: Date;
}

