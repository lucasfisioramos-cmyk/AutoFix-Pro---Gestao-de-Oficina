import React, { useState } from 'react';
import { Plus, Users, Percent, DollarSign, Briefcase, X, Save } from 'lucide-react';
import { Employee } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeSectionProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

export const EmployeeSection: React.FC<EmployeeSectionProps> = ({ employees, setEmployees }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);

  const handleStartEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditRate(emp.commissionRate);
  };

  const handleSave = (id: string) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, commissionRate: editRate } : e));
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Equipe</h2>
          <p className="text-slate-500">Gerencie funcionários, salários base e comissões.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all">
          <Plus className="w-5 h-5" /> Novo Funcionário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {employees.map(e => (
          <div key={e.id} className="glass-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{e.name}</h3>
                <p className="text-slate-500 flex items-center gap-1 text-sm">
                  <Briefcase className="w-3 h-3" /> {e.role}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Salário Base</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(e.baseSalary)}</p>
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
                      <button onClick={() => handleSave(e.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-slate-900">{e.commissionRate}%</p>
                      <button 
                        onClick={() => handleStartEdit(e)}
                        className="text-[10px] text-brand-600 font-bold hover:underline"
                      >
                        EDITAR
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <button className="w-full py-2 text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors">
                Ver Histórico de Serviços
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
