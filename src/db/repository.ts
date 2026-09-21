import { pool } from './connection';
import bcrypt from 'bcrypt';
import {
  Customer,
  Employee,
  Part,
  ServiceOrder,
  MonthlyExpense,
  User,
  WorkshopInfo,
} from '../types';

const SALT_ROUNDS = 12;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de mapeamento (snake_case DB → camelCase App)
// ─────────────────────────────────────────────────────────────────────────────

function rowToUser(row: any): User {
  return {
    id:           row.id,
    name:         row.name,
    email:        row.email,
    password:     '', // nunca exposto
    phone:        row.phone || '',
    role:         row.role,
    employeeId:   row.employee_id || undefined,
    profileImage: row.profile_image || undefined,
    active:       row.active,
  };
}

function rowToEmployee(row: any): Employee {
  return {
    id:             row.id,
    name:           row.name,
    baseSalary:     parseFloat(row.base_salary),
    commissionRate: parseFloat(row.commission_rate),
    role:           row.role,
    phone:          row.phone,
    active:         row.active,
  };
}

function rowToCustomer(row: any): Customer {
  return {
    id:      row.id,
    name:    row.name,
    phone:   row.phone,
    email:   row.email || undefined,
    vehicle: row.vehicle,
    plate:   row.plate,
  };
}

function rowToPart(row: any): Part {
  return {
    id:    row.id,
    name:  row.name,
    price: parseFloat(row.price),
    stock: parseInt(row.stock),
  };
}

function rowToServiceOrder(row: any): ServiceOrder {
  // As partes vêm como JSON agregado via query
  const parts = (row.parts_json || []).map((p: any) => ({
    partId:      p.part_id,
    quantity:    parseInt(p.quantity),
    priceAtTime: parseFloat(p.price_at_time),
  }));

  return {
    id:            row.id,
    entryDate:     new Date(row.entry_date).toISOString(),
    exitDate:      row.exit_date ? new Date(row.exit_date).toISOString() : undefined,
    customerId:    row.customer_id,
    employeeId:    row.employee_id,
    serviceType:   row.service_type,
    description:   row.description,
    notes:         row.notes || undefined,
    laborValue:    parseFloat(row.labor_value),
    status:        row.status,
    paymentMethod: row.payment_method || undefined,
    installments:  row.installments ? parseInt(row.installments) : undefined,
    warrantyUntil: row.warranty_until ? new Date(row.warranty_until).toISOString() : undefined,
    checklist:     row.checklist || undefined,
    images:        row.images || [],
    parts,
  };
}

function rowToExpense(row: any): MonthlyExpense {
  return {
    id:          row.id,
    description: row.description,
    amount:      parseFloat(row.amount),
    dueDate:     row.due_date instanceof Date
                   ? row.due_date.toISOString().split('T')[0]
                   : String(row.due_date),
    paidDate:    row.paid_date
                   ? (row.paid_date instanceof Date
                       ? row.paid_date.toISOString().split('T')[0]
                       : String(row.paid_date))
                   : undefined,
    category:    row.category,
    isPaid:      row.is_paid,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Workshop Info
// ─────────────────────────────────────────────────────────────────────────────

export const WorkshopRepo = {
  async get(): Promise<WorkshopInfo> {
    const { rows } = await pool.query('SELECT * FROM workshop_info WHERE id = 1');
    const r = rows[0];
    return { name: r.name, cnpj: r.cnpj, address: r.address, phone: r.phone, email: r.email };
  },

  async update(info: WorkshopInfo): Promise<WorkshopInfo> {
    const { rows } = await pool.query(
      `UPDATE workshop_info
         SET name = $1, cnpj = $2, address = $3, phone = $4, email = $5, updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [info.name, info.cnpj, info.address, info.phone, info.email]
    );
    const r = rows[0];
    return { name: r.name, cnpj: r.cnpj, address: r.address, phone: r.phone, email: r.email };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

export const UserRepo = {
  async getAll(): Promise<User[]> {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at');
    return rows.map(rowToUser);
  },

  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows.length) return null;
    const r = rows[0];
    return { ...rowToUser(r), passwordHash: r.password_hash };
  },

  async findByPhone(phone: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (!rows.length) return null;
    return rowToUser(rows[0]);
  },

  async create(data: Omit<User, 'id'> & { id: string }): Promise<User> {
    const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, phone, role, employee_id, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [data.id, data.name, data.email, hash, data.phone || '', data.role, data.employeeId || null, data.active]
    );
    return rowToUser(rows[0]);
  },

  async update(id: string, data: Partial<User> & { password?: string }): Promise<User> {
    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!existing.rows.length) throw new Error(`Usuário ${id} não encontrado`);

    const r = existing.rows[0];
    const newHash = data.password
      ? await bcrypt.hash(data.password, SALT_ROUNDS)
      : r.password_hash;

    const { rows } = await pool.query(
      `UPDATE users SET
         name          = $1,
         email         = $2,
         password_hash = $3,
         phone         = $4,
         role          = $5,
         employee_id   = $6,
         profile_image = $7,
         active        = $8,
         updated_at    = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        data.name          ?? r.name,
        data.email         ?? r.email,
        newHash,
        data.phone         ?? r.phone,
        data.role          ?? r.role,
        data.employeeId    !== undefined ? data.employeeId : r.employee_id,
        data.profileImage  !== undefined ? data.profileImage : r.profile_image,
        data.active        !== undefined ? data.active : r.active,
        id,
      ]
    );
    return rowToUser(rows[0]);
  },

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await UserRepo.findByEmail(email);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return { ...user, passwordHash: undefined } as unknown as User;
  },

  async changePassword(id: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, id]
    );
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await pool.query(
      'UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2',
      [active, id]
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Employees
// ─────────────────────────────────────────────────────────────────────────────

export const EmployeeRepo = {
  async getAll(): Promise<Employee[]> {
    const { rows } = await pool.query('SELECT * FROM employees ORDER BY created_at');
    return rows.map(rowToEmployee);
  },

  async create(data: Employee): Promise<Employee> {
    const { rows } = await pool.query(
      `INSERT INTO employees (id, name, base_salary, commission_rate, role, phone, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [data.id, data.name, data.baseSalary, data.commissionRate, data.role, data.phone, data.active]
    );
    return rowToEmployee(rows[0]);
  },

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    const existing = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (!existing.rows.length) throw new Error(`Funcionário ${id} não encontrado`);
    const r = existing.rows[0];

    const { rows } = await pool.query(
      `UPDATE employees SET
         name            = $1,
         base_salary     = $2,
         commission_rate = $3,
         role            = $4,
         phone           = $5,
         active          = $6,
         updated_at      = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        data.name           ?? r.name,
        data.baseSalary     ?? r.base_salary,
        data.commissionRate ?? r.commission_rate,
        data.role           ?? r.role,
        data.phone          ?? r.phone,
        data.active         !== undefined ? data.active : r.active,
        id,
      ]
    );
    return rowToEmployee(rows[0]);
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await pool.query(
      'UPDATE employees SET active = $1, updated_at = NOW() WHERE id = $2',
      [active, id]
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────────────────────────

export const CustomerRepo = {
  async getAll(): Promise<Customer[]> {
    const { rows } = await pool.query('SELECT * FROM customers ORDER BY name');
    return rows.map(rowToCustomer);
  },

  async create(data: Customer): Promise<Customer> {
    const { rows } = await pool.query(
      `INSERT INTO customers (id, name, phone, email, vehicle, plate)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [data.id, data.name, data.phone, data.email || null, data.vehicle, data.plate]
    );
    return rowToCustomer(rows[0]);
  },

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const existing = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (!existing.rows.length) throw new Error(`Cliente ${id} não encontrado`);
    const r = existing.rows[0];

    const { rows } = await pool.query(
      `UPDATE customers SET
         name       = $1,
         phone      = $2,
         email      = $3,
         vehicle    = $4,
         plate      = $5,
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        data.name    ?? r.name,
        data.phone   ?? r.phone,
        data.email   !== undefined ? data.email : r.email,
        data.vehicle ?? r.vehicle,
        data.plate   ?? r.plate,
        id,
      ]
    );
    return rowToCustomer(rows[0]);
  },

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM customers WHERE id = $1', [id]);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Parts
// ─────────────────────────────────────────────────────────────────────────────

export const PartRepo = {
  async getAll(): Promise<Part[]> {
    const { rows } = await pool.query('SELECT * FROM parts ORDER BY name');
    return rows.map(rowToPart);
  },

  async create(data: Part): Promise<Part> {
    const { rows } = await pool.query(
      `INSERT INTO parts (id, name, price, stock) VALUES ($1,$2,$3,$4) RETURNING *`,
      [data.id, data.name, data.price, data.stock]
    );
    return rowToPart(rows[0]);
  },

  async update(id: string, data: Partial<Part>): Promise<Part> {
    const existing = await pool.query('SELECT * FROM parts WHERE id = $1', [id]);
    if (!existing.rows.length) throw new Error(`Peça ${id} não encontrada`);
    const r = existing.rows[0];

    const { rows } = await pool.query(
      `UPDATE parts SET name = $1, price = $2, stock = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [
        data.name  ?? r.name,
        data.price ?? r.price,
        data.stock ?? r.stock,
        id,
      ]
    );
    return rowToPart(rows[0]);
  },

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM parts WHERE id = $1', [id]);
  },

  /** Desconta estoque das peças usadas em uma O.S. dentro de uma transação */
  async decrementStock(
    client: import('pg').PoolClient,
    items: { partId: string; quantity: number }[]
  ): Promise<void> {
    for (const item of items) {
      const result = await client.query(
        `UPDATE parts SET stock = stock - $1, updated_at = NOW()
         WHERE id = $2 AND stock >= $1
         RETURNING id, stock`,
        [item.quantity, item.partId]
      );
      if (!result.rows.length) {
        throw new Error(`Estoque insuficiente para a peça ${item.partId}`);
      }
    }
  },

  /** Devolve estoque ao cancelar/editar uma O.S. */
  async incrementStock(
    client: import('pg').PoolClient,
    items: { partId: string; quantity: number }[]
  ): Promise<void> {
    for (const item of items) {
      await client.query(
        `UPDATE parts SET stock = stock + $1, updated_at = NOW() WHERE id = $2`,
        [item.quantity, item.partId]
      );
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Orders
// ─────────────────────────────────────────────────────────────────────────────

/** Query base que traz a OS junto com suas peças em JSON */
const SERVICE_ORDER_SELECT = `
  SELECT
    so.*,
    COALESCE(
      json_agg(
        json_build_object(
          'part_id',      sop.part_id,
          'quantity',     sop.quantity,
          'price_at_time', sop.price_at_time
        )
      ) FILTER (WHERE sop.id IS NOT NULL),
      '[]'
    ) AS parts_json
  FROM service_orders so
  LEFT JOIN service_order_parts sop ON sop.service_order_id = so.id
`;

export const ServiceOrderRepo = {
  async getAll(): Promise<ServiceOrder[]> {
    const { rows } = await pool.query(
      `${SERVICE_ORDER_SELECT}
       GROUP BY so.id
       ORDER BY so.entry_date DESC`
    );
    return rows.map(rowToServiceOrder);
  },

  async create(data: ServiceOrder): Promise<ServiceOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO service_orders
           (id, entry_date, exit_date, customer_id, employee_id, service_type,
            description, notes, labor_value, status, payment_method, installments,
            warranty_until, checklist, images)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          data.id,
          data.entryDate,
          data.exitDate   || null,
          data.customerId,
          data.employeeId,
          data.serviceType,
          data.description,
          data.notes      || null,
          data.laborValue,
          data.status,
          data.paymentMethod  || null,
          data.installments   || null,
          data.warrantyUntil  || null,
          data.checklist ? JSON.stringify(data.checklist) : null,
          JSON.stringify(data.images || []),
        ]
      );

      if (data.parts.length > 0) {
        for (const p of data.parts) {
          await client.query(
            `INSERT INTO service_order_parts (service_order_id, part_id, quantity, price_at_time)
             VALUES ($1,$2,$3,$4)`,
            [data.id, p.partId, p.quantity, p.priceAtTime]
          );
        }
        // Desconta estoque
        await PartRepo.decrementStock(client, data.parts.map(p => ({ partId: p.partId, quantity: p.quantity })));
      }

      await client.query('COMMIT');
      return await ServiceOrderRepo.getById(data.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: string, data: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT * FROM service_orders WHERE id = $1', [id]);
      if (!existing.rows.length) throw new Error(`O.S. ${id} não encontrada`);
      const r = existing.rows[0];

      await client.query(
        `UPDATE service_orders SET
           exit_date      = $1,
           employee_id    = $2,
           service_type   = $3,
           description    = $4,
           notes          = $5,
           labor_value    = $6,
           status         = $7,
           payment_method = $8,
           installments   = $9,
           warranty_until = $10,
           checklist      = $11,
           images         = $12,
           updated_at     = NOW()
         WHERE id = $13`,
        [
          data.exitDate       !== undefined ? data.exitDate       : r.exit_date,
          data.employeeId     ?? r.employee_id,
          data.serviceType    ?? r.service_type,
          data.description    ?? r.description,
          data.notes          !== undefined ? data.notes          : r.notes,
          data.laborValue     ?? r.labor_value,
          data.status         ?? r.status,
          data.paymentMethod  !== undefined ? data.paymentMethod  : r.payment_method,
          data.installments   !== undefined ? data.installments   : r.installments,
          data.warrantyUntil  !== undefined ? data.warrantyUntil  : r.warranty_until,
          data.checklist      !== undefined ? JSON.stringify(data.checklist) : r.checklist,
          data.images         !== undefined ? JSON.stringify(data.images)    : r.images,
          id,
        ]
      );

      // Se as peças foram alteradas, reprocessa estoque
      if (data.parts !== undefined) {
        // Devolve estoque das peças antigas
        const oldParts = await client.query(
          'SELECT part_id, quantity FROM service_order_parts WHERE service_order_id = $1',
          [id]
        );
        if (oldParts.rows.length > 0) {
          await PartRepo.incrementStock(client, oldParts.rows.map((p: any) => ({
            partId: p.part_id, quantity: parseInt(p.quantity)
          })));
        }

        // Remove peças antigas e insere novas
        await client.query('DELETE FROM service_order_parts WHERE service_order_id = $1', [id]);
        for (const p of data.parts) {
          await client.query(
            `INSERT INTO service_order_parts (service_order_id, part_id, quantity, price_at_time)
             VALUES ($1,$2,$3,$4)`,
            [id, p.partId, p.quantity, p.priceAtTime]
          );
        }

        if (data.parts.length > 0) {
          await PartRepo.decrementStock(client, data.parts.map(p => ({ partId: p.partId, quantity: p.quantity })));
        }
      }

      await client.query('COMMIT');
      return await ServiceOrderRepo.getById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getById(id: string): Promise<ServiceOrder> {
    const { rows } = await pool.query(
      `${SERVICE_ORDER_SELECT} WHERE so.id = $1 GROUP BY so.id`,
      [id]
    );
    if (!rows.length) throw new Error(`O.S. ${id} não encontrada`);
    return rowToServiceOrder(rows[0]);
  },

  async cancel(id: string): Promise<ServiceOrder> {
    return ServiceOrderRepo.update(id, { status: 'cancelled' });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Monthly Expenses
// ─────────────────────────────────────────────────────────────────────────────

export const ExpenseRepo = {
  async getAll(): Promise<MonthlyExpense[]> {
    const { rows } = await pool.query('SELECT * FROM monthly_expenses ORDER BY due_date DESC');
    return rows.map(rowToExpense);
  },

  async create(data: MonthlyExpense): Promise<MonthlyExpense> {
    const { rows } = await pool.query(
      `INSERT INTO monthly_expenses (id, description, amount, due_date, paid_date, category, is_paid)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [data.id, data.description, data.amount, data.dueDate, data.paidDate || null, data.category, data.isPaid]
    );
    return rowToExpense(rows[0]);
  },

  async update(id: string, data: Partial<MonthlyExpense>): Promise<MonthlyExpense> {
    const existing = await pool.query('SELECT * FROM monthly_expenses WHERE id = $1', [id]);
    if (!existing.rows.length) throw new Error(`Despesa ${id} não encontrada`);
    const r = existing.rows[0];

    const { rows } = await pool.query(
      `UPDATE monthly_expenses SET
         description = $1,
         amount      = $2,
         due_date    = $3,
         paid_date   = $4,
         category    = $5,
         is_paid     = $6,
         updated_at  = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        data.description ?? r.description,
        data.amount      ?? r.amount,
        data.dueDate     ?? r.due_date,
        data.paidDate    !== undefined ? data.paidDate : r.paid_date,
        data.category    ?? r.category,
        data.isPaid      !== undefined ? data.isPaid  : r.is_paid,
        id,
      ]
    );
    return rowToExpense(rows[0]);
  },

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM monthly_expenses WHERE id = $1', [id]);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Carrega todo o estado inicial de uma vez (para o INIT do WebSocket)
// ─────────────────────────────────────────────────────────────────────────────

export async function loadFullState() {
  const [workshopInfo, users, employees, customers, parts, services, expenses] = await Promise.all([
    WorkshopRepo.get(),
    UserRepo.getAll(),
    EmployeeRepo.getAll(),
    CustomerRepo.getAll(),
    PartRepo.getAll(),
    ServiceOrderRepo.getAll(),
    ExpenseRepo.getAll(),
  ]);

  return { workshopInfo, users, employees, customers, parts, services, expenses };
}
