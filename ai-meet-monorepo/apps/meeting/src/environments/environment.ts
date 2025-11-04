export const environment = {
  production: false,
  port: process.env['PORT'] || 3001,
  allowedOrigins: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],
};