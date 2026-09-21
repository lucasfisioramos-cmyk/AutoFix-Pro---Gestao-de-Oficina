import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  LogOut,
  Bell,
  Settings,
  ChevronRight,
  Users,
  Wrench,
  Package,
  UserCircle,
  Calendar,
  Zap,
  Car,
  Lock,
  Mail,
  ArrowLeft,
  AlertCircle,
  Phone,
  Banknote,
  Receipt,
  Loader2
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
  WorkshopInfo
} from './types';
import { StatCard } from './components/StatCard';
import { cn, formatCurrency } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { CustomerSection } from './components/sections/CustomerSection';
import { EmployeeSection } from './components/sections/EmployeeSection';
import { ServiceSection } from './components/sections/ServiceSection';
import { InventorySection } from './components/sections/InventorySection';
import { ExpenseSection } from './components/sections/ExpenseSection';
import { SalarySection } from './components/sections/SalarySection';
import { ProfileSection } from './components/sections/ProfileSection';
import { SettingsSection } from './components/sections/SettingsSection';

type ActiveSection = 'dashboard' | 'customers' | 'employees' | 'services' | 'inventory' | 'expenses' | 'salaries' | 'profile' | 'settings';

// ─── Hook WebSocket ────────────────────────────────────────────────────────────
function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, (data: any) => void>>(new Map());
  const listenersRef = useRef<Map<string, (payload: any) => void>>(new Map());
  const [connected, setConnected] = useState(false);

  const send = useCallback((type: string, payload?: any, requestId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload, requestId }));
    }
  }, []);

  // Envia uma mensagem e aguarda uma resposta com requestId
  const request = useCallback(<T = any>(type: string, payload?: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substr(2, 9);
      pendingRef.current.set(requestId, (data) => {
        if (data.type === 'ERROR') reject(new Error(data.message));
        else resolve(data as T);
      });
      send(type, payload, requestId);
      // Timeout de 10s
      setTimeout(() => {
        if (pendingRef.current.has(requestId)) {
          pendingRef.current.delete(requestId);
          reject(new Error('Timeout na requisição.'));
        }
      }, 10000);
    });
  }, [send]);

  const on = useCallback((type: string, handler: (payload: any) => void) => {
    listenersRef.current.set(type, handler);
    return () => listenersRef.current.delete(type);
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Resolve requisições pendentes por requestId
      if (data.requestId && pendingRef.current.has(data.requestId)) {
        const cb = pendingRef.current.get(data.requestId)!;
        pendingRef.current.delete(data.requestId);
        cb(data);
        return;
      }

      // Despacha para listeners registrados
      const handler = listenersRef.current.get(data.type);
      if (handler) handler(data.payload);
    };

    return () => ws.close();
  }, []);

  return { send, request, on, connected };
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { send, request, on, connected } = useWebSocket();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [initialLoading, setInitialLoading] = useState(true);

  // Recovery
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'phone' | 'code' | 'newPassword'>('phone');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo>({
    name: 'GR Oficina Mecânica', cnpj: '', address: '', phone: '', email: ''
  });
  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<ServiceOrder[]>([]);
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);

  // Registra listeners de broadcast do servidor
  useEffect(() => {
    const offs = [
      on('INIT', (payload) => {
        setWorkshopInfo(payload.workshopInfo);
        setUsers(payload.users);
        setCustomers(payload.customers);
        setEmployees(payload.employees);
        setParts(payload.parts);
        setServices(payload.services);
        setExpenses(payload.expenses);
        setInitialLoading(false);
      }),
      on('WORKSHOP_UPDATED',  setWorkshopInfo),
      on('USERS_UPDATED',     setUsers),
      on('CUSTOMERS_UPDATED', setCustomers),
      on('EMPLOYEES_UPDATED', setEmployees),
      on('PARTS_UPDATED',     setParts),
      on('SERVICES_UPDATED',  setServices),
      on('EXPENSES_UPDATED',  setExpenses),
    ];
    return () => offs.forEach(off => off());
  }, [on]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await request<any>('LOGIN', loginData);
      if (res.success) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        setActiveSection(res.user.role === 'mechanic' ? 'services' : 'dashboard');
      } else {
        setLoginError(res.message);
      }
    } catch {
      setLoginError('Erro de conexão. Tente novamente.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Recuperação de Senha ──────────────────────────────────────────────────
  const handleStartRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.phone === recoveryPhone);
    if (user) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);
      setRecoveryUserId(user.id);
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUserId) return;
    try {
      await request('CHANGE_PASSWORD', { id: recoveryUserId, newPassword });
      alert('Senha alterada com sucesso! Agora você pode fazer login.');
      setIsRecovering(false);
      setRecoveryStep('phone');
      setRecoveryPhone('');
      setRecoveryCode('');
      setNewPassword('');
      setRecoveryUserId(null);
    } catch (err: any) {
      alert(`Erro ao alterar senha: ${err.message}`);
    }
  };

  // ── Wrappers de mutação que delegam ao servidor ───────────────────────────
  // CustomerSection espera um setter React; interceptamos para enviar ao servidor.
  const handleSetCustomers: React.Dispatch<React.SetStateAction<Customer[]>> = useCallback((action) => {
    setCustomers(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      // Determina a operação pela diferença
      if (next.length > prev.length) {
        const novo = next.find(n => !prev.some(p => p.id === n.id));
        if (novo) send('CREATE_CUSTOMER', novo);
      } else if (next.length < prev.length) {
        const removido = prev.find(p => !next.some(n => n.id === p.id));
        if (removido) send('DELETE_CUSTOMER', { id: removido.id });
      } else {
        const editado = next.find(n => {
          const old = prev.find(p => p.id === n.id);
          return old && JSON.stringify(old) !== JSON.stringify(n);
        });
        if (editado) send('UPDATE_CUSTOMER', editado);
      }
      return prev; // Estado real vem do broadcast do servidor
    });
  }, [send]);

  const handleSetEmployees: React.Dispatch<React.SetStateAction<Employee[]>> = useCallback((action) => {
    setEmployees(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next.length > prev.length) {
        const novo = next.find(n => !prev.some(p => p.id === n.id));
        if (novo) send('CREATE_EMPLOYEE', novo);
      } else {
        const editado = next.find(n => {
          const old = prev.find(p => p.id === n.id);
          return old && JSON.stringify(old) !== JSON.stringify(n);
        });
        if (editado) send('UPDATE_EMPLOYEE', editado);
      }
      return prev;
    });
  }, [send]);

  const handleSetUsers: React.Dispatch<React.SetStateAction<User[]>> = useCallback((action) => {
    setUsers(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next.length > prev.length) {
        const novo = next.find(n => !prev.some(p => p.id === n.id));
        if (novo) send('CREATE_USER', novo);
      } else {
        const editado = next.find(n => {
          const old = prev.find(p => p.id === n.id);
          return old && JSON.stringify(old) !== JSON.stringify(n);
        });
        if (editado) {
          // Se a senha mudou, usa CHANGE_PASSWORD. Se não, UPDATE_USER.
          const old = prev.find(p => p.id === editado.id);
          if (old && editado.password && editado.password !== old.password) {
            send('CHANGE_PASSWORD', { id: editado.id, newPassword: editado.password });
            send('UPDATE_USER', { ...editado, password: '' });
          } else {
            send('UPDATE_USER', editado);
          }
        }
      }
      return prev;
    });
  }, [send]);

  const handleSetParts: React.Dispatch<React.SetStateAction<Part[]>> = useCallback((action) => {
    setParts(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next.length > prev.length) {
        const novo = next.find(n => !prev.some(p => p.id === n.id));
        if (novo) send('CREATE_PART', novo);
      } else if (next.length < prev.length) {
        const removido = prev.find(p => !next.some(n => n.id === p.id));
        if (removido) send('DELETE_PART', { id: removido.id });
      } else {
        const editado = next.find(n => {
          const old = prev.find(p => p.id === n.id);
          return old && JSON.stringify(old) !== JSON.stringify(n);
        });
        if (editado) send('UPDATE_PART', editado);
      }
      return prev;
    });
  }, [send]);

  const handleSetServices: React.Dispatch<React.SetStateAction<ServiceOrder[]>> = useCallback((action) => {
    setServices(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next.length > prev.length) {
        const nova = next.find(n => !prev.some(p => p.id === n.id));
        if (nova) send('CREATE_SERVICE', nova);
      } else {
        const editada = next.find(n => {
          const old = prev.find(p => p.id === n.id);
          return old && JSON.stringify(old) !== JSON.stringify(n);
        });
        if (editada) send('UPDATE_SERVICE', editada);
      }
      return prev;
    });
  }, [send]);

  const handleSetExpenses: React.Dispatch<React.SetStateAction<MonthlyExpense[]>> = useCallback((action) => {
    setExpenses(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next.length > prev.length) {
        const nova = next.find(n => !prev.some(p => p.id === n.id));
        if (nova) send('CREATE_EXPENSE', nova);
      } else if (next.length < prev.length) {
        const removida = prev.find(p => !next.some(n => n.id === p.id));
        if (removida) send('DELETE_EXPENSE', { id: removida.id });
      } else {
        const editada = next.find(n => {
          const old = prev.find(p => p.id === n.id);
          return old && JSON.stringify(old) !== JSON.stringify(n);
        });
        if (editada) send('UPDATE_EXPENSE', editada);
      }
      return prev;
    });
  }, [send]);

  const handleSetWorkshopInfo: React.Dispatch<React.SetStateAction<WorkshopInfo>> = useCallback((action) => {
    setWorkshopInfo(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      send('UPDATE_WORKSHOP', next);
      return prev;
    });
  }, [send]);

  // ── Stats financeiros ──────────────────────────────────────────────────────
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

  // ── Tela de carregamento inicial ──────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-xl shadow-brand-200">
            <Wrench className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <p className="text-slate-700 font-bold text-lg">Conectando ao servidor...</p>
            <p className="text-slate-400 text-sm">Carregando dados do PostgreSQL</p>
          </div>
          <Loader2 className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ── Tela de Login ─────────────────────────────────────────────────────────
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
                    <p className="text-sm text-slate-500">Informe seu número de celular cadastrado.</p>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Celular</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input required type="text" placeholder="(00) 00000-0000" value={recoveryPhone}
                          onChange={e => setRecoveryPhone(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all">Enviar Código</button>
                  </form>
                )}

                {recoveryStep === 'code' && (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <p className="text-sm text-slate-500">Digite o código de 6 dígitos.</p>
                    <input required type="text" maxLength={6} placeholder="000000" value={recoveryCode}
                      onChange={e => setRecoveryCode(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-center text-2xl tracking-[0.5em] font-bold" />
                    <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all">Verificar</button>
                  </form>
                )}

                {recoveryStep === 'newPassword' && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <p className="text-sm text-slate-500">Crie uma nova senha segura.</p>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input required type="password" placeholder="••••••••" value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all">Alterar Senha</button>
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
                      <input required type="email" value={loginData.email}
                        onChange={e => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                        placeholder="seu@email.com" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
                      <button type="button" onClick={() => setIsRecovering(true)} className="text-xs font-bold text-brand-600 hover:text-brand-700">Esqueceu a senha?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input required type="password" value={loginData.password}
                        onChange={e => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                        placeholder="••••••••" />
                    </div>
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {loginError}
                  </div>
                )}

                <button type="submit" disabled={loginLoading}
                  className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Entrar no Sistema
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Seções ────────────────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'customers': 
        if (currentUser?.role === 'mechanic') return null;
        return <CustomerSection customers={customers} setCustomers={handleSetCustomers} />;
      case 'employees': 
        if (currentUser?.role !== 'admin') return null;
        return <EmployeeSection employees={employees} setEmployees={handleSetEmployees} users={users} setUsers={handleSetUsers} />;
      case 'services': 
        return (
          <ServiceSection 
            services={services} 
            setServices={handleSetServices} 
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
        return <InventorySection parts={parts} setParts={handleSetParts} />;
      case 'expenses': 
        if (currentUser?.role !== 'admin') return null;
        return <ExpenseSection expenses={expenses} setExpenses={handleSetExpenses} />;
      case 'salaries': 
        if (currentUser?.role !== 'admin') return null;
        return <SalarySection employees={employees} services={services} workshopInfo={workshopInfo} />;
      case 'profile':
        return <ProfileSection user={currentUser!} setUsers={handleSetUsers} setCurrentUser={setCurrentUser} />;
      case 'settings':
        if (currentUser?.role !== 'admin') return null;
        return <SettingsSection workshopInfo={workshopInfo} setWorkshopInfo={handleSetWorkshopInfo} />;
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
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
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
                            { name: 'Mecânica',  value: services.filter(s => s.serviceType === 'mechanical').length },
                            { name: 'Elétrica',  value: services.filter(s => s.serviceType === 'electrical').length },
                            { name: 'Suspensão', value: services.filter(s => s.serviceType === 'suspension').length },
                            { name: 'Freios',    value: services.filter(s => s.serviceType === 'brakes').length },
                            { name: 'Outros',    value: services.filter(s => s.serviceType === 'other').length },
                          ]}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                        >
                          {['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6'].map((color, i) => (
                            <Cell key={i} fill={color} />
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
                              {s.serviceType === 'mechanical' ? 'Mecânica' : s.serviceType === 'electrical' ? 'Elétrica' : s.serviceType === 'suspension' ? 'Suspensão' : s.serviceType === 'brakes' ? 'Freios' : s.serviceType === 'engine' ? 'Motor' : 'Outros'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{customer?.name} • {customer?.plate}</p>
                        </div>
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          s.status === 'in_progress' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
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
                          <td className="px-4 py-3 text-sm">{new Date(s.entryDate).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            <div className="flex flex-col">
                              <span>{customer?.name}</span>
                              <span className="text-[10px] text-slate-400">{customer?.vehicle}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {s.serviceType === 'mechanical' ? 'Mecânica' : s.serviceType === 'electrical' ? 'Elétrica' : s.serviceType === 'suspension' ? 'Suspensão' : s.serviceType === 'brakes' ? 'Freios' : s.serviceType === 'engine' ? 'Motor' : 'Outros'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                              s.status === 'completed' ? "bg-emerald-50 text-emerald-700" : 
                              s.status === 'in_progress' ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600")}>
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

  // ── Layout principal ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-slate-50">
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
              { id: 'dashboard',  label: 'Dashboard',    icon: LayoutDashboard, roles: ['admin','receptionist','mechanic'] },
              { id: 'services',   label: 'Serviços',     icon: Wrench,          roles: ['admin','receptionist','mechanic'] },
              { id: 'customers',  label: 'Clientes',     icon: UserCircle,      roles: ['admin','receptionist'] },
              { id: 'employees',  label: 'Equipe',       icon: Users,           roles: ['admin'] },
              { id: 'inventory',  label: 'Estoque',      icon: Package,         roles: ['admin','receptionist'] },
              { id: 'expenses',   label: 'Contas',       icon: Zap,             roles: ['admin'] },
              { id: 'salaries',   label: 'Folha Pagto',  icon: Calendar,        roles: ['admin'] },
              { id: 'profile',    label: 'Meu Perfil',   icon: UserCircle,      roles: ['admin','receptionist','mechanic'] },
              { id: 'settings',   label: 'Configurações',icon: Settings,        roles: ['admin'] },
            ].filter(item => item.roles.includes(currentUser?.role || 'mechanic')).map(item => (
              <button key={item.id} onClick={() => setActiveSection(item.id as ActiveSection)}
                className={cn("flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left",
                  activeSection === item.id ? "bg-brand-50 text-brand-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}>
                <item.icon className="w-5 h-5" /> {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100">
          {!connected && (
            <div className="flex items-center gap-2 px-4 py-2 mb-3 text-xs text-amber-600 bg-amber-50 rounded-xl">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Reconectando...
            </div>
          )}
          <button onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-rose-600 font-medium transition-all w-full">
            <LogOut className="w-5 h-5" /> Sair
          </button>
        </div>
      </aside>

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
            <motion.div key={activeSection}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}>
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
