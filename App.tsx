import React, { useState, useCallback, useRef } from 'react';
import { FinancialParams, SavingsEvent, SimulationResult } from './types';
import { InputSection } from './components/InputSection';
import { EventsSection } from './components/EventsSection';
import { ResultsSection } from './components/ResultsSection';
import { calculateSavingsPlan } from './utils/calculation';
import { Calculator, Download, Upload } from 'lucide-react';

const App: React.FC = () => {
  // Initial State
  const [params, setParams] = useState<FinancialParams>({
    startDate: new Date().toISOString().split('T')[0],
    annualReturn: 7.0,
    annualInflation: 2.0,
    capitalGainsTax: 25.0,
    initialCapital: 0,
  });

  const [events, setEvents] = useState<SavingsEvent[]>([]);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculate logic
  const handleCalculate = useCallback(() => {
    const result = calculateSavingsPlan(params, events);
    setSimulation(result);
  }, [params, events]);

  const handleExport = () => {
    const data = {
        params,
        events,
        version: 1
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `savings-plan-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const data = JSON.parse(content);
            if (data.params) setParams(data.params);
            if (data.events) setEvents(data.events);
            setSimulation(null); // Reset results
            
            // Clear input value to allow re-importing same file if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            alert('הנתונים נטענו בהצלחה');
        } catch (err) {
            console.error(err);
            alert('שגיאה בטעינת הקובץ');
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-gray-200 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
              <div className="bg-emerald-600 text-white p-2 rounded-lg">
                <Calculator size={32} />
              </div>
              מחשבון חיסכון משפחתי
            </h1>
            <p className="text-gray-500 mt-2 text-lg">תכנון חכם של אירועי חיים עתידיים</p>
          </div>
          
          <div className="flex gap-2">
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
                <Download className="w-4 h-4" />
                ייצוא נתונים
            </button>
            <button 
                onClick={handleImportClick}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
                <Upload className="w-4 h-4" />
                טעינת נתונים
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
            />
          </div>
        </header>

        {/* Main Content */}
        <main>
          <InputSection params={params} onChange={setParams} />
          
          <EventsSection 
            events={events} 
            params={params} 
            setEvents={setEvents} 
          />

          <div className="flex justify-center my-8">
            <button
              onClick={handleCalculate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg transform transition hover:-translate-y-1 active:scale-95 flex items-center gap-3"
            >
              <Calculator className="w-6 h-6" />
              בצע חישוב תוכנית
            </button>
          </div>

          <div className="transition-opacity duration-500 ease-in-out">
             {simulation && <ResultsSection simulation={simulation} />}
          </div>
        </main>

        <footer className="text-center text-gray-400 text-sm mt-12 py-6 border-t border-gray-200">
          © {new Date().getFullYear()} מחשבון פיננסי חכם. כל החישובים הם הערכה בלבד ואינם מהווים ייעוץ פיננסי.
        </footer>
      </div>
    </div>
  );
};

export default App;