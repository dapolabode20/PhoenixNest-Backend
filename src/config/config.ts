import dotenv from 'dotenv';

export interface AppConfig {
  environment: string;
  port: number;
  dbUrl: string;
  accessTokenSecret: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFromAddress: string;
}

// Load environment variables
dotenv.config({ quiet: true });

function getEnvVariable(key: string): string {
  const value = process.env[key];
  if (!value && process.env.NODE_ENV !== 'test') {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value || '';
}

const config: AppConfig = {
  environment: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  dbUrl: getEnvVariable('DB_URL'),
  accessTokenSecret: getEnvVariable('ACCESS_TOKEN_SECRET'),
  cloudinaryCloudName: getEnvVariable('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: getEnvVariable('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: getEnvVariable('CLOUDINARY_API_SECRET'),
  smtpHost: getEnvVariable('SMTP_HOST'),
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: getEnvVariable('SMTP_USER'),
  smtpPass: getEnvVariable('SMTP_PASS'),
  smtpFromAddress: getEnvVariable('SMTP_FROM_ADDRESS')
};

// const _loggable: any = { ...config };
// console.dir({ env: _loggable }, { depth: null, colors: true });

export default config;
