import React from 'react';
import { Plus, Package, AlertTriangle, DollarSign, Layers } from 'lucide-react';
import { Part } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';

interface InventorySectionProps {
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ parts, setParts }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Estoque de Peças</h2>
          <p className="text-slate-500">Controle de peças, preços e níveis de estoque.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all">
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
    </div>
  );
};
