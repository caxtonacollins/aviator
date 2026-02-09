import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function testConnection() {
  console.log('=== Testing Neon Database Connection ===\n');
  console.log('Host:', process.env.DB_HOST);
  console.log('Database:', process.env.DB_DATABASE);
  console.log('User:', process.env.DB_USERNAME);
  console.log('Password length:', process.env.DB_PASSWORD?.length);
  console.log('\n');

  // Test 1: With SSL (rejectUnauthorized: false)
  console.log('Test 1: Connecting with SSL (rejectUnauthorized: false)...');
  const client1 = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 20000,
  });

  try {
    await client1.connect();
    console.log('✅ Test 1 PASSED: Connected successfully with SSL!');
    const result = await client1.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version.substring(0, 50) + '...');
    await client1.end();
    return true;
  } catch (err: any) {
    console.log('❌ Test 1 FAILED:', err.message);
    console.log('Error code:', err.code);
  }

  // Test 2: Try with connection string
  console.log('\nTest 2: Connecting with connection string...');
  const connectionString = `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
  const client2 = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  try {
    await client2.connect();
    console.log('✅ Test 2 PASSED: Connected successfully with connection string!');
    await client2.end();
    return true;
  } catch (err: any) {
    console.log('❌ Test 2 FAILED:', err.message);
    console.log('Error code:', err.code);
  }

  // Test 3: Check if it's a DNS issue
  console.log('\nTest 3: Checking DNS resolution...');
  try {
    const dns = await import('dns');
    const { promisify } = await import('util');
    const lookup = promisify(dns.lookup);
    const address = await lookup(process.env.DB_HOST!);
    console.log('✅ DNS resolution successful:', address);
  } catch (err: any) {
    console.log('❌ DNS resolution failed:', err.message);
  }

  return false;
}

testConnection()
  .then((success) => {
    if (success) {
      console.log('\n✅ Connection test successful!');
      process.exit(0);
    } else {
      console.log('\n❌ All connection tests failed');
      console.log('\nPossible issues:');
      console.log('1. Database credentials are incorrect');
      console.log('2. Database is not accessible from this network');
      console.log('3. Firewall blocking the connection');
      console.log('4. Neon database is still initializing');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
