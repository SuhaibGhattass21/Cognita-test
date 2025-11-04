export const environment = {
  production: true,
  port: process.env['PORT'] || 3001,
  allowedOrigins: process.env['ALLOWED_ORIGINS']?.split(',') || ['https://your-production-domain.com'],
};