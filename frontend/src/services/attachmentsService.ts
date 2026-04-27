import { get, del, uploadFile } from './httpService';
import type { Attachment } from '../types/docs';

export interface AttachmentResponse {
  success: boolean;
  data?: Attachment[];
  message?: string;
}

export interface SingleAttachmentResponse {
  success: boolean;
  data?: Attachment;
  message?: string;
}

const attachmentsService = {
  /**
   * Get attachments for a documentation project
   */
  async getDocAttachments(docId: number): Promise<AttachmentResponse> {
    return get(`/attachments/docs/${docId}`);
  },

  /**
   * Get attachments for a specific page
   */
  async getPageAttachments(pageId: number): Promise<AttachmentResponse> {
    return get(`/attachments/pages/${pageId}`);
  },

  /**
   * Upload an attachment for a documentation project
   */
  async uploadDocAttachment(docId: number, file: File, description?: string): Promise<SingleAttachmentResponse> {
    return uploadFile(`/attachments/docs/${docId}`, file, {
      description: description || '',
      type: 'attachment' // Required by fileValidationMiddleware
    });
  },

  /**
   * Upload an attachment for a specific page
   */
  async uploadPageAttachment(pageId: number, file: File, description?: string): Promise<SingleAttachmentResponse> {
    return uploadFile(`/attachments/pages/${pageId}`, file, {
      description: description || '',
      type: 'attachment' // Required by fileValidationMiddleware
    });
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(id: number): Promise<{ success: boolean; message: string }> {
    return del(`/attachments/${id}`);
  }
};

export default attachmentsService;
