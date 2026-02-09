import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Try using connection string format
const connectionString = `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_DATABASE}?sslmode=require`;

console.log('Testing connection with connection string format...');
console.log('Connection string (password hidden):', connectionString.replace(process.env.DB_PASSWORD || '', '***'));

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 30000,
});

client.connect()
  .then(() => {
    console.log('✅ Successfully connected to Neon database!');
    return client.query('SELECT version(), current_database(), current_user');
  })
  .then((result) => {
    console.log('PostgreSQL version:', result.rows[0].version);
    console.log('Current database:', result.rows[0].current_database);
    console.log('Current user:', result.rows[0].current_user);
    return client.end();
  })
  .then(() => {
    console.log('Connection closed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed:');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  });
