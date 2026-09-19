import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { 
  Customer, 
  Employee, 
  Part, 
  ServiceOrder, 
  MonthlyExpense, 
  User, 
  WorkshopInfo 
} from "./src/types";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Initial State
  let state = {
    users: [
      { id: '1', name: 'Rubens', email: 'rubens@groficina.com', password: 'admin123', role: 'admin', employeeId: 'admin-1', phone: '(11) 99999-1111', active: true },
      { id: '2', name: 'Marcela', email: 'marcela@groficina.com', password: 'recepcao123', role: 'receptionist', employeeId: 'recep-1', phone: '(11) 99999-2222', active: true },
      { id: '3', name: 'Dusmenil', email: 'dusmenil@groficina.com', password: 'mecanico123', role: 'mechanic', employeeId: '1', phone: '(11) 99999-3333', active: true },
      { id: '4', name: 'Erick', email: 'erick@groficina.com', password: 'mecanico123', role: 'mechanic', employeeId: '2', phone: '(11) 99999-4444', active: true },
    ] as User[],
    customers: [
      { id: '1', name: 'João Silva', phone: '(11) 98888-7777', vehicle: 'Toyota Corolla', plate: 'ABC-1234' },
      { id: '2', name: 'Maria Oliveira', phone: '(11) 97777-6666', vehicle: 'Honda Civic', plate: 'XYZ-9876' },
    ] as Customer[],
    employees: [
      { id: 'admin-1', name: 'Rubens', baseSalary: 5000, commissionRate: 0, role: 'Administrador / Proprietário', phone: '(11) 99999-1111', active: true },
      { id: 'recep-1', name: 'Marcela', baseSalary: 2500, commissionRate: 2, role: 'Recepcionista', phone: '(11) 99999-2222', active: true },
      { id: '1', name: 'Dusmenil', baseSalary: 3500, commissionRate: 10, role: 'Mecânico Líder', phone: '(11) 99999-3333', active: true },
      { id: '2', name: 'Erick', baseSalary: 2200, commissionRate: 5, role: 'Assistente', phone: '(11) 99999-4444', active: true },
    ] as Employee[],
    workshopInfo: {
      name: 'GR OFICINA MECÂNICA',
      cnpj: '00.000.000/0001-00',
      address: 'Rua das Oficinas, 123 - Centro',
      phone: '(11) 99999-8888',
      email: 'contato@groficina.com'
    } as WorkshopInfo,
    parts: [
      { id: '1', name: 'Pastilha de Freio', price: 150, stock: 20 },
      { id: '2', name: 'Óleo 5W30', price: 45, stock: 50 },
      { id: '3', name: 'Filtro de Ar', price: 80, stock: 15 },
    ] as Part[],
    services: [
      { 
        id: '1', 
        entryDate: '2026-03-01T08:30:00Z', 
        exitDate: '2026-03-01T17:45:00Z',
        customerId: '1', 
        employeeId: '1', 
        serviceType: 'mechanical',
        description: 'Troca de óleo e filtros', 
        laborValue: 120, 
        parts: [{ partId: '2', quantity: 4, priceAtTime: 45 }, { partId: '3', quantity: 1, priceAtTime: 80 }],
        status: 'completed',
        paymentMethod: 'card_credit',
        installments: 3,
        checklist: { fuelLevel: 50, mileage: 45000, scratches: 'Risco leve porta motorista', valuables: 'Nenhum' },
        warrantyUntil: '2026-06-01T00:00:00Z'
      },
      { 
        id: '2', 
        entryDate: '2026-03-06T09:15:00Z', 
        customerId: '2', 
        employeeId: '2', 
        serviceType: 'suspension',
        description: 'Revisão de suspensão', 
        laborValue: 350, 
        parts: [{ partId: '1', quantity: 2, priceAtTime: 150 }],
        status: 'in_progress',
        checklist: { fuelLevel: 25, mileage: 82000, scratches: 'Amassado paralamas traseiro', valuables: 'Óculos de sol' }
      },
    ] as ServiceOrder[],
    expenses: [
      { id: '1', description: 'Aluguel Galpão', amount: 4500, dueDate: '2026-03-10', category: 'rent', isPaid: true },
      { id: '2', description: 'Energia Elétrica', amount: 850, dueDate: '2026-03-15', category: 'utilities', isPaid: false },
    ] as MonthlyExpense[],
  };

  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  wss.on("connection", (ws) => {
    console.log("Client connected");
    // Send initial state
    ws.send(JSON.stringify({ type: "INIT", payload: state }));

    ws.on("message", (message) => {
      try {
        const { type, payload } = JSON.parse(message.toString());
        console.log(`Received event: ${type}`);

        switch (type) {
          case "UPDATE_USERS":
            state.users = payload;
            broadcast({ type: "USERS_UPDATED", payload: state.users });
            break;
          case "UPDATE_EMPLOYEES":
            state.employees = payload;
            broadcast({ type: "EMPLOYEES_UPDATED", payload: state.employees });
            break;
          case "UPDATE_CUSTOMERS":
            state.customers = payload;
            broadcast({ type: "CUSTOMERS_UPDATED", payload: state.customers });
            break;
          case "UPDATE_SERVICES":
            state.services = payload;
            broadcast({ type: "SERVICES_UPDATED", payload: state.services });
            break;
          case "UPDATE_EXPENSES":
            state.expenses = payload;
            broadcast({ type: "EXPENSES_UPDATED", payload: state.expenses });
            break;
          case "UPDATE_WORKSHOP":
            state.workshopInfo = payload;
            broadcast({ type: "WORKSHOP_UPDATED", payload: state.workshopInfo });
            break;
          case "UPDATE_PARTS":
            state.parts = payload;
            broadcast({ type: "PARTS_UPDATED", payload: state.parts });
            break;
          default:
            console.warn(`Unknown event type: ${type}`);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  app.use(express.json());

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
