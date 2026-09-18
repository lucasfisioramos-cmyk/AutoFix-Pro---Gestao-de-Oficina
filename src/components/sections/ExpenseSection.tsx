import React from 'react';
import { Plus, Zap, Home, Megaphone, MoreHorizontal, CheckCircle2, Circle } from 'lucide-react';
import { MonthlyExpense, CATEGORIES } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';

interface ExpenseSectionProps {
  expenses: MonthlyExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<MonthlyExpense[]>>;
}

export const ExpenseSection: React.FC<ExpenseSectionProps> = ({ expenses, setExpenses }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contas Mensais</h2>
          <p className="text-slate-500">Gerencie as despesas fixas e variáveis da oficina.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all">
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
    </div>
  );
};
