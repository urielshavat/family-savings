import React from 'react';
import { SimulationResult, SimulationMonth } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowDownCircle } from 'lucide-react';

interface ResultsSectionProps {
  simulation: SimulationResult | null;
}

const formatCurrency = (val: number) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

export const ResultsSection: React.FC<ResultsSectionProps> = ({ simulation }) => {
  if (!simulation) return null;

  const data = simulation.schedule;
  const initialDeposit = data.length > 0 ? data[0].deposit : 0;
  
  // Find withdrawals for the table
  const withdrawals = data.filter(d => d.withdrawalGross);

  // Check if deposit changes
  const isVariableDeposit = data.some(d => d.deposit !== initialDeposit);

  return (
    <div className="space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">הפקדה חודשית התחלתית</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(initialDeposit)}</div>
                <div className="text-xs text-gray-400 mt-1">
                    {isVariableDeposit ? 'תרד לאחר אירועים' : 'קבועה לכל התקופות'}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">יתרה סופית</div>
                <div className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(simulation.finalBalance)}</div>
                <div className="text-xs text-gray-400 mt-1">לאחר כל המשיכות</div>
            </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[400px]">
             <h3 className="text-lg font-bold text-gray-700 mb-4">התפתחות התיק והפקדות</h3>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                        dataKey="date" 
                        interval={Math.floor(data.length / 6)} 
                        tick={{fontSize: 12, fill: '#9ca3af'}}
                        tickMargin={10}
                    />
                    <YAxis 
                        tickFormatter={(val) => `₪${(val/1000).toFixed(0)}k`} 
                        tick={{fontSize: 12, fill: '#9ca3af'}}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="balanceEnd" 
                        name="יתרה בתיק" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorBalance)" 
                        strokeWidth={2}
                    />
                    <Area 
                        type="stepAfter" 
                        dataKey="deposit" 
                        name="הפקדה חודשית" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorDeposit)" 
                        strokeWidth={2}
                    />
                    {withdrawals.map((w, i) => (
                        <ReferenceLine key={i} x={w.date} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: '📍', fill: 'red' }} />
                    ))}
                </AreaChart>
             </ResponsiveContainer>
        </div>

        {/* Breakdown Table */}
        {withdrawals.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <h3 className="text-lg font-bold text-gray-700 mb-4">פירוט תקופות, משיכות ואירועים</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right border-collapse">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="p-3 rounded-r-lg">אירוע</th>
                                <th className="p-3">תאריך</th>
                                <th className="p-3">סכום ברוטו</th>
                                <th className="p-3">רווח נומינלי</th>
                                <th className="p-3">רווח ריאלי</th>
                                <th className="p-3">מס ששולם</th>
                                <th className="p-3 rounded-l-lg">נטו ביד</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {withdrawals.map((item, idx) => {
                                // Find previous withdrawal or start of simulation to calculate period duration
                                const previousEventMonth = idx === 0 ? -1 : withdrawals[idx - 1].monthIndex;
                                const currentEventMonth = item.monthIndex;
                                const durationMonths = currentEventMonth - previousEventMonth;
                                
                                // Get deposit for this period (look at month before event, or event month itself if deposit happens first)
                                // In our simulation, deposit happens at start of month.
                                const periodDeposit = item.deposit; 
                                
                                return (
                                <React.Fragment key={idx}>
                                    {/* Summary Row */}
                                    <tr className="bg-blue-50/50">
                                        <td colSpan={7} className="p-3 text-xs text-blue-800 font-medium border-t border-blue-100">
                                            <div className="flex items-center gap-6">
                                                <span className="flex items-center gap-1">
                                                    <ArrowDownCircle className="w-3 h-3"/>
                                                    תקופת חיסכון: {durationMonths} חודשים
                                                </span>
                                                <span>
                                                    הפקדה חודשית: <b>{formatCurrency(periodDeposit)}</b>
                                                </span>
                                                <span>
                                                    צבירה לפני משיכה: <b>{formatCurrency(item.preWithdrawalBalance || 0)}</b>
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {/* Event Row */}
                                    <tr className="hover:bg-gray-50 transition">
                                        <td className="p-3 font-medium text-gray-800">{item.eventOccurred?.name}</td>
                                        <td className="p-3 text-gray-600">{item.date}</td>
                                        <td className="p-3 font-mono text-gray-700">{formatCurrency(item.withdrawalGross || 0)}</td>
                                        <td className="p-3 font-mono text-green-600 text-xs">{formatCurrency(item.nominalGain || 0)}</td>
                                        <td className="p-3 font-mono text-emerald-600 text-xs font-bold">{formatCurrency(item.realGain || 0)}</td>
                                        <td className="p-3 font-mono text-red-500 text-xs">-{formatCurrency(item.taxPaid || 0)}</td>
                                        <td className="p-3 font-mono font-bold text-gray-900">{formatCurrency(item.withdrawalNet || 0)}</td>
                                    </tr>
                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};