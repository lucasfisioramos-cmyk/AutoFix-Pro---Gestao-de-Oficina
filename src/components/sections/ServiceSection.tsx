import React from 'react';
import { Plus, Wrench, Calendar, User, DollarSign, CheckCircle2, Clock, CreditCard, Banknote, Timer } from 'lucide-react';
import { ServiceOrder, Customer, Employee, Part, PaymentMethod } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceSectionProps {
  services: ServiceOrder[];
  setServices: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  customers: Customer[];
  employees: Employee[];
  parts: Part[];
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

export const ServiceSection: React.FC<ServiceSectionProps> = ({ services, setServices, customers, employees, parts }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Ordens de Serviço</h2>
          <p className="text-slate-500">Acompanhe e registre todos os serviços realizados.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all">
          <Plus className="w-5 h-5" /> Nova O.S.
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {services.map(s => {
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
                  <button className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">Detalhes</button>
                  <button className="px-3 py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-all">Editar</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
