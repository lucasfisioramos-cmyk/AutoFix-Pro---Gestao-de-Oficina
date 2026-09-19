import React, { useState } from 'react';
import { Plus, Users, Percent, DollarSign, Briefcase, X, Save, Edit2, ShieldAlert, ShieldCheck, Trash2, Lock, Mail } from 'lucide-react';
import { Employee, User } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeSectionProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

export const EmployeeSection: React.FC<EmployeeSectionProps> = ({ employees, setEmployees, users, setUsers }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('');
  const [editUserRole, setEditUserRole] = useState<'admin' | 'receptionist' | 'mechanic'>('mechanic');
  const [editRate, setEditRate] = useState<number>(0);
  const [editSalary, setEditSalary] = useState<number>(0);
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');
  const [editActive, setEditActive] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ 
    name: '', 
    role: '', 
    phone: '',
    baseSalary: 0, 
    commissionRate: 0,
    userRole: 'mechanic' as 'admin' | 'receptionist' | 'mechanic',
    email: '',
    password: ''
  });
  const [showInactive, setShowInactive] = useState(false);

  const filteredEmployees = employees.filter(e => showInactive ? !e.active : e.active);

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Update employee status
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, active: newStatus } : e));
    
    // Update linked user status
    setUsers(prev => prev.map(u => u.employeeId === id ? { ...u, active: newStatus } : u));
  };

  const handleStartEdit = (emp: Employee) => {
    const linkedUser = users.find(u => u.employeeId === emp.id);
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditRole(emp.role);
    setEditUserRole(linkedUser?.role || 'mechanic');
    setEditRate(emp.commissionRate);
    setEditSalary(emp.baseSalary);
    setEditPhone(emp.phone);
    setEditEmail(linkedUser?.email || '');
    setEditPassword(linkedUser?.password || '');
    setEditActive(emp.active);
  };

  const handleSave = (id: string) => {
    setEmployees(prev => prev.map(e => e.id === id ? { 
      ...e, 
      name: editName,
      role: editRole,
      commissionRate: editRate, 
      baseSalary: editSalary, 
      phone: editPhone,
      active: editActive 
    } : e));
    
    // Also update linked user
    setUsers(prev => prev.map(u => u.employeeId === id ? { 
      ...u, 
      name: editName,
      role: editUserRole,
      phone: editPhone,
      email: editEmail,
      password: editPassword || u.password,
      active: editActive,
    } : u));
    setEditingId(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const employeeId = Math.random().toString(36).substr(2, 9);
    const userId = Math.random().toString(36).substr(2, 9);
    
    // Create Employee
    const employeeData: Employee = {
      id: employeeId,
      name: newEmployee.name,
      role: newEmployee.role,
      phone: newEmployee.phone,
      baseSalary: newEmployee.baseSalary,
      commissionRate: newEmployee.commissionRate,
      active: true
    };
    
    // Create User (Access)
    const userData: User = {
      id: userId,
      name: newEmployee.name,
      email: newEmployee.email || `${newEmployee.name.toLowerCase().replace(/\s+/g, '.')}@groficina.com`,
      password: newEmployee.password || 'mecanico123',
      phone: newEmployee.phone,
      role: newEmployee.userRole,
      employeeId: employeeId,
      active: true
    };

    setEmployees(prev => [...prev, employeeData]);
    setUsers(prev => [...prev, userData]);
    
    setNewEmployee({ 
      name: '', 
      role: '', 
      phone: '',
      baseSalary: 0, 
      commissionRate: 0,
      userRole: 'mechanic',
      email: '',
      password: ''
    });
    setIsModalOpen(false);
    alert(`Acesso criado!\nEmail: ${userData.email}\nSenha: ${userData.password}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Equipe</h2>
          <p className="text-slate-500">Gerencie funcionários, salários base e comissões.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowInactive(!showInactive)}
            className={cn(
              "px-4 py-2 rounded-xl font-bold transition-all border",
              showInactive ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {showInactive ? 'Ver Ativos' : 'Ver Inativos'}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all"
          >
            <Plus className="w-5 h-5" /> Novo Funcionário
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEmployees.map(e => (
          <div key={e.id} className={cn("glass-card p-6 transition-all", !e.active && "opacity-75 grayscale-[0.5]")}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                  e.active ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-400"
                )}>
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {editingId === e.id ? (
                      <input 
                        type="text"
                        value={editName}
                        onChange={ev => setEditName(ev.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    ) : (
                      <h3 className="text-xl font-bold text-slate-900">{e.name}</h3>
                    )}
                    {!e.active && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase rounded tracking-wider">
                        Bloqueado
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 flex items-center gap-1 text-sm mt-1">
                    <Briefcase className="w-3 h-3" /> 
                    {editingId === e.id ? (
                      <input 
                        type="text"
                        value={editRole}
                        onChange={ev => setEditRole(ev.target.value)}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    ) : (
                      <span>{e.role}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {editingId !== e.id && (
                  <>
                    <button 
                      onClick={() => handleToggleStatus(e.id, e.active)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        e.active ? "text-amber-500 hover:bg-amber-50" : "text-emerald-500 hover:bg-emerald-50"
                      )}
                      title={e.active ? "Bloquear Acesso" : "Desbloquear Acesso"}
                    >
                      {e.active ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleStartEdit(e)}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Salário Base</p>
                {editingId === e.id ? (
                  <input 
                    type="number" 
                    value={editSalary}
                    onChange={ev => setEditSalary(Number(ev.target.value))}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                ) : (
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(e.baseSalary)}</p>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comissão</p>
                <div className="flex items-center gap-2">
                  {editingId === e.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={editRate}
                        onChange={ev => setEditRate(Number(ev.target.value))}
                        className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-slate-900">{e.commissionRate}%</p>
                  )}
                </div>
              </div>
            </div>

            {editingId === e.id && (
              <div className="mt-4 space-y-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700">Status da Conta</p>
                  <button 
                    type="button"
                    onClick={() => setEditActive(!editActive)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all",
                      editActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}
                  >
                    {editActive ? 'Ativo / Liberado' : 'Inativo / Bloqueado'}
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone / Celular</p>
                  <input 
                    type="text"
                    value={editPhone}
                    onChange={ev => setEditPhone(ev.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail de Acesso</p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email"
                      value={editEmail}
                      onChange={ev => setEditEmail(ev.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full pl-10 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alterar Senha</p>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      value={editPassword}
                      onChange={ev => setEditPassword(ev.target.value)}
                      placeholder="Nova senha"
                      className="w-full pl-10 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">* Deixe como está para manter a senha atual</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nível de Acesso</p>
                  <select
                    value={editUserRole}
                    onChange={ev => setEditUserRole(ev.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="mechanic">Mecânico (Limitado)</option>
                    <option value="receptionist">Recepcionista (Intermediário)</option>
                    <option value="admin">Administrador (Total)</option>
                  </select>
                </div>
              </div>
            )}
            
            {editingId === e.id && (
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => handleSave(e.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all"
                >
                  <Save className="w-4 h-4" /> Salvar Alterações
                </button>
                <button 
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300 transition-all"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100">
              <button className="w-full py-2 text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors">
                Ver Histórico de Serviços
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md glass-card p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Novo Funcionário</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo</label>
                    <input
                      required
                      type="text"
                      value={newEmployee.name}
                      onChange={e => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Telefone / Celular</label>
                    <input
                      required
                      type="text"
                      value={newEmployee.phone}
                      onChange={e => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cargo / Função</label>
                  <input
                    required
                    type="text"
                    value={newEmployee.role}
                    onChange={e => setNewEmployee(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Salário Base</label>
                    <input
                      required
                      type="number"
                      value={newEmployee.baseSalary}
                      onChange={e => setNewEmployee(prev => ({ ...prev, baseSalary: Number(e.target.value) }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Comissão (%)</label>
                    <input
                      required
                      type="number"
                      value={newEmployee.commissionRate}
                      onChange={e => setNewEmployee(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nível de Acesso ao Sistema</label>
                  <select
                    value={newEmployee.userRole}
                    onChange={e => setNewEmployee(prev => ({ ...prev, userRole: e.target.value as any }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="mechanic">Mecânico (Acesso limitado)</option>
                    <option value="receptionist">Recepcionista (Acesso intermediário)</option>
                    <option value="admin">Administrador (Acesso total)</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">E-mail de Acesso</label>
                    <input
                      required
                      type="email"
                      value={newEmployee.email}
                      onChange={e => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ex: joao@oficina.com"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Senha de Acesso</label>
                    <input
                      required
                      type="text"
                      value={newEmployee.password}
                      onChange={e => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-all mt-4">
                  Cadastrar Funcionário e Criar Acesso
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
