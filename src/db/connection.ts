import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não definida. Configure a variável no arquivo .env.local\n' +
    'Exemplo: DATABASE_URL=postgresql://usuario:senha@localhost:5432/groficina'
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool de conexões:', err);
});

export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('[DB] Conexão com PostgreSQL estabelecida com sucesso.');
  } finally {
    client.release();
  }
}