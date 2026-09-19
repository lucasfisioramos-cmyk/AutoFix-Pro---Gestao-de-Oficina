import React, { useState } from 'react';
import { Save, Building2, FileText, MapPin, Phone, Mail } from 'lucide-react';
import { WorkshopInfo } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsSectionProps {
  workshopInfo: WorkshopInfo;
  setWorkshopInfo: React.Dispatch<React.SetStateAction<WorkshopInfo>>;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ workshopInfo, setWorkshopInfo }) => {
  const [formData, setFormData] = useState<WorkshopInfo>(workshopInfo);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWorkshopInfo(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Configurações da Oficina</h2>
        <p className="text-slate-500">Gerencie as informações da sua empresa que aparecerão nos documentos e relatórios.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome da Oficina / Razão Social</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CNPJ</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={formData.cnpj}
                    onChange={e => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail de Contato</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Endereço Completo</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all transform hover:-translate-y-0.5"
              >
                <Save className="w-5 h-5" /> Salvar Configurações
              </button>

              <AnimatePresence>
                {isSaved && (
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-emerald-600 font-bold text-sm"
                  >
                    Configurações salvas com sucesso!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-brand-50 border-brand-100">
            <h3 className="font-bold text-brand-900 mb-2">Por que preencher?</h3>
            <p className="text-sm text-brand-700 leading-relaxed">
              As informações aqui cadastradas serão utilizadas automaticamente no cabeçalho das Ordens de Serviço (PDF) e nos Holerites dos funcionários.
            </p>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold text-slate-900 mb-4">Visualização Prévia</h3>
            <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm text-[10px] space-y-1">
              <p className="font-bold text-slate-900 uppercase">{formData.name || 'Nome da Oficina'}</p>
              <p className="text-slate-500">CNPJ: {formData.cnpj || '00.000.000/0001-00'}</p>
              <p className="text-slate-500">{formData.address || 'Endereço...'}</p>
              <p className="text-slate-500">{formData.phone || 'Telefone...'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
