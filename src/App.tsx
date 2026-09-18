import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Download,
  Search,
  Filter,
  LogOut,
  Bell,
  Settings,
  ChevronRight,
  Users,
  Wrench,
  Package,
  UserCircle,
  FileText,
  Calendar,
  Zap,
  Car
} from 'lucide-react';
import { 
  Customer, 
  Employee, 
  Part, 
  ServiceOrder, 
  MonthlyExpense,
  CATEGORIES 
} from './types';
import { StatCard } from './components/StatCard';
import { cn, formatCurrency } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Components for different sections
import { CustomerSection } from './components/sections/CustomerSection';
import { EmployeeSection } from './components/sections/EmployeeSection';
import { ServiceSection } from './components/sections/ServiceSection';
import { InventorySection } from './components/sections/InventorySection';
import { ExpenseSection } from './components/sections/ExpenseSection';
import { SalarySection } from './components/sections/SalarySection';

type ActiveSection = 'dashboard' | 'customers' | 'employees' | 'services' | 'inventory' | 'expenses' | 'salaries';

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  
  // State for the workshop
  const [customers, setCustomers] = useState<Customer[]>([
    { id: '1', name: 'João Silva', phone: '(11) 98888-7777', vehicle: 'Toyota Corolla', plate: 'ABC-1234' },
    { id: '2', name: 'Maria Oliveira', phone: '(11) 97777-6666', vehicle: 'Honda Civic', plate: 'XYZ-9876' },
  ]);
  
  const [employees, setEmployees] = useState<Employee[]>([
    { id: '1', name: 'Carlos Mecânico', baseSalary: 3500, commissionRate: 10, role: 'Mecânico Líder' },
    { id: '2', name: 'Ricardo Assistente', baseSalary: 2200, commissionRate: 5, role: 'Assistente' },
  ]);
  
  const [parts, setParts] = useState<Part[]>([
    { id: '1', name: 'Pastilha de Freio', price: 150, stock: 20 },
    { id: '2', name: 'Óleo 5W30', price: 45, stock: 50 },
    { id: '3', name: 'Filtro de Ar', price: 80, stock: 15 },
  ]);
  
  const [services, setServices] = useState<ServiceOrder[]>([
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
      installments: 3
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
      status: 'in_progress' 
    },
  ]);
  
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([
    { id: '1', description: 'Aluguel Galpão', amount: 4500, dueDate: '2026-03-10', category: 'rent', isPaid: true },
    { id: '2', description: 'Energia Elétrica', amount: 850, dueDate: '2026-03-15', category: 'utilities', isPaid: false },
  ]);

  // Financial Calculations
  const financialStats = useMemo(() => {
    const totalServiceIncome = services.reduce((sum, s) => {
      if (s.status !== 'completed') return sum;
      const partsTotal = s.parts.reduce((pSum, p) => pSum + (p.priceAtTime * p.quantity), 0);
      return sum + s.laborValue + partsTotal;
    }, 0);
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Simple salary calculation for current month (not including 13th yet)
    const totalSalaries = employees.reduce((sum, emp) => {
      const empServices = services.filter(s => s.employeeId === emp.id && s.status === 'completed');
      const commission = empServices.reduce((cSum, s) => cSum + (s.laborValue * (emp.commissionRate / 100)), 0);
      return sum + emp.baseSalary + commission;
    }, 0);

    const currentCars = services.filter(s => s.status === 'pending' || s.status === 'in_progress');

    return {
      income: totalServiceIncome,
      expenses: totalExpenses + totalSalaries,
      balance: totalServiceIncome - (totalExpenses + totalSalaries),
      currentCarsCount: currentCars.length,
      currentCarsList: currentCars
    };
  }, [services, expenses, employees]);

  const renderSection = () => {
    switch (activeSection) {
      case 'customers': return <CustomerSection customers={customers} setCustomers={setCustomers} />;
      case 'employees': return <EmployeeSection employees={employees} setEmployees={setEmployees} />;
      case 'services': return <ServiceSection services={services} setServices={setServices} customers={customers} employees={employees} parts={parts} />;
      case 'inventory': return <InventorySection parts={parts} setParts={setParts} />;
      case 'expenses': return <ExpenseSection expenses={expenses} setExpenses={setExpenses} />;
      case 'salaries': return <SalarySection employees={employees} services={services} />;
      default: return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Faturamento" value={financialStats.income} icon={TrendingUp} variant="income" />
            <StatCard title="Custos" value={financialStats.expenses} icon={TrendingDown} variant="expense" />
            <StatCard title="Lucro" value={financialStats.balance} icon={Wallet} variant="default" />
            <div className="glass-card p-6 flex flex-col gap-4">
              <div className="p-2 w-fit rounded-lg bg-brand-50 border border-brand-100">
                <Car className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Carros na Oficina</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{financialStats.currentCarsCount}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-brand-600" /> Carros Atuais
              </h3>
              <div className="space-y-4">
                {financialStats.currentCarsList.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Nenhum carro no momento.</p>
                ) : (
                  financialStats.currentCarsList.map(s => {
                    const customer = customers.find(c => c.id === s.customerId);
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">{customer?.vehicle}</p>
                            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded uppercase">
                              {s.serviceType === 'mechanical' ? 'Mecânica' : 
                               s.serviceType === 'electrical' ? 'Elétrica' : 
                               s.serviceType === 'suspension' ? 'Suspensão' : 
                               s.serviceType === 'brakes' ? 'Freios' : 
                               s.serviceType === 'engine' ? 'Motor' : 'Outros'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{customer?.name} • {customer?.plate}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-slate-400 italic">"{s.description}"</p>
                            <span className="text-[10px] text-slate-400">•</span>
                            <p className="text-[10px] font-semibold text-slate-600">Mecânico: {employees.find(e => e.id === s.employeeId)?.name}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          s.status === 'in_progress' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {s.status === 'in_progress' ? 'Em Reparo' : 'Aguardando'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Serviços Recentes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Entrada</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Serviço</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.slice(0, 5).map(s => {
                      const customer = customers.find(c => c.id === s.customerId);
                      return (
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-sm">{new Date(s.entryDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            <div className="flex flex-col">
                              <span>{customer?.name}</span>
                              <span className="text-[10px] text-slate-400">{customer?.vehicle}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">
                                {s.serviceType === 'mechanical' ? 'Mecânica' : 
                                 s.serviceType === 'electrical' ? 'Elétrica' : 
                                 s.serviceType === 'suspension' ? 'Suspensão' : 
                                 s.serviceType === 'brakes' ? 'Freios' : 
                                 s.serviceType === 'engine' ? 'Motor' : 'Outros'}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{s.description}</span>
                              <span className="text-[10px] font-bold text-brand-600 mt-0.5">Mecânico: {employees.find(e => e.id === s.employeeId)?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                              s.status === 'completed' ? "bg-emerald-50 text-emerald-700" : 
                              s.status === 'in_progress' ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600"
                            )}>
                              {s.status === 'completed' ? 'Concluído' : s.status === 'in_progress' ? 'Em Reparo' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-200">
              <Wrench className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AutoFix Pro</h1>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'services', label: 'Serviços', icon: Wrench },
              { id: 'customers', label: 'Clientes', icon: UserCircle },
              { id: 'employees', label: 'Equipe', icon: Users },
              { id: 'inventory', label: 'Estoque', icon: Package },
              { id: 'expenses', label: 'Contas', icon: Zap },
              { id: 'salaries', label: 'Folha Pagto', icon: Calendar },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as ActiveSection)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left",
                  activeSection === item.id 
                    ? "bg-brand-50 text-brand-600" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <item.icon className="w-5 h-5" /> {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100">
          <button className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-rose-600 font-medium transition-all w-full">
            <LogOut className="w-5 h-5" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Oficina Mecânica</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-slate-900 capitalize">{activeSection}</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-white rounded-full" />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">Admin Oficina</p>
                <p className="text-xs text-slate-500 mt-1">Gerente</p>
              </div>
              <img 
                src="https://picsum.photos/seed/mechanic/40/40" 
                alt="User" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
