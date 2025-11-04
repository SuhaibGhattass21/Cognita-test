import { execSync } from 'child_process';
import { ServiceType } from './prisma-clients';

export interface MigrationResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Run Prisma migrate for a specific service
 */
export async function runMigration(service: ServiceType, migrationName?: string): Promise<MigrationResult> {
  try {
    const schemaPath = `apps/${service}/prisma/schema.prisma`;
    const envVar = `DATABASE_URL_${service.toUpperCase()}`;
    
    // Build the migration command
    let command = `npx prisma migrate dev --schema ${schemaPath}`;
    if (migrationName) {
      command += ` --name ${migrationName}`;
    }

    // Set environment variable for the specific service
    const env = { ...process.env };
    if (process.env[envVar]) {
      env['DATABASE_URL'] = process.env[envVar];
    }

    const output = execSync(command, { 
      encoding: 'utf8',
      env,
      stdio: 'pipe'
    });

    return {
      success: true,
      output: output.toString()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown migration error'
    };
  }
}

/**
 * Reset database for a specific service
 */
export async function resetDatabase(service: ServiceType): Promise<MigrationResult> {
  try {
    const schemaPath = `apps/${service}/prisma/schema.prisma`;
    const envVar = `DATABASE_URL_${service.toUpperCase()}`;
    
    const command = `npx prisma migrate reset --force --schema ${schemaPath}`;

    // Set environment variable for the specific service
    const env = { ...process.env };
    if (process.env[envVar]) {
      env['DATABASE_URL'] = process.env[envVar];
    }

    const output = execSync(command, { 
      encoding: 'utf8',
      env,
      stdio: 'pipe'
    });

    return {
      success: true,
      output: output.toString()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown reset error'
    };
  }
}

/**
 * Generate Prisma client for a specific service
 */
export async function generateClient(service: ServiceType): Promise<MigrationResult> {
  try {
    const schemaPath = `apps/${service}/prisma/schema.prisma`;
    const command = `npx prisma generate --schema ${schemaPath}`;

    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });

    return {
      success: true,
      output: output.toString()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown generate error'
    };
  }
}

/**
 * Check migration status for a specific service
 */
export async function getMigrationStatus(service: ServiceType): Promise<MigrationResult> {
  try {
    const schemaPath = `apps/${service}/prisma/schema.prisma`;
    const envVar = `DATABASE_URL_${service.toUpperCase()}`;
    
    const command = `npx prisma migrate status --schema ${schemaPath}`;

    // Set environment variable for the specific service
    const env = { ...process.env };
    if (process.env[envVar]) {
      env['DATABASE_URL'] = process.env[envVar];
    }

    const output = execSync(command, { 
      encoding: 'utf8',
      env,
      stdio: 'pipe'
    });

    return {
      success: true,
      output: output.toString()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown status error'
    };
  }
}