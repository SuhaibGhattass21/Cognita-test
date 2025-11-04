export const environment = {
  production: false,
  port: process.env['PORT'] || 3002,
  allowedOrigins: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],
  azure: {
    storageConnectionString: process.env['AZURE_STORAGE_CONNECTION_STRING'],
    containerName: process.env['AZURE_CONTAINER_NAME'] || 'transcripts',
  },
};