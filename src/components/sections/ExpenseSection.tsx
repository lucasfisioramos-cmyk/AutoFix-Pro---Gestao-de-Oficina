import React, { useState } from 'react';
import { Plus, Zap, Home, Megaphone, MoreHorizontal, CheckCircle2, Circle, X } from 'lucide-react';
import { MonthlyExpense, CATEGORIES } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ExpenseSectionProps {
  expenses: MonthlyExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<MonthlyExpense[]>>;
}

export const ExpenseSection: React.FC<ExpenseSectionProps> = ({ expenses, setExpenses }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<MonthlyExpense>>({
    description: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    category: 'utilities',
    isPaid: false
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    setExpenses(prev => [...prev, { ...newExpense, id } as MonthlyExpense]);
    setIsModalOpen(false);
    setNewExpense({
      description: '',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      category: 'utilities',
      isPaid: false
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contas Mensais</h2>
          <p className="text-slate-500">Gerencie as despesas fixas e variáveis da oficina.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all"
        >
          <Plus className="w-5 h-5" /> Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {expenses.map(e => {
          const category = CATEGORIES.find(c => c.id === e.category) || CATEGORIES[CATEGORIES.length - 1];
          return (
            <div key={e.id} className="glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <Zap className="w-5 h-5 text-slate-500" />
                  </div>
                  <button 
                    onClick={() => setExpenses(prev => prev.map(ex => ex.id === e.id ? { ...ex, isPaid: !ex.isPaid } : ex))}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                      e.isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    )}
                  >
                    {e.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                    {e.isPaid ? 'Pago' : 'Pendente'}
                  </button>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{e.description}</h3>
                <p className="text-xs text-slate-500 mb-4">Vencimento: {e.dueDate}</p>
              </div>
              
              <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(e.amount)}</p>
                </div>
                <span className="text-xs font-medium text-slate-400">{category.name}</span>
              </div>
            </div>
          );
        })}
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
                <h2 className="text-xl font-bold text-slate-900">Nova Conta</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
                  <input
                    required
                    type="text"
                    value={newExpense.description}
                    onChange={e => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valor</label>
                    <input
                      required
                      type="number"
                      value={newExpense.amount}
                      onChange={e => setNewExpense(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vencimento</label>
                    <input
                      required
                      type="date"
                      value={newExpense.dueDate}
                      onChange={e => setNewExpense(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
                  <select
                    value={newExpense.category}
                    onChange={e => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {CATEGORIES.filter(c => !['service', 'parts_sale', 'salary'].includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-all mt-4">
                  Cadastrar Conta
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
