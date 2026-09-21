import { pool } from './connection';

/**
 * Executa todas as migrations de forma idempotente (IF NOT EXISTS).
 * Pode ser chamado toda vez que o servidor sobe sem risco de duplicar dados.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Configurações da Oficina ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS workshop_info (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL DEFAULT 'GR OFICINA MECÂNICA',
        cnpj        TEXT NOT NULL DEFAULT '',
        address     TEXT NOT NULL DEFAULT '',
        phone       TEXT NOT NULL DEFAULT '',
        email       TEXT NOT NULL DEFAULT '',
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Garante que sempre exista exatamente uma linha
    await client.query(`
      INSERT INTO workshop_info (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `);

    // ── Funcionários ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        base_salary     NUMERIC(12,2) NOT NULL DEFAULT 0,
        commission_rate NUMERIC(5,2)  NOT NULL DEFAULT 0,
        role            TEXT NOT NULL DEFAULT '',
        phone           TEXT NOT NULL DEFAULT '',
        active          BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Usuários do sistema ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        email           TEXT NOT NULL UNIQUE,
        password_hash   TEXT NOT NULL,
        phone           TEXT NOT NULL DEFAULT '',
        role            TEXT NOT NULL DEFAULT 'mechanic'
                          CHECK (role IN ('admin','receptionist','mechanic')),
        employee_id     TEXT REFERENCES employees(id) ON DELETE SET NULL,
        profile_image   TEXT,
        active          BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Clientes ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        phone       TEXT NOT NULL DEFAULT '',
        email       TEXT,
        vehicle     TEXT NOT NULL DEFAULT '',
        plate       TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Peças / Estoque ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS parts (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        price       NUMERIC(12,2) NOT NULL DEFAULT 0,
        stock       INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Ordens de Serviço ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_orders (
        id              TEXT PRIMARY KEY,
        entry_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        exit_date       TIMESTAMPTZ,
        customer_id     TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
        employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
        service_type    TEXT NOT NULL DEFAULT 'mechanical'
                          CHECK (service_type IN ('mechanical','electrical','suspension','brakes','engine','other')),
        description     TEXT NOT NULL DEFAULT '',
        notes           TEXT,
        labor_value     NUMERIC(12,2) NOT NULL DEFAULT 0,
        status          TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','in_progress','completed','cancelled')),
        payment_method  TEXT CHECK (payment_method IN ('cash','card_debit','card_credit','pix')),
        installments    INTEGER,
        warranty_until  TIMESTAMPTZ,
        -- Checklist de entrada (armazenado como JSON)
        checklist       JSONB,
        -- Fotos em base64 (array JSON)
        images          JSONB NOT NULL DEFAULT '[]',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Peças usadas por O.S. ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_order_parts (
        id              SERIAL PRIMARY KEY,
        service_order_id TEXT NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
        part_id         TEXT NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
        quantity        INTEGER NOT NULL DEFAULT 1,
        price_at_time   NUMERIC(12,2) NOT NULL DEFAULT 0
      );
    `);

    // ── Despesas Mensais ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_expenses (
        id          TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
        due_date    DATE NOT NULL,
        paid_date   DATE,
        category    TEXT NOT NULL DEFAULT 'other',
        is_paid     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Índices para performance ─────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_service_orders_customer  ON service_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_service_orders_employee  ON service_orders(employee_id);
      CREATE INDEX IF NOT EXISTS idx_service_orders_status    ON service_orders(status);
      CREATE INDEX IF NOT EXISTS idx_service_orders_entry     ON service_orders(entry_date DESC);
      CREATE INDEX IF NOT EXISTS idx_sop_service_order        ON service_order_parts(service_order_id);
      CREATE INDEX IF NOT EXISTS idx_customers_plate          ON customers(plate);
      CREATE INDEX IF NOT EXISTS idx_users_email              ON users(email);
    `);

    await client.query('COMMIT');
    console.log('[DB] Migrations executadas com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] Erro ao executar migrations:', err);
    throw err;
  } finally {
    client.release();
  }
}