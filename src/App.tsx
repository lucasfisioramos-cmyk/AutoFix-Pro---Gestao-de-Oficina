import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Car,
  Lock,
  Mail,
  ArrowLeft,
  AlertCircle,
  Phone,
  Banknote,
  Receipt
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { 
  Customer, 
  Employee, 
  Part, 
  ServiceOrder, 
  MonthlyExpense,
  CATEGORIES,
  User,
  UserRole,
  WorkshopInfo
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
import { ProfileSection } from './components/sections/ProfileSection';
import { SettingsSection } from './components/sections/SettingsSection';

type ActiveSection = 'dashboard' | 'customers' | 'employees' | 'services' | 'inventory' | 'expenses' | 'salaries' | 'profile' | 'settings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  
  // Recovery State
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'phone' | 'code' | 'newPassword'>('phone');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryUser, setRecoveryUser] = useState<User | null>(null);

  // Mock Users
  const [users, setUsers] = useState<User[]>([]);
  
  // State for the workshop
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo>({
    name: 'Carregando...',
    cnpj: '',
    address: '',
    phone: '',
    email: ''
  });
  
  const [parts, setParts] = useState<Part[]>([]);
  
  const [services, setServices] = useState<ServiceOrder[]>([]);
  
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      isSyncingRef.current = true;
      
      switch (type) {
        case "INIT":
          setUsers(payload.users);
          setCustomers(payload.customers);
          setEmployees(payload.employees);
          setWorkshopInfo(payload.workshopInfo);
          setParts(payload.parts);
          setServices(payload.services);
          setExpenses(payload.expenses);
          break;
        case "USERS_UPDATED":
          setUsers(payload);
          break;
        case "EMPLOYEES_UPDATED":
          setEmployees(payload);
          break;
        case "CUSTOMERS_UPDATED":
          setCustomers(payload);
          break;
        case "SERVICES_UPDATED":
          setServices(payload);
          break;
        case "EXPENSES_UPDATED":
          setExpenses(payload);
          break;
        case "WORKSHOP_UPDATED":
          setWorkshopInfo(payload);
          break;
        case "PARTS_UPDATED":
          setParts(payload);
          break;
      }
      
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
    };

    return () => socket.close();
  }, []);

  const syncState = (type: string, payload: any) => {
    if (isSyncingRef.current) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  useEffect(() => syncState("UPDATE_USERS", users), [users]);
  useEffect(() => syncState("UPDATE_EMPLOYEES", employees), [employees]);
  useEffect(() => syncState("UPDATE_CUSTOMERS", customers), [customers]);
  useEffect(() => syncState("UPDATE_SERVICES", services), [services]);
  useEffect(() => syncState("UPDATE_EXPENSES", expenses), [expenses]);
  useEffect(() => syncState("UPDATE_WORKSHOP", workshopInfo), [workshopInfo]);
  useEffect(() => syncState("UPDATE_PARTS", parts), [parts]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const user = users.find(u => u.email === loginData.email && u.password === loginData.password);
    if (user) {
      if (!user.active) {
        setLoginError('Seu acesso foi bloqueado. Entre em contato com o administrador.');
        return;
      }
      setCurrentUser(user);
      setIsAuthenticated(true);
      // Set default section based on role
      if (user.role === 'mechanic') {
        setActiveSection('services');
      } else {
        setActiveSection('dashboard');
      }
    } else {
      setLoginError('E-mail ou senha incorretos. Verifique seus dados.');
    }
  };

  const handleStartRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.phone === recoveryPhone);
    if (user) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);
      setRecoveryUser(user);
      setRecoveryStep('code');
      alert(`[SIMULAÇÃO SMS] Código enviado para ${recoveryPhone}: ${code}`);
    } else {
      alert('Telefone não encontrado em nossa base de funcionários.');
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryCode === sentCode) {
      setRecoveryStep('newPassword');
    } else {
      alert('Código incorreto. Tente novamente.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryUser) {
      setUsers(prev => prev.map(u => u.id === recoveryUser.id ? { ...u, password: newPassword } : u));
      alert('Senha alterada com sucesso! Agora você pode fazer login.');
      setIsRecovering(false);
      setRecoveryStep('phone');
      setRecoveryPhone('');
      setRecoveryCode('');
      setNewPassword('');
    }
  };

  // Financial Calculations
  const financialStats = useMemo(() => {
    const totalServiceIncome = services.reduce((sum, s) => {
      if (s.status !== 'completed') return sum;
      const partsTotal = s.parts.reduce((pSum, p) => pSum + (p.priceAtTime * p.quantity), 0);
      return sum + s.laborValue + partsTotal;
    }, 0);

    const accountsReceivable = services.reduce((sum, s) => {
      if (s.status === 'completed' || s.status === 'cancelled') return sum;
      const partsTotal = s.parts.reduce((pSum, p) => pSum + (p.priceAtTime * p.quantity), 0);
      return sum + s.laborValue + partsTotal;
    }, 0);
    
    const paidExpenses = expenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
    const accountsPayable = expenses.filter(e => !e.isPaid).reduce((sum, e) => sum + e.amount, 0);
    
    // Simple salary calculation for current month
    const totalSalaries = employees.reduce((sum, emp) => {
      const empServices = services.filter(s => s.employeeId === emp.id && s.status === 'completed');
      const commission = empServices.reduce((cSum, s) => cSum + (s.laborValue * (emp.commissionRate / 100)), 0);
      return sum + emp.baseSalary + commission;
    }, 0);

    const currentCars = services.filter(s => s.status === 'pending' || s.status === 'in_progress');

    return {
      income: totalServiceIncome,
      expenses: paidExpenses + totalSalaries,
      balance: totalServiceIncome - (paidExpenses + totalSalaries),
      accountsReceivable,
      accountsPayable,
      currentCarsCount: currentCars.length,
      currentCarsList: currentCars
    };
  }, [services, expenses, employees]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-xl shadow-brand-200 mb-4">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{workshopInfo.name}</h1>
            <p className="text-slate-500 font-medium">Sistema de Gestão Automotiva</p>
          </div>

          <div className="glass-card p-8">
            {isRecovering ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => { setIsRecovering(false); setRecoveryStep('phone'); }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <h2 className="text-xl font-bold text-slate-900">Recuperar Senha</h2>
                </div>

                {recoveryStep === 'phone' && (
                  <form onSubmit={handleStartRecovery} className="space-y-4">
                    <p className="text-sm text-slate-500">Informe seu número de celular cadastrado para receber um código de verificação via SMS.</p>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Celular</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          required
                          type="text"
                          placeholder="(00) 00000-0000"
                          value={recoveryPhone}
                          onChange={e => setRecoveryPhone(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all transform hover:-translate-y-0.5">
                      Enviar Código via SMS
                    </button>
                  </form>
                )}

                {recoveryStep === 'code' && (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <p className="text-sm text-slate-500">Digite o código de 6 dígitos enviado para o seu celular.</p>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Código de Verificação</label>
                      <input
                        required
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={recoveryCode}
                        onChange={e => setRecoveryCode(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-center text-2xl tracking-[0.5em] font-bold"
                      />
                    </div>
                    <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all transform hover:-translate-y-0.5">
                      Verificar Código
                    </button>
                  </form>
                )}

                {recoveryStep === 'newPassword' && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <p className="text-sm text-slate-500">Crie uma nova senha segura para o seu acesso.</p>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nova Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          required
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all transform hover:-translate-y-0.5">
                      Alterar Senha
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        required
                        type="email"
                        value={loginData.email}
                        onChange={e => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
                      <button 
                        type="button"
                        onClick={() => setIsRecovering(true)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        required
                        type="password"
                        value={loginData.password}
                        onChange={e => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {loginError}
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all transform hover:-translate-y-0.5"
                >
                  Entrar no Sistema
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'customers': 
        if (currentUser?.role === 'mechanic') return null;
        return <CustomerSection customers={customers} setCustomers={setCustomers} />;
      case 'employees': 
        if (currentUser?.role !== 'admin') return null;
        return <EmployeeSection employees={employees} setEmployees={setEmployees} users={users} setUsers={setUsers} />;
      case 'services': 
        return (
          <ServiceSection 
            services={services} 
            setServices={setServices} 
            customers={customers} 
            employees={employees} 
            parts={parts}
            role={currentUser?.role || 'mechanic'}
            currentUser={currentUser!}
            workshopInfo={workshopInfo}
          />
        );
      case 'inventory': 
        if (currentUser?.role === 'mechanic') return null;
        return <InventorySection parts={parts} setParts={setParts} />;
      case 'expenses': 
        if (currentUser?.role !== 'admin') return null;
        return <ExpenseSection expenses={expenses} setExpenses={setExpenses} />;
      case 'salaries': 
        if (currentUser?.role !== 'admin') return null;
        return <SalarySection employees={employees} services={services} workshopInfo={workshopInfo} />;
      case 'profile':
        return <ProfileSection user={currentUser!} setUsers={setUsers} setCurrentUser={setCurrentUser} />;
      case 'settings':
        if (currentUser?.role !== 'admin') return null;
        return <SettingsSection workshopInfo={workshopInfo} setWorkshopInfo={setWorkshopInfo} />;
      default: return (
        <div className="space-y-8">
          {currentUser?.role === 'admin' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <StatCard title="Faturamento" value={financialStats.income} icon={TrendingUp} variant="income" />
                <StatCard title="Custos Pagos" value={financialStats.expenses} icon={TrendingDown} variant="expense" />
                <StatCard title="Lucro Real" value={financialStats.balance} icon={Wallet} variant="default" />
                <StatCard title="A Receber" value={financialStats.accountsReceivable} icon={Banknote} variant="income" />
                <StatCard title="A Pagar" value={financialStats.accountsPayable} icon={Receipt} variant="expense" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Fluxo de Caixa (Mensal)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Jan', entrada: 4500, saida: 3200 },
                        { name: 'Fev', entrada: 5200, saida: 3800 },
                        { name: 'Mar', entrada: financialStats.income, saida: financialStats.expenses },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="entrada" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
                        <Bar dataKey="saida" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Distribuição de Serviços</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Mecânica', value: services.filter(s => s.serviceType === 'mechanical').length },
                            { name: 'Elétrica', value: services.filter(s => s.serviceType === 'electrical').length },
                            { name: 'Suspensão', value: services.filter(s => s.serviceType === 'suspension').length },
                            { name: 'Freios', value: services.filter(s => s.serviceType === 'brakes').length },
                            { name: 'Outros', value: services.filter(s => s.serviceType === 'other').length },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className={cn("grid grid-cols-1 gap-8", currentUser?.role === 'admin' ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-brand-600" /> 
                Carros Atuais na Oficina
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
                                s.status === 'in_progress' ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
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
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{workshopInfo.name}</h1>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'receptionist', 'mechanic'] },
              { id: 'services', label: 'Serviços', icon: Wrench, roles: ['admin', 'receptionist', 'mechanic'] },
              { id: 'customers', label: 'Clientes', icon: UserCircle, roles: ['admin', 'receptionist'] },
              { id: 'employees', label: 'Equipe', icon: Users, roles: ['admin'] },
              { id: 'inventory', label: 'Estoque', icon: Package, roles: ['admin', 'receptionist'] },
              { id: 'expenses', label: 'Contas', icon: Zap, roles: ['admin'] },
              { id: 'salaries', label: 'Folha Pagto', icon: Calendar, roles: ['admin'] },
              { id: 'profile', label: 'Meu Perfil', icon: UserCircle, roles: ['admin', 'receptionist', 'mechanic'] },
              { id: 'settings', label: 'Configurações', icon: Settings, roles: ['admin'] },
            ].filter(item => item.roles.includes(currentUser?.role || 'mechanic')).map(item => (
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
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-rose-600 font-medium transition-all w-full"
          >
            <LogOut className="w-5 h-5" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{workshopInfo.name}</span>
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
                <p className="text-sm font-bold text-slate-900 leading-none">{currentUser?.name}</p>
                <p className="text-xs text-slate-500 mt-1 capitalize">{currentUser?.role}</p>
              </div>
              <img 
                src={currentUser?.profileImage || `https://picsum.photos/seed/${currentUser?.id}/40/40`} 
                alt="User" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
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
