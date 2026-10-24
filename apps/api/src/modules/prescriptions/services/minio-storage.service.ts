import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import {
  PRESCRIPTION_BUCKET_NAME,
  PRESCRIPTION_URL_EXPIRATION_SECONDS,
} from '@pharmacy/shared';

@Injectable()
export class MinioStorageService implements OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName = PRESCRIPTION_BUCKET_NAME;

  constructor() {
    const host = process.env.MINIO_HOST || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    const accessKeyId = process.env.MINIO_ROOT_USER || 'pharmacy_minio_admin';
    const secretAccessKey = process.env.MINIO_ROOT_PASSWORD || 'pharmacy_minio_secret_2026';

    const endpoint = `http://${host}:${port}`;

    this.s3Client = new S3Client({
      endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists().catch((err) => {
      this.logger.warn(`MinIO bucket verification deferred: ${err.message}`);
    });
  }

  async ensureBucketExists(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.logger.log(`Created MinIO bucket "${this.bucketName}"`);
      } catch (err: any) {
        this.logger.warn(`Could not create bucket "${this.bucketName}": ${err.message}`);
      }
    }
  }

  async uploadPrescriptionImage(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const safeExt = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '.jpg';
    const key = `prescriptions/${year}/${month}/${uuidv4()}${safeExt}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return key;
  }

  async getPresignedViewUrl(
    key: string,
    expiresIn = PRESCRIPTION_URL_EXPIRATION_SECONDS,
  ): Promise<string> {
    // If key is already a full http URL (e.g. mock/demo data), return as is
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
