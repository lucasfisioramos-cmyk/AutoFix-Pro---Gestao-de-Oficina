import React, { useState } from 'react';
import { Calendar, DollarSign, Users, ChevronRight, ChevronLeft, TrendingUp } from 'lucide-react';
import { Employee, ServiceOrder } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { format, startOfYear, eachMonthOfInterval, getMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SalarySectionProps {
  employees: Employee[];
  services: ServiceOrder[];
}

export const SalarySection: React.FC<SalarySectionProps> = ({ employees, services }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const months = eachMonthOfInterval({
    start: startOfYear(new Date(selectedYear, 0, 1)),
    end: new Date(selectedYear, 11, 31)
  });

  const calculateMonthlySalary = (employee: Employee, monthDate: Date) => {
    const isDecember = getMonth(monthDate) === 11;
    
    // Filter completed services for this employee in this month
    const monthServices = services.filter(s => {
      const serviceDate = new Date(s.entryDate);
      return s.employeeId === employee.id && 
             s.status === 'completed' && 
             isSameMonth(serviceDate, monthDate);
    });

    const commission = monthServices.reduce((sum, s) => sum + (s.laborValue * (employee.commissionRate / 100)), 0);
    
    let total = employee.baseSalary + commission;
    
    // Add 13th salary in December (simplified: same as base salary)
    if (isDecember) {
      total += employee.baseSalary;
    }

    return {
      base: employee.baseSalary,
      commission,
      thirteenth: isDecember ? employee.baseSalary : 0,
      total
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Folha de Pagamento</h2>
          <p className="text-slate-500">Controle anual de salários, comissões e 13º salário.</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1">
          <button onClick={() => setSelectedYear(prev => prev - 1)} className="p-2 hover:bg-slate-50 rounded-lg transition-all">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="px-4 font-bold text-slate-700">{selectedYear}</span>
          <button onClick={() => setSelectedYear(prev => prev + 1)} className="p-2 hover:bg-slate-50 rounded-lg transition-all">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {employees.map(emp => (
          <div key={emp.id} className="glass-card overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{emp.name}</h3>
                  <p className="text-xs text-slate-500">Comissão: {emp.commissionRate}% por serviço</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Anual Estimado</p>
                <p className="text-xl font-bold text-brand-600">
                  {formatCurrency(months.reduce((sum, m) => sum + calculateMonthlySalary(emp, m).total, 0))}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white">
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mês</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comissão</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">13º Salário</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {months.map(month => {
                    const salary = calculateMonthlySalary(emp, month);
                    const isDecember = getMonth(month) === 11;
                    return (
                      <tr key={month.toISOString()} className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        isDecember && "bg-brand-50/30"
                      )}>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {format(month, 'MMMM', { locale: ptBR })}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{formatCurrency(salary.base)}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            {formatCurrency(salary.commission)}
                            {salary.commission > 0 && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {salary.thirteenth > 0 ? formatCurrency(salary.thirteenth) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                          {formatCurrency(salary.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
