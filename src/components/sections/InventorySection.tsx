import React, { useState } from 'react';
import { Plus, Package, AlertTriangle, DollarSign, Layers, X } from 'lucide-react';
import { Part } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface InventorySectionProps {
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ parts, setParts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPart, setNewPart] = useState({ name: '', price: 0, stock: 0 });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    setParts(prev => [...prev, { ...newPart, id }]);
    setNewPart({ name: '', price: 0, stock: 0 });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Estoque de Peças</h2>
          <p className="text-slate-500">Controle de peças, preços e níveis de estoque.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all"
        >
          <Plus className="w-5 h-5" /> Nova Peça
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Peça</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Preço Unitário</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Qtd. em Estoque</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {parts.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Package className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">{p.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-600">
                  {formatCurrency(p.price)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-bold",
                      p.stock < 10 ? "text-rose-600" : "text-slate-900"
                    )}>
                      {p.stock} un
                    </span>
                    {p.stock < 10 && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    p.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  )}>
                    {p.stock > 0 ? 'Em Estoque' : 'Esgotado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-xs font-bold text-brand-600 hover:underline">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                <h2 className="text-xl font-bold text-slate-900">Nova Peça</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome da Peça</label>
                  <input
                    required
                    type="text"
                    value={newPart.name}
                    onChange={e => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Preço Unitário</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={newPart.price}
                      onChange={e => setNewPart(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Qtd. Inicial</label>
                    <input
                      required
                      type="number"
                      value={newPart.stock}
                      onChange={e => setNewPart(prev => ({ ...prev, stock: Number(e.target.value) }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-all mt-4">
                  Cadastrar Peça
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
