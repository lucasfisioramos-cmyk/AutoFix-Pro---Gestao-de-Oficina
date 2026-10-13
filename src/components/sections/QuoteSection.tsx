import React, { useState } from 'react';
import { ClipboardList, Clock3, Pencil, Plus, Search, Trash2, Wrench, X } from 'lucide-react';
import { Customer, Quote, ServiceType, User } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface QuoteSectionProps {
  quotes: Quote[];
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  customers: Customer[];
  currentUser: User;
  onConvertQuote: (quote: Quote) => void;
}

interface QuoteForm {
  customerId: string;
  serviceType: ServiceType;
  requiredParts: Quote['requiredParts'];
  laborValue: string;
  estimatedDuration: string;
  vehicleName: string;
  vehicleMake: string;
  vehicleYear: string;
  vehicleModel: string;
  vehicleEngine: string;
}

interface PartDraft {
  name: string;
  price: string;
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  mechanical: 'Mecânica',
  electrical: 'Elétrica',
  suspension: 'Suspensão',
  brakes: 'Freios',
  engine: 'Motor',
  other: 'Outros',
};

const emptyForm: QuoteForm = {
  customerId: '',
  serviceType: 'mechanical',
  requiredParts: [],
  laborValue: '',
  estimatedDuration: '',
  vehicleName: '',
  vehicleMake: '',
  vehicleYear: '',
  vehicleModel: '',
  vehicleEngine: '',
};

const makeId = () => Math.random().toString(36).slice(2, 11);

export const QuoteSection: React.FC<QuoteSectionProps> = ({
  quotes,
  setQuotes,
  customers,
  currentUser,
  onConvertQuote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [formData, setFormData] = useState<QuoteForm>(emptyForm);
  const [partDraft, setPartDraft] = useState<PartDraft>({ name: '', price: '' });

  const filteredQuotes = quotes.filter(quote => {
    const customer = customers.find(item => item.id === quote.customerId);
    const search = searchTerm.toLowerCase();
    return [
      quote.id,
      quote.vehicleName,
      quote.vehicleMake,
      quote.vehicleModel,
      customer?.name || '',
    ].some(value => value.toLowerCase().includes(search));
  });

  const openModal = (quote?: Quote) => {
    if (quote) {
      setEditingQuote(quote);
      setFormData({
        customerId: quote.customerId,
        serviceType: quote.serviceType,
        requiredParts: quote.requiredParts.map(part => ({ ...part })),
        laborValue: String(quote.laborValue),
        estimatedDuration: quote.estimatedDuration,
        vehicleName: quote.vehicleName,
        vehicleMake: quote.vehicleMake,
        vehicleYear: quote.vehicleYear,
        vehicleModel: quote.vehicleModel,
        vehicleEngine: quote.vehicleEngine,
      });
    } else {
      setEditingQuote(null);
      setFormData(emptyForm);
    }
    setPartDraft({ name: '', price: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingQuote(null);
    setFormData(emptyForm);
    setPartDraft({ name: '', price: '' });
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(item => item.id === customerId);
    setFormData(prev => ({
      ...prev,
      customerId,
      vehicleName: customer?.vehicle || '',
      vehicleMake: '',
      vehicleYear: '',
      vehicleModel: '',
      vehicleEngine: '',
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const laborValue = Number(formData.laborValue);
    if (!Number.isFinite(laborValue) || laborValue < 0) return;
    const partsValue = formData.requiredParts.reduce((sum, part) => sum + part.price, 0);

    const quoteData = {
      ...formData,
      laborValue,
      partsValue,
      createdByUserId: editingQuote?.createdByUserId || currentUser.id,
      createdAt: editingQuote?.createdAt || new Date().toISOString(),
    };

    if (editingQuote) {
      setQuotes(prev => prev.map(quote => quote.id === editingQuote.id ? { ...quote, ...quoteData } : quote));
    } else {
      setQuotes(prev => [...prev, { ...quoteData, id: makeId() }]);
    }
    closeModal();
  };

  const handleAddPart = () => {
    const price = Number(partDraft.price);
    const name = partDraft.name.trim();
    if (!name || !Number.isFinite(price) || price < 0) return;
    setFormData(prev => ({
      ...prev,
      requiredParts: [...prev.requiredParts, { name, price }],
    }));
    setPartDraft({ name: '', price: '' });
  };

  const handleRemovePart = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredParts: prev.requiredParts.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const partsTotal = formData.requiredParts.reduce((sum, part) => sum + part.price, 0);

  const handleDelete = (quote: Quote) => {
    if (window.confirm(`Deseja excluir o orçamento #${quote.id}?`)) {
      setQuotes(prev => prev.filter(item => item.id !== quote.id));
    }
  };

  const inputClass = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500';
  const labelClass = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Orçamentos</h2>
          <p className="text-slate-500">Crie e acompanhe os orçamentos dos clientes.</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={customers.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="w-5 h-5" /> Novo orçamento
        </button>
      </div>

      {customers.length === 0 && (
        <div className="glass-card p-4 text-sm text-amber-700 bg-amber-50/70">
          Cadastre um cliente antes de criar um orçamento.
        </div>
      )}

      <div className="glass-card p-4 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="search"
          placeholder="Buscar por orçamento, cliente ou veículo..."
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          className="bg-transparent border-none outline-none w-full text-slate-700"
        />
      </div>

      {filteredQuotes.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">Nenhum orçamento encontrado</p>
          <p className="text-sm text-slate-400 mt-1">
            {quotes.length ? 'Tente outro termo de busca.' : 'Crie o primeiro orçamento da oficina.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredQuotes.map(quote => {
            const customer = customers.find(item => item.id === quote.customerId);
            const total = quote.laborValue + quote.partsValue;
            return (
              <article key={quote.id} className="glass-card p-5 sm:p-6">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Orçamento #{quote.id}</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900 truncate">{customer?.name || 'Cliente removido'}</h3>
                    <p className="text-sm text-slate-500">
                      {quote.vehicleName} {quote.vehicleMake && `• ${quote.vehicleMake}`} {quote.vehicleYear && `• ${quote.vehicleYear}`}
                    </p>
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    <button
                      onClick={() => onConvertQuote(quote)}
                      title="Converter em ordem de serviço"
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>
                    <button onClick={() => openModal(quote)} title="Editar orçamento" className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(quote)} title="Excluir orçamento" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Tipo de serviço</p>
                    <p className="mt-1 font-semibold text-slate-700">{SERVICE_TYPE_LABELS[quote.serviceType]}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Previsão</p>
                    <p className="mt-1 font-semibold text-slate-700 flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" />{quote.estimatedDuration}</p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Criado em</p>
                    <p className="mt-1 font-semibold text-slate-700">{format(new Date(quote.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>

                <div className="mt-4 text-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Peças necessárias</p>
                  {quote.requiredParts.length ? (
                    <ul className="mt-2 space-y-1">
                      {quote.requiredParts.map((part, index) => (
                        <li key={`${part.name}-${index}`} className="flex justify-between gap-3 text-slate-600">
                          <span>{part.name}</span>
                          <span className="font-medium whitespace-nowrap">{formatCurrency(part.price)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-1 text-slate-400">Nenhuma peça adicionada.</p>}
                  <p className="mt-2 text-xs text-slate-400">
                    {quote.vehicleModel && `Modelo: ${quote.vehicleModel}`}
                    {quote.vehicleEngine && ` • Motor: ${quote.vehicleEngine}`}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-end justify-between gap-3">
                  <div className="flex gap-5 text-xs text-slate-500">
                    <span>Mão de obra <strong className="block mt-1 text-sm text-slate-700">{formatCurrency(quote.laborValue)}</strong></span>
                    <span>Peças <strong className="block mt-1 text-sm text-slate-700">{formatCurrency(quote.requiredParts.reduce((sum, part) => sum + part.price, 0))}</strong></span>
                  </div>
                  <p className="text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total <strong className="block mt-1 text-lg text-emerald-600">{formatCurrency(total)}</strong>
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto glass-card p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{editingQuote ? 'Editar orçamento' : 'Novo orçamento'}</h2>
                  <p className="text-sm text-slate-500 mt-1">Preencha os dados do serviço e do veículo.</p>
                </div>
                <button type="button" onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label>
                    <span className={labelClass}>Cliente</span>
                    <select required value={formData.customerId} onChange={event => handleCustomerChange(event.target.value)} className={inputClass}>
                      <option value="">Selecione um cliente</option>
                      {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>Tipo de serviço</span>
                    <select required value={formData.serviceType} onChange={event => setFormData(prev => ({ ...prev, serviceType: event.target.value as ServiceType }))} className={inputClass}>
                      {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                </div>

                <fieldset className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <legend className="px-2 text-sm font-bold text-slate-700">Dados do veículo</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {([
                      ['vehicleName', 'Nome do veículo'],
                      ['vehicleMake', 'Marca'],
                      ['vehicleYear', 'Ano'],
                      ['vehicleModel', 'Modelo'],
                      ['vehicleEngine', 'Motor'],
                    ] as const).map(([field, label]) => (
                      <label key={field}>
                        <span className={labelClass}>{label}</span>
                        <input
                          required
                          type="text"
                          value={formData[field]}
                          onChange={event => setFormData(prev => ({ ...prev, [field]: event.target.value }))}
                          className={inputClass}
                          placeholder={label}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <span className={labelClass}>Adicionar peça</span>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-2">
                    <input
                      type="text"
                      value={partDraft.name}
                      onChange={event => setPartDraft(prev => ({ ...prev, name: event.target.value }))}
                      className={inputClass}
                      placeholder="Nome da peça"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partDraft.price}
                      onChange={event => setPartDraft(prev => ({ ...prev, price: event.target.value }))}
                      className={inputClass}
                      placeholder="Preço (R$)"
                    />
                    <button
                      type="button"
                      onClick={handleAddPart}
                      disabled={!partDraft.name.trim() || partDraft.price === '' || !Number.isFinite(Number(partDraft.price)) || Number(partDraft.price) < 0}
                      className="px-4 py-2 bg-brand-50 text-brand-700 font-bold rounded-xl hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 inline mr-1" /> Adicionar
                    </button>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {formData.requiredParts.map((part, index) => (
                      <li key={`${part.name}-${index}`} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm text-slate-700">{part.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-700">{formatCurrency(part.price)}</span>
                          <button type="button" onClick={() => handleRemovePart(index)} aria-label={`Remover ${part.name}`} className="text-rose-500 hover:bg-rose-50 p-1 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex justify-between items-center px-3 py-2 bg-emerald-50 rounded-xl">
                    <span className="text-sm font-bold text-emerald-800">Total das peças</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(partsTotal)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label>
                    <span className={labelClass}>Mão de obra (R$)</span>
                    <input required min="0" step="0.01" type="number" value={formData.laborValue} onChange={event => setFormData(prev => ({ ...prev, laborValue: event.target.value }))} className={inputClass} />
                  </label>
                  <div>
                    <span className={labelClass}>Peças (R$)</span>
                    <div className={`${inputClass} bg-slate-100 text-slate-700 font-semibold`}>{formatCurrency(partsTotal)}</div>
                  </div>
                  <label>
                    <span className={labelClass}>Tempo previsto</span>
                    <input required type="text" value={formData.estimatedDuration} onChange={event => setFormData(prev => ({ ...prev, estimatedDuration: event.target.value }))} className={inputClass} placeholder="Ex.: 2 dias" />
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl">Cancelar</button>
                  <button type="submit" className="px-5 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700">
                    {editingQuote ? 'Salvar alterações' : 'Criar orçamento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
