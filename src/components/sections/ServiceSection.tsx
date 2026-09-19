import React, { useState } from 'react';
import { Plus, Wrench, Calendar, User, DollarSign, CheckCircle2, Clock, CreditCard, Banknote, Timer, X, Trash2, FileText, Save, MessageSquare, ShieldCheck, Fuel, Gauge, AlertTriangle, Camera, Search, Send, Image as ImageIcon } from 'lucide-react';
import { ServiceOrder, Customer, Employee, Part, PaymentMethod, ServiceType, UserRole, WorkshopInfo, User as UserType, Checklist } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { format, differenceInHours, differenceInMinutes, addMonths, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

interface ServiceSectionProps {
  services: ServiceOrder[];
  setServices: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  customers: Customer[];
  employees: Employee[];
  parts: Part[];
  role: UserRole;
  currentUser: UserType;
  workshopInfo: WorkshopInfo;
}

const getPaymentLabel = (method?: PaymentMethod) => {
  switch (method) {
    case 'cash': return 'Dinheiro';
    case 'card_debit': return 'Débito';
    case 'card_credit': return 'Crédito';
    case 'pix': return 'PIX';
    default: return '-';
  }
};

const getPaymentIcon = (method?: PaymentMethod) => {
  switch (method) {
    case 'cash':
    case 'pix': return <Banknote className="w-3 h-3" />;
    case 'card_debit':
    case 'card_credit': return <CreditCard className="w-3 h-3" />;
    default: return null;
  }
};

const calculateDuration = (entry: string, exit?: string) => {
  if (!exit) return null;
  const start = new Date(entry);
  const end = new Date(exit);
  const hours = differenceInHours(end, start);
  const minutes = differenceInMinutes(end, start) % 60;
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const ServiceSection: React.FC<ServiceSectionProps> = ({ services, setServices, customers, employees, parts, role, currentUser, workshopInfo }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newOS, setNewOS] = useState<Partial<ServiceOrder>>({
    customerId: '',
    employeeId: '',
    serviceType: 'mechanical',
    description: '',
    laborValue: 0,
    parts: [],
    status: 'pending',
    paymentMethod: 'cash',
    installments: 1,
    checklist: {
      fuelLevel: 0,
      mileage: 0,
      scratches: '',
      valuables: ''
    },
    images: []
  });

  const filteredServices = services.filter(s => {
    const customer = customers.find(c => c.id === s.customerId);
    const search = searchTerm.toLowerCase();
    return (
      s.id.toLowerCase().includes(search) ||
      customer?.name.toLowerCase().includes(search) ||
      customer?.plate.toLowerCase().includes(search) ||
      customer?.vehicle.toLowerCase().includes(search)
    );
  });

  const handleStatusUpdate = (id: string, status: 'in_progress' | 'completed') => {
    setServices(prev => prev.map(s => {
      if (s.id === id) {
        const exitDate = status === 'completed' ? new Date().toISOString() : s.exitDate;
        const warrantyUntil = status === 'completed' ? addMonths(new Date(), 3).toISOString() : s.warrantyUntil;
        return { ...s, status, exitDate, warrantyUntil };
      }
      return s;
    }));
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, notes } : s));
  };

  const handleDownloadPDF = (s: ServiceOrder) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === s.customerId);
    const employee = employees.find(e => e.id === s.employeeId);
    const partsTotal = s.parts.reduce((sum, p) => sum + (p.priceAtTime * p.quantity), 0);
    const total = s.laborValue + partsTotal;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(workshopInfo.name, 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`CNPJ: ${workshopInfo.cnpj}`, 20, 32);
    doc.text(`${workshopInfo.address}`, 20, 37);
    doc.text(`Tel: ${workshopInfo.phone} | Email: ${workshopInfo.email}`, 20, 42);

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(20, 48, 190, 48);

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Ordem de Serviço', 20, 60);
    
    doc.setFontSize(10);
    doc.text(`O.S. #${s.id}`, 160, 60);
    
    doc.setFontSize(10);
    doc.text(`Data de Entrada: ${format(new Date(s.entryDate), 'dd/MM/yyyy HH:mm')}`, 20, 70);
    if (s.exitDate) doc.text(`Data de Saída: ${format(new Date(s.exitDate), 'dd/MM/yyyy HH:mm')}`, 20, 75);

    doc.setFontSize(12);
    doc.text('DADOS DO CLIENTE', 20, 90);
    doc.setFontSize(10);
    doc.text(`Nome: ${customer?.name}`, 20, 98);
    doc.text(`Veículo: ${customer?.vehicle}`, 20, 103);
    doc.text(`Placa: ${customer?.plate}`, 20, 108);

    doc.setFontSize(12);
    doc.text('DETALHES DO SERVIÇO', 20, 125);
    doc.setFontSize(10);
    doc.text(`Mecânico: ${employee?.name}`, 20, 133);
    doc.text(`Tipo: ${s.serviceType}`, 20, 138);
    doc.text(`Descrição: ${s.description}`, 20, 143);
    if (s.notes) {
      doc.text('Observações:', 20, 153);
      doc.setFontSize(9);
      doc.text(s.notes, 20, 158, { maxWidth: 170 });
    }

    doc.setFontSize(12);
    doc.text('VALORES E PAGAMENTO', 20, 185);
    doc.setFontSize(10);
    doc.text(`Mão de Obra: ${formatCurrency(s.laborValue)}`, 20, 193);
    doc.text(`Peças: ${formatCurrency(partsTotal)}`, 20, 198);
    
    doc.setFontSize(14);
    doc.text(`TOTAL: ${formatCurrency(total)}`, 20, 210);
    
    doc.setFontSize(10);
    doc.text(`Forma de Pagamento: ${getPaymentLabel(s.paymentMethod)}`, 20, 220);

    if (s.checklist) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('CHECKLIST DE ENTRADA', 20, 25);
      doc.setFontSize(10);
      doc.text(`Combustível: ${s.checklist.fuelLevel}%`, 20, 35);
      doc.text(`Quilometragem: ${s.checklist.mileage} km`, 20, 40);
      doc.text(`Avarias/Riscos: ${s.checklist.scratches || 'Nenhum'}`, 20, 45);
      doc.text(`Objetos de Valor: ${s.checklist.valuables || 'Nenhum'}`, 20, 50);
    }

    if (s.warrantyUntil) {
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text(`GARANTIA VÁLIDA ATÉ: ${format(new Date(s.warrantyUntil), 'dd/MM/yyyy')}`, 20, 70);
    }

    doc.save(`OS_${s.id}.pdf`);
  };

  const handleSendWhatsApp = (s: ServiceOrder) => {
    const customer = customers.find(c => c.id === s.customerId);
    if (!customer) return;
    
    const statusText = s.status === 'completed' ? 'está PRONTO' : 
                      s.status === 'in_progress' ? 'está EM ANDAMENTO' : 'foi RECEBIDO';
    
    const partsTotal = s.parts.reduce((sum, p) => sum + (p.priceAtTime * p.quantity), 0);
    const total = s.laborValue + partsTotal;

    const message = `Olá ${customer.name}! 👋\n\nInformamos que o serviço do seu veículo *${customer.vehicle}* (${customer.plate}) ${statusText}.\n\n*Resumo:* ${s.description}\n*Valor Total:* ${formatCurrency(total)}\n\nQualquer dúvida, estamos à disposição! 🛠️`;
    
    const encodedMessage = encodeURIComponent(message);
    const phone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setNewOS(prev => ({
          ...prev,
          images: [...(prev.images || []), base64String]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddPart = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;
    
    setNewOS(prev => ({
      ...prev,
      parts: [...(prev.parts || []), { partId, quantity: 1, priceAtTime: part.price }]
    }));
  };

  const handleRemovePart = (index: number) => {
    setNewOS(prev => ({
      ...prev,
      parts: (prev.parts || []).filter((_, i) => i !== index)
    }));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    const entryDate = new Date().toISOString();
    
    setServices(prev => [...prev, { 
      ...newOS, 
      id, 
      entryDate 
    } as ServiceOrder]);
    
    setIsModalOpen(false);
    setNewOS({
      customerId: '',
      employeeId: '',
      serviceType: 'mechanical',
      description: '',
      laborValue: 0,
      parts: [],
      status: 'pending',
      paymentMethod: 'cash',
      installments: 1,
      checklist: {
        fuelLevel: 0,
        mileage: 0,
        scratches: '',
        valuables: ''
      },
      images: []
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {role === 'mechanic' ? 'Histórico de Serviços' : 'Ordens de Serviço'}
          </h2>
          <p className="text-slate-500">
            {role === 'mechanic' 
              ? 'Visualize todos os serviços da oficina e atualize os seus.' 
              : 'Acompanhe e registre todos os serviços realizados.'}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por placa, cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {role !== 'mechanic' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all whitespace-nowrap"
            >
              <Plus className="w-5 h-5" /> Nova O.S.
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredServices.map(s => {
          const customer = customers.find(c => c.id === s.customerId);
          const employee = employees.find(e => e.id === s.employeeId);
          const partsTotal = s.parts.reduce((sum, p) => sum + (p.priceAtTime * p.quantity), 0);
          const total = s.laborValue + partsTotal;
          const duration = calculateDuration(s.entryDate, s.exitDate);

          return (
            <div key={s.id} className="glass-card p-6 hover:border-brand-200 transition-all group">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-[250px]">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    s.status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                    s.status === 'in_progress' ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"
                  )}>
                    {s.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">O.S. #{s.id}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded uppercase">
                          {s.serviceType === 'mechanical' ? 'Mecânica' : 
                           s.serviceType === 'electrical' ? 'Elétrica' : 
                           s.serviceType === 'suspension' ? 'Suspensão' : 
                           s.serviceType === 'brakes' ? 'Freios' : 
                           s.serviceType === 'engine' ? 'Motor' : 'Outros'}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400 font-medium">
                          Entrada: {format(new Date(s.entryDate), 'dd/MM/yy HH:mm')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{s.description}</h3>
                      <div className="flex flex-col gap-0.5">
                        {s.exitDate && (
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            Saída: {format(new Date(s.exitDate), 'dd/MM/yy HH:mm')}
                          </div>
                        )}
                        {duration && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Timer className="w-3 h-3" /> Permanência: {duration}
                          </div>
                        )}
                        {s.warrantyUntil && isAfter(new Date(s.warrantyUntil), new Date()) && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 w-fit px-1.5 py-0.5 rounded mt-1">
                            <ShieldCheck className="w-3 h-3" /> Garantia até {format(new Date(s.warrantyUntil), 'dd/MM/yy')}
                          </div>
                        )}
                      </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cliente</p>
                    <p className="text-sm font-bold text-slate-700">{customer?.name}</p>
                    <p className="text-[10px] text-slate-500">{customer?.vehicle} ({customer?.plate})</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pagamento</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">{getPaymentIcon(s.paymentMethod)}</span>
                      <p className="text-sm font-bold text-slate-700">
                        {getPaymentLabel(s.paymentMethod)}
                        {s.paymentMethod === 'card_credit' && s.installments && ` (${s.installments}x)`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mecânico</p>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <p className="text-sm font-bold text-slate-700">{employee?.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
                    <p className="text-sm font-bold text-brand-600">{formatCurrency(total)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {role === 'mechanic' ? (
                    <>
                      {s.employeeId === currentUser.employeeId ? (
                        <>
                          {s.status === 'pending' && (
                            <button 
                              onClick={() => handleStatusUpdate(s.id, 'in_progress')}
                              className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all"
                            >
                              Iniciar Serviço
                            </button>
                          )}
                          {s.status === 'in_progress' && (
                            <button 
                              onClick={() => handleStatusUpdate(s.id, 'completed')}
                              className="px-4 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-all"
                            >
                              Concluir Serviço
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase italic">Visualização</span>
                      )}
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleDownloadPDF(s)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        <FileText className="w-4 h-4" /> PDF
                      </button>
                      <button 
                        onClick={() => handleSendWhatsApp(s)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Send className="w-4 h-4" /> WhatsApp
                      </button>
                      <button className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">Detalhes</button>
                      <button className="px-3 py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-all">Editar</button>
                    </>
                  )}
                </div>
              </div>

              {/* Checklist & Photos Display */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vistoria de Entrada</h4>
                  </div>
                  {s.checklist ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                          <Fuel className="w-3 h-3" /> Combustível
                        </div>
                        <div className="text-xs font-bold text-slate-700">{s.checklist.fuelLevel}%</div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                          <Gauge className="w-3 h-3" /> KM
                        </div>
                        <div className="text-xs font-bold text-slate-700">{s.checklist.mileage.toLocaleString()} km</div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg col-span-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                          <AlertTriangle className="w-3 h-3" /> Avarias/Riscos
                        </div>
                        <div className="text-xs text-slate-600">{s.checklist.scratches || 'Nenhum registro'}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum checklist realizado.</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4 text-brand-600" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fotos da Execução</h4>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {s.images && s.images.length > 0 ? (
                      s.images.map((img, i) => (
                        <img 
                          key={i} 
                          src={img} 
                          alt={`Serviço ${i}`} 
                          className="w-16 h-16 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ))
                    ) : (
                      <div className="w-full aspect-video bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                        Nenhuma foto anexada
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mechanic Notes Section */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-brand-600" />
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações do Mecânico</h4>
                </div>
                {role === 'mechanic' && s.employeeId === currentUser.employeeId ? (
                  <div className="flex gap-2">
                    <textarea 
                      value={s.notes || ''}
                      onChange={(e) => handleUpdateNotes(s.id, e.target.value)}
                      placeholder="Descreva o estado do veículo e o que notou durante o serviço..."
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[80px]"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 italic">
                    {s.notes || 'Nenhuma observação registrada.'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl glass-card p-8 shadow-2xl my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Nova Ordem de Serviço</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente</label>
                    <select
                      required
                      value={newOS.customerId}
                      onChange={e => setNewOS(prev => ({ ...prev, customerId: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Selecione um cliente</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.vehicle})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mecânico Responsável</label>
                    <select
                      required
                      value={newOS.employeeId}
                      onChange={e => setNewOS(prev => ({ ...prev, employeeId: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Selecione um funcionário</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Serviço</label>
                    <select
                      required
                      value={newOS.serviceType}
                      onChange={e => setNewOS(prev => ({ ...prev, serviceType: e.target.value as ServiceType }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="mechanical">Mecânica</option>
                      <option value="electrical">Elétrica</option>
                      <option value="suspension">Suspensão</option>
                      <option value="brakes">Freios</option>
                      <option value="engine">Motor</option>
                      <option value="other">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valor da Mão de Obra</label>
                    <input
                      required
                      type="number"
                      value={newOS.laborValue}
                      onChange={e => setNewOS(prev => ({ ...prev, laborValue: Number(e.target.value) }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição do Problema/Serviço</label>
                  <textarea
                    required
                    rows={2}
                    value={newOS.description}
                    onChange={e => setNewOS(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Checklist de Entrada</label>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Combustível (%)</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={newOS.checklist?.fuelLevel}
                        onChange={e => setNewOS(prev => ({ ...prev, checklist: { ...prev.checklist!, fuelLevel: Number(e.target.value) } }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quilometragem</label>
                      <input 
                        type="number"
                        value={newOS.checklist?.mileage}
                        onChange={e => setNewOS(prev => ({ ...prev, checklist: { ...prev.checklist!, mileage: Number(e.target.value) } }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Avarias/Riscos</label>
                      <input 
                        type="text"
                        placeholder="Ex: Risco porta direita..."
                        value={newOS.checklist?.scratches}
                        onChange={e => setNewOS(prev => ({ ...prev, checklist: { ...prev.checklist!, scratches: e.target.value } }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Fotos do Veículo</label>
                    <div className="flex gap-2">
                      <label className="cursor-pointer text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg hover:bg-brand-100 transition-colors">
                        <Plus className="w-3 h-3 inline mr-1" /> Upload JPG/PNG
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden" 
                          onChange={handleFileUpload}
                        />
                      </label>
                      <button 
                        type="button"
                        onClick={() => setNewOS(prev => ({ ...prev, images: [...(prev.images || []), ''] }))}
                        className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        + Adicionar URL
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {newOS.images?.map((img, idx) => (
                      <div key={idx} className="relative group aspect-video bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                        {img ? (
                          <>
                            <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setNewOS(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== idx) }))}
                              className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                            <input 
                              type="text"
                              placeholder="Cole a URL aqui..."
                              className="w-full text-[10px] p-1 bg-white border border-slate-200 rounded outline-none"
                              onChange={e => {
                                const newImages = [...(newOS.images || [])];
                                newImages[idx] = e.target.value;
                                setNewOS(prev => ({ ...prev, images: newImages }));
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => setNewOS(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== idx) }))}
                              className="text-[10px] text-rose-500 font-bold"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {(!newOS.images || newOS.images.length === 0) && (
                      <div className="col-span-full py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs">Nenhuma foto adicionada</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Peças Utilizadas</label>
                    <select 
                      onChange={(e) => {
                        if (e.target.value) handleAddPart(e.target.value);
                        e.target.value = '';
                      }}
                      className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg outline-none"
                    >
                      <option value="">+ Adicionar Peça</option>
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    {newOS.parts?.map((p, idx) => {
                      const partInfo = parts.find(part => part.id === p.partId);
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-sm font-medium text-slate-700">{partInfo?.name}</span>
                          <div className="flex items-center gap-4">
                            <input 
                              type="number" 
                              min="1"
                              value={p.quantity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setNewOS(prev => ({
                                  ...prev,
                                  parts: prev.parts?.map((item, i) => i === idx ? { ...item, quantity: val } : item)
                                }));
                              }}
                              className="w-12 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-sm"
                            />
                            <span className="text-sm font-bold text-slate-600">{formatCurrency(p.priceAtTime * p.quantity)}</span>
                            <button type="button" onClick={() => handleRemovePart(idx)} className="text-rose-500 hover:bg-rose-50 p-1 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Forma de Pagamento</label>
                    <select
                      value={newOS.paymentMethod}
                      onChange={e => setNewOS(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="cash">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="card_debit">Cartão de Débito</option>
                      <option value="card_credit">Cartão de Crédito</option>
                    </select>
                  </div>
                  {newOS.paymentMethod === 'card_credit' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Parcelas</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={newOS.installments}
                        onChange={e => setNewOS(prev => ({ ...prev, installments: Number(e.target.value) }))}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-all">
                  Gerar Ordem de Serviço
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
