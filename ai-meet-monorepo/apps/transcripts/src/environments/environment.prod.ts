export const environment = {
  production: true,
  port: process.env['PORT'] || 3002,
  allowedOrigins: process.env['ALLOWED_ORIGINS']?.split(',') || ['https://your-production-domain.com'],
  azure: {
    storageConnectionString: process.env['AZURE_STORAGE_CONNECTION_STRING'],
    containerName: process.env['AZURE_CONTAINER_NAME'] || 'transcripts',
  },
};