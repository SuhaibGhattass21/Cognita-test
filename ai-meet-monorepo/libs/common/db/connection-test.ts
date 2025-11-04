import { createPrismaClient, ServiceType } from './prisma-clients';

export interface ConnectionTestResult {
  service: ServiceType;
  connected: boolean;
  responseTime: number;
  error?: string;
  timestamp: string;
}

/**
 * Test database connection for a specific service
 */
export async function testDatabaseConnection(service: ServiceType): Promise<ConnectionTestResult> {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    const client = createPrismaClient(service);
    
    // Test basic connectivity
    await client.$queryRaw`SELECT 1 as test`;
    
    // Cleanup
    await client.$disconnect();
    
    const responseTime = Date.now() - start;
    
    return {
      service,
      connected: true,
      responseTime,
      timestamp
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    return {
      service,
      connected: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown connection error',
      timestamp
    };
  }
}

/**
 * Test all database connections
 */
export async function testAllConnections(): Promise<ConnectionTestResult[]> {
  const services: ServiceType[] = ['meeting', 'transcripts'];
  const results = await Promise.all(
    services.map(service => testDatabaseConnection(service))
  );
  
  return results;
}

/**
 * Simple connection test script for CLI usage
 */
export async function runConnectionTest() {
  console.log('🔍 Testing database connections...\n');
  
  const results = await testAllConnections();
  
  results.forEach(result => {
    const status = result.connected ? '✅ CONNECTED' : '❌ FAILED';
    console.log(`${status} - ${result.service.toUpperCase()} Database`);
    console.log(`   Response Time: ${result.responseTime}ms`);
    console.log(`   Timestamp: ${result.timestamp}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });
  
  const allConnected = results.every(r => r.connected);
  console.log(allConnected ? '🎉 All databases connected successfully!' : '⚠️  Some databases failed to connect');
  
  return allConnected;
}

// CLI execution
if (require.main === module) {
  runConnectionTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Connection test failed:', error);
      process.exit(1);
    });
}