import React, { useState } from 'react';
import { Calendar, DollarSign, Users, ChevronRight, ChevronLeft, TrendingUp, FileText, Download } from 'lucide-react';
import { Employee, ServiceOrder, WorkshopInfo } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { format, startOfYear, eachMonthOfInterval, getMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';

interface SalarySectionProps {
  employees: Employee[];
  services: ServiceOrder[];
  workshopInfo: WorkshopInfo;
}

export const SalarySection: React.FC<SalarySectionProps> = ({ employees, services, workshopInfo }) => {
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

  const handleDownloadPayrollPDF = (emp: Employee, month: Date) => {
    const doc = new jsPDF();
    const salary = calculateMonthlySalary(emp, month);
    const monthName = format(month, 'MMMM yyyy', { locale: ptBR });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(workshopInfo.name, 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`CNPJ: ${workshopInfo.cnpj}`, 20, 32);
    doc.text(`${workshopInfo.address}`, 20, 37);

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(20, 45, 190, 45);

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Holerite / Recibo de Pagamento', 20, 60);
    
    doc.setFontSize(12);
    doc.text(`Funcionário: ${emp.name}`, 20, 75);
    doc.text(`Cargo: ${emp.role}`, 20, 85);
    doc.text(`Referência: ${monthName}`, 20, 95);

    doc.setFontSize(12);
    doc.text('--- Detalhamento ---', 20, 115);
    doc.setFontSize(10);
    doc.text(`Salário Base: ${formatCurrency(salary.base)}`, 20, 125);
    doc.text(`Comissões: ${formatCurrency(salary.commission)}`, 20, 135);
    if (salary.thirteenth > 0) doc.text(`13º Salário: ${formatCurrency(salary.thirteenth)}`, 20, 145);

    doc.setFontSize(14);
    doc.text(`VALOR LÍQUIDO A RECEBER: ${formatCurrency(salary.total)}`, 20, 165);

    doc.setFontSize(10);
    doc.text('__________________________', 20, 210);
    doc.text('Assinatura da Empresa', 20, 215);
    doc.text('__________________________', 120, 210);
    doc.text('Assinatura do Funcionário', 120, 215);

    doc.save(`Holerite_${emp.name}_${monthName}.pdf`);
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{emp.name}</h3>
                    {!emp.active && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase rounded tracking-wider">
                        Inativo
                      </span>
                    )}
                  </div>
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
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
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
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {formatCurrency(salary.total)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <button 
                            onClick={() => handleDownloadPayrollPDF(emp, month)}
                            className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                            title="Baixar Holerite"
                          >
                            <Download className="w-4 h-4" />
                          </button>
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
