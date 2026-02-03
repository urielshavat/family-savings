import React from 'react';
import { FinancialParams } from '../types';
import { Settings, Percent, Calendar, DollarSign, Activity } from 'lucide-react';

interface InputSectionProps {
  params: FinancialParams;
  onChange: (params: FinancialParams) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ params, onChange }) => {
  const handleChange = (field: keyof FinancialParams, value: string | number) => {
    onChange({ ...params, [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-800">
        <Settings className="w-5 h-5" />
        הגדרות בסיס
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
            <Calendar className="w-4 h-4" /> תאריך התחלה
          </label>
          <input
            type="date"
            value={params.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
            <Activity className="w-4 h-4" /> תשואה שנתית (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={params.annualReturn}
            onChange={(e) => handleChange('annualReturn', parseFloat(e.target.value))}
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
            <Percent className="w-4 h-4" /> אינפלציה שנתית (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={params.annualInflation}
            onChange={(e) => handleChange('annualInflation', parseFloat(e.target.value))}
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
            <Percent className="w-4 h-4" /> מס רווחי הון (%)
          </label>
          <input
            type="number"
            step="1"
            value={params.capitalGainsTax}
            onChange={(e) => handleChange('capitalGainsTax', parseFloat(e.target.value))}
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
            <DollarSign className="w-4 h-4" /> הון עצמי התחלתי
          </label>
          <input
            type="number"
            step="1000"
            value={params.initialCapital}
            onChange={(e) => handleChange('initialCapital', parseFloat(e.target.value))}
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

      </div>
    </div>
  );
};