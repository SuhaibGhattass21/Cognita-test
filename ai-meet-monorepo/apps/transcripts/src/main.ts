import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  try {
  console.log('Starting transcripts bootstrap process...');
    
    const app = await NestFactory.create(AppModule);
  console.log('NestFactory.create completed');
    
    // Enable graceful shutdown hooks
    app.enableShutdownHooks();
  console.log('Shutdown hooks enabled');
    
    // Enable CORS
    app.enableCors({
      origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],
      credentials: true,
    });
  console.log('CORS enabled');

    const port = process.env['PORT'] || 3000;
  console.log(`Starting to listen on port ${port}...`);

  const server = await app.listen(port);
  console.log(`Transcripts service is running on: http://localhost:${port}`);
  console.log(`Server address: ${server.address()}`);
    
    // Keep the process alive
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully');
      app.close();
    });
    
    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully');
      app.close();
    });
    
    // Log that we're staying alive
  console.log('Server is running and waiting for requests...');
    
  } catch (error) {
  console.error('Transcripts bootstrap failed:', error);
    process.exit(1);
  }
}

bootstrap()
  .then(() => {
  console.log('Transcripts bootstrap completed successfully');
  })
  .catch(error => {
  console.error('Transcripts bootstrap promise rejected:', error);
    process.exit(1);
  });