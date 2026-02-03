import React, { useMemo } from 'react';
import { SavingsEvent, FinancialParams } from '../types';
import { Plus, Trash2, CalendarCheck, Coins } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface EventsSectionProps {
  events: SavingsEvent[];
  params: FinancialParams;
  setEvents: (events: SavingsEvent[]) => void;
}

export const EventsSection: React.FC<EventsSectionProps> = ({ events, params, setEvents }) => {
  const startDateObj = useMemo(() => new Date(params.startDate), [params.startDate]);

  const calculateAdjustedAmount = (baseAmount: number, monthOffset: number) => {
    if (monthOffset <= 0) return baseAmount;
    const monthlyInflation = Math.pow(1 + params.annualInflation / 100, 1 / 12) - 1;
    return baseAmount * Math.pow(1 + monthlyInflation, monthOffset);
  };

  const handleAddDefaultEvent = () => {
    const lastOffset = events.length > 0 ? Math.max(...events.map(e => e.monthOffset)) : 0;
    const newOffset = lastOffset + 12;

    const newEvent: SavingsEvent = {
      id: uuidv4(),
      name: 'אירוע חדש',
      targetAmount: 10000,
      monthOffset: newOffset
    };

    setEvents([...events, newEvent]);
  };

  const handleUpdateEvent = (id: string, field: keyof SavingsEvent, value: any) => {
    const updatedEvents = events.map(e => {
        if (e.id !== id) return e;
        return { ...e, [field]: value };
    });
    setEvents(updatedEvents);
  };

  const handleDelete = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  // Generate Date Options (Next 40 years)
  const dateOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i <= 480; i++) {
        const d = new Date(startDateObj);
        d.setMonth(d.getMonth() + i);
        const mm = d.getMonth() + 1;
        const yyyy = d.getFullYear();
        
        let diffText = "";
        const years = Math.floor(i / 12);
        const months = i % 12;
        
        if (i === 0) {
            diffText = "החודש הזה";
        } else {
            const parts = [];
            if (years > 0) parts.push(`${years} שנים`);
            if (months > 0) parts.push(`${months} חודשים`);
            diffText = parts.join(" ו-");
        }
        
        options.push({
            value: i,
            label: `${mm}/${yyyy} (${diffText})`
        });
    }
    return options;
  }, [startDateObj]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-800">
            <CalendarCheck className="w-5 h-5" />
            אירועים עתידיים
        </h2>
        <button
            onClick={handleAddDefaultEvent}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm"
        >
            <Plus className="w-4 h-4" />
            הוסף אירוע
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {events.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                לא הוגדרו אירועים. לחץ על "הוסף אירוע" כדי להתחיל.
            </div>
        )}
        {events.sort((a,b) => a.monthOffset - b.monthOffset).map((event) => {
          const adjusted = calculateAdjustedAmount(event.targetAmount, event.monthOffset);

          return (
            <div key={event.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-4 bg-gray-50 border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition">
              
              <div className="lg:col-span-3 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">שם האירוע</label>
                <input
                    type="text"
                    value={event.name}
                    onChange={(e) => handleUpdateEvent(event.id, 'name', e.target.value)}
                    className="border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                />
              </div>

              <div className="lg:col-span-4 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">תאריך משיכה</label>
                <select 
                    value={event.monthOffset} 
                    onChange={e => handleUpdateEvent(event.id, 'monthOffset', Number(e.target.value))}
                    className="border border-gray-300 rounded-md p-2 text-sm w-full"
                >
                    {dateOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">סכום משיכה (נטו)</label>
                <div className="relative">
                    <input
                        type="number"
                        step="1000"
                        value={event.targetAmount}
                        onChange={(e) => handleUpdateEvent(event.id, 'targetAmount', Number(e.target.value))}
                        className="border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none w-full pl-8"
                    />
                    <span className="absolute left-2 top-2 text-gray-400 text-xs">₪</span>
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">סכום מתואם (משוער)</label>
                <div className="bg-white border border-gray-200 rounded-md p-2 text-sm text-center text-emerald-700 font-medium">
                    {adjusted.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
                </div>
              </div>

              <div className="lg:col-span-1 flex justify-end">
                 <button 
                    onClick={() => handleDelete(event.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                    title="מחק אירוע"
                 >
                    <Trash2 className="w-5 h-5" />
                 </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};