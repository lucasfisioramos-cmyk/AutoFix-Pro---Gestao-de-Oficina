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

    // Preserve legacy service-order part totals without retaining stock links.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'service_orders'
            AND column_name = 'parts_value'
        ) THEN
          ALTER TABLE service_orders
            ADD COLUMN parts_description TEXT NOT NULL DEFAULT '',
            ADD COLUMN parts_value NUMERIC(12,2) NOT NULL DEFAULT 0;

          IF to_regclass('service_order_parts') IS NOT NULL THEN
            UPDATE service_orders AS service
            SET parts_value = legacy.total
            FROM (
              SELECT service_order_id, SUM(quantity * price_at_time) AS total
              FROM service_order_parts
              GROUP BY service_order_id
            ) AS legacy
            WHERE service.id = legacy.service_order_id;
          END IF;
        ELSE
          ALTER TABLE service_orders
            ADD COLUMN IF NOT EXISTS parts_description TEXT NOT NULL DEFAULT '';
        END IF;
      END $$;
    `);

    // ── Orçamentos ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id                  TEXT PRIMARY KEY,
        customer_id         TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
        service_type        TEXT NOT NULL DEFAULT 'mechanical'
                              CHECK (service_type IN ('mechanical','electrical','suspension','brakes','engine','other')),
        required_parts      TEXT NOT NULL DEFAULT '',
        labor_value         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (labor_value >= 0),
        parts_value         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (parts_value >= 0),
        estimated_duration  TEXT NOT NULL,
        vehicle_name        TEXT NOT NULL,
        vehicle_make        TEXT NOT NULL DEFAULT '',
        vehicle_year        TEXT NOT NULL DEFAULT '',
        vehicle_model       TEXT NOT NULL DEFAULT '',
        vehicle_engine      TEXT NOT NULL DEFAULT '',
        created_by_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS parts_items JSONB NOT NULL DEFAULT '[]';
      UPDATE quotes
      SET parts_items = jsonb_build_array(jsonb_build_object(
        'name', required_parts,
        'price', parts_value
      ))
      WHERE parts_items = '[]'::jsonb AND required_parts <> '';
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
      CREATE INDEX IF NOT EXISTS idx_customers_plate          ON customers(plate);
      CREATE INDEX IF NOT EXISTS idx_users_email              ON users(email);
      CREATE INDEX IF NOT EXISTS idx_quotes_customer         ON quotes(customer_id);
      CREATE INDEX IF NOT EXISTS idx_quotes_created           ON quotes(created_at DESC);
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