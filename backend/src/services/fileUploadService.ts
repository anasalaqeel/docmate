import { createHash, randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { BunFile } from 'bun';

// Bun.js native file interface
export interface BunFileUpload {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  stream(): ReadableStream;
  text(): Promise<string>;
}

export interface UploadResult {
  fileId: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  checksum: string;
  webPath: string;
  storagePath: string;
  fileSignature: string;
}

export interface UploadOptions {
  maxSize: number;
  allowedMimeTypes: readonly string[];
  uploadDir: string;
}

export class BunFileUploader {
  private options: UploadOptions;
  private uploadDir: string;

  constructor(options: UploadOptions) {
    this.options = options;
    this.uploadDir = options.uploadDir;

    // Ensure upload directory exists
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: BunFileUpload, uploadType: string): Promise<UploadResult> {
    const fileId = randomUUID();

    try {
      // Validate file size
      if (file.size > this.options.maxSize) {
        throw new Error(`File size exceeds limit of ${this.options.maxSize / 1024 / 1024}MB`);
      }

      // Validate MIME type
      if (!this.options.allowedMimeTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${this.options.allowedMimeTypes.join(', ')}`);
      }

      // Get file buffer using Bun's native method
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Enhanced file type detection using magic numbers
      const fileType = await fileTypeFromBuffer(uint8Array);
      if (fileType && !this.options.allowedMimeTypes.includes(fileType.mime)) {
        throw new Error('File extension does not match actual file type');
      }

      // Scan for malicious content
      await this.scanForMaliciousContent(uint8Array, file.type);

      // Generate secure filename
      const timestamp = Date.now();
      const hash = createHash('sha256').update(uint8Array).digest('hex').substring(0, 8);
      const ext = this.getExtensionFromMimeType(file.type);
      const secureFilename = `${fileId}-${timestamp}-${hash}.${ext}`;

      // Write file using Bun's optimized file system
      const filePath = join(this.uploadDir, secureFilename);
      writeFileSync(filePath, uint8Array);

      // Generate checksum for integrity
      const checksum = createHash('sha256').update(uint8Array).digest('hex');

      // Generate web path (never expose file system path)
      const webPath = `/uploads/${uploadType}/${secureFilename}`;

      // Get file signature for additional verification
      const fileSignature = this.getFileSignature(uint8Array);

      return {
        fileId,
        filename: secureFilename,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        checksum,
        webPath,
        storagePath: filePath,
        fileSignature
      };

    } catch (error) {
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanForMaliciousContent(buffer: Uint8Array, mimeType: string): Promise<void> {
    const content = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, Math.min(1024, buffer.length)));

    // Check for common malicious patterns
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /eval\s*\(/gi,
      /document\.cookie/gi,
      /document\.write/gi,
      /window\.location/gi
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        throw new Error('Potentially malicious content detected in file');
      }
    }

    // Additional checks for SVG files
    if (mimeType === 'image/svg+xml') {
      const svgPatterns = [
        /<script[^>]*>/gi,
        /javascript:/gi,
        /<iframe[^>]*>/gi,
        /<object[^>]*>/gi,
        /<embed[^>]*>/gi,
        /data:text\/html/gi
      ];

      for (const pattern of svgPatterns) {
        if (pattern.test(content)) {
          throw new Error('Malicious content detected in SVG file');
        }
      }
    }

    // Check for CSS expressions (potential XSS)
    if (mimeType === 'text/css') {
      const cssPatterns = [
        /expression\s*\(/gi,
        /javascript:/gi,
        /@import/gi,
        /binding\s*:/gi
      ];

      for (const pattern of cssPatterns) {
        if (pattern.test(content)) {
          throw new Error('Potentially malicious CSS detected');
        }
      }
    }
  }

  private getFileSignature(buffer: Uint8Array): string {
    // Get first 16 bytes as signature
    const signature = buffer.slice(0, 16);
    return Array.from(signature)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/svg+xml': 'svg',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
      'text/css': 'css',
      'application/javascript': 'js',
      'text/javascript': 'js'
    };

    return extensions[mimeType] || 'bin';
  }

  // Cleanup method for removing files
  deleteFile(filename: string): void {
    const filePath = join(this.uploadDir, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  // Validate file integrity
  async validateFileIntegrity(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      const file = Bun.file(filePath);
      const buffer = await file.arrayBuffer();
      const actualChecksum = createHash('sha256').update(new Uint8Array(buffer)).digest('hex');
      return actualChecksum === expectedChecksum;
    } catch {
      return false;
    }
  }
}

// Whitelist and configurations optimized for Bun
export const UPLOAD_CONFIGS = {
  logo: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'],
    uploadDir: join(process.cwd(), 'uploads', 'logo')
  },
  favicon: {
    maxSize: 512 * 1024, // 512KB
    allowedMimeTypes: ['image/x-icon', 'image/png', 'image/vnd.microsoft.icon', 'image/svg+xml'],
    uploadDir: join(process.cwd(), 'uploads', 'favicon')
  },
  custom_asset: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'text/css', 'application/javascript'],
    uploadDir: join(process.cwd(), 'uploads', 'custom_asset')
  }
} as const;

// Singleton instance
export const fileUploadService = {
  async uploadFile(file: BunFileUpload, uploadType: string): Promise<UploadResult> {
    const config = UPLOAD_CONFIGS[uploadType as keyof typeof UPLOAD_CONFIGS];
    if (!config) {
      throw new Error(`Invalid upload type: ${uploadType}`);
    }

    const uploader = new BunFileUploader(config);
    return await uploader.uploadFile(file, uploadType);
  },

  async validateFileIntegrity(filePath: string, expectedChecksum: string): Promise<boolean> {
    const uploader = new BunFileUploader({
      maxSize: 0,
      allowedMimeTypes: [],
      uploadDir: ''
    });
    return await uploader.validateFileIntegrity(filePath, expectedChecksum);
  }
};