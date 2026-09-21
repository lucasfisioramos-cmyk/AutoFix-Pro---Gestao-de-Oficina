import bcrypt from 'bcrypt';
import { pool } from './connection';

const SALT_ROUNDS = 12;

/**
 * Insere dados iniciais apenas se o banco estiver vazio.
 * Seguro para rodar em produção — verifica antes de inserir.
 */
export async function runSeed(): Promise<void> {
  const client = await pool.connect();
  try {
    // Só faz seed se não houver usuários
    const { rows } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) > 0) {
      console.log('[DB] Seed ignorado: banco já possui dados.');
      return;
    }

    await client.query('BEGIN');

    // ── Configurações da Oficina ────────────────────────────────────────────
    await client.query(`
      UPDATE workshop_info SET
        name    = 'GR OFICINA MECÂNICA',
        cnpj    = '00.000.000/0001-00',
        address = 'Rua das Oficinas, 123 - Centro',
        phone   = '(11) 99999-8888',
        email   = 'contato@groficina.com'
      WHERE id = 1
    `);

    // ── Funcionários ────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO employees (id, name, base_salary, commission_rate, role, phone, active) VALUES
        ('admin-1', 'Rubens',   5000, 0,  'Administrador / Proprietário', '(11) 99999-1111', true),
        ('recep-1', 'Marcela',  2500, 2,  'Recepcionista',                '(11) 99999-2222', true),
        ('mec-1',   'Dusmenil', 3500, 10, 'Mecânico Líder',               '(11) 99999-3333', true),
        ('mec-2',   'Erick',    2200, 5,  'Assistente',                   '(11) 99999-4444', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // ── Usuários (senhas com hash bcrypt) ────────────────────────────────────
    const adminHash  = await bcrypt.hash('admin123',    SALT_ROUNDS);
    const recepHash  = await bcrypt.hash('recepcao123', SALT_ROUNDS);
    const mec1Hash   = await bcrypt.hash('mecanico123', SALT_ROUNDS);
    const mec2Hash   = await bcrypt.hash('mecanico123', SALT_ROUNDS);

    await client.query(`
      INSERT INTO users (id, name, email, password_hash, phone, role, employee_id, active) VALUES
        ('usr-1', 'Rubens',   'rubens@groficina.com',   $1, '(11) 99999-1111', 'admin',        'admin-1', true),
        ('usr-2', 'Marcela',  'marcela@groficina.com',  $2, '(11) 99999-2222', 'receptionist', 'recep-1', true),
        ('usr-3', 'Dusmenil', 'dusmenil@groficina.com', $3, '(11) 99999-3333', 'mechanic',     'mec-1',   true),
        ('usr-4', 'Erick',    'erick@groficina.com',    $4, '(11) 99999-4444', 'mechanic',     'mec-2',   true)
      ON CONFLICT (id) DO NOTHING
    `, [adminHash, recepHash, mec1Hash, mec2Hash]);

    // ── Clientes de exemplo ──────────────────────────────────────────────────
    await client.query(`
      INSERT INTO customers (id, name, phone, vehicle, plate) VALUES
        ('cust-1', 'João Silva',     '(11) 98888-7777', 'Toyota Corolla', 'ABC-1234'),
        ('cust-2', 'Maria Oliveira', '(11) 97777-6666', 'Honda Civic',    'XYZ-9876')
      ON CONFLICT (id) DO NOTHING
    `);

    // ── Peças de exemplo ─────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO parts (id, name, price, stock) VALUES
        ('part-1', 'Pastilha de Freio', 150.00, 20),
        ('part-2', 'Óleo 5W30',          45.00, 50),
        ('part-3', 'Filtro de Ar',        80.00, 15)
      ON CONFLICT (id) DO NOTHING
    `);

    // ── Ordens de Serviço de exemplo ────────────────────────────────────────
    await client.query(`
      INSERT INTO service_orders
        (id, entry_date, exit_date, customer_id, employee_id, service_type,
         description, labor_value, status, payment_method, installments,
         warranty_until, checklist, images)
      VALUES
        ('os-1',
         '2026-03-01T08:30:00Z', '2026-03-01T17:45:00Z',
         'cust-1', 'mec-1', 'mechanical',
         'Troca de óleo e filtros', 120.00, 'completed', 'card_credit', 3,
         '2026-06-01T00:00:00Z',
         '{"fuelLevel":50,"mileage":45000,"scratches":"Risco leve porta motorista","valuables":"Nenhum"}',
         '[]'),
        ('os-2',
         '2026-03-06T09:15:00Z', NULL,
         'cust-2', 'mec-2', 'suspension',
         'Revisão de suspensão', 350.00, 'in_progress', NULL, NULL, NULL,
         '{"fuelLevel":25,"mileage":82000,"scratches":"Amassado paralamas traseiro","valuables":"Óculos de sol"}',
         '[]')
      ON CONFLICT (id) DO NOTHING
    `);

    // Peças das OSs
    await client.query(`
      INSERT INTO service_order_parts (service_order_id, part_id, quantity, price_at_time) VALUES
        ('os-1', 'part-2', 4, 45.00),
        ('os-1', 'part-3', 1, 80.00),
        ('os-2', 'part-1', 2, 150.00)
      ON CONFLICT DO NOTHING
    `);

    // ── Despesas de exemplo ──────────────────────────────────────────────────
    await client.query(`
      INSERT INTO monthly_expenses (id, description, amount, due_date, category, is_paid) VALUES
        ('exp-1', 'Aluguel Galpão',    4500.00, '2026-03-10', 'rent',      true),
        ('exp-2', 'Energia Elétrica',   850.00, '2026-03-15', 'utilities', false)
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('[DB] Seed executado com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] Erro no seed:', err);
    throw err;
  } finally {
    client.release();
  }
}
