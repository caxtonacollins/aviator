import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function quickTest() {
  // Try the direct endpoint (without -pooler suffix)
  const directHost = process.env.DB_HOST?.replace('-pooler', '') || process.env.DB_HOST;
  
  console.log('Testing direct endpoint (non-pooler)...');
  console.log('Original host:', process.env.DB_HOST);
  console.log('Direct host:', directHost);
  console.log('\n');

  const client = new Client({
    host: directHost,
    port: 5432,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log('Attempting connection...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT version(), current_database()');
    console.log('Database:', result.rows[0].current_database);
    console.log('Version:', result.rows[0].version.substring(0, 60));
    
    await client.end();
    console.log('\n✅ SUCCESS! Use this host in your .env file');
    return true;
  } catch (err: any) {
    console.log('❌ Failed:', err.message);
    console.log('Error code:', err.code);
    return false;
  }
}

quickTest()
  .then((success) => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));
