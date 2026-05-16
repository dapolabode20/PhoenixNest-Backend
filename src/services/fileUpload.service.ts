import { v2 as cloudinary } from 'cloudinary';
import config from '../config/config';

class FileUploadService {
  constructor() {
    cloudinary.config({
      cloud_name: config.cloudinaryCloudName,
      api_key: config.cloudinaryApiKey,
      api_secret: config.cloudinaryApiSecret,
    });
  }

  async upload(buffer: Buffer, mimeType: string, folder = 'phoenix_nest_documents'): Promise<{ value?: string; err?: Error }> {
    try {
      const base64 = buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'auto',
      });

      return { value: result.secure_url };
    } catch (error) {
      return { err: error as Error };
    }
  }
}

export const fileUploadService = new FileUploadService();
