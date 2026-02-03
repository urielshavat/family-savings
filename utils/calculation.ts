import { FinancialParams, SavingsEvent, SimulationMonth, SimulationResult } from '../types';

// Helpers
const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('he-IL', { month: 'short', year: 'numeric' }).format(date);
};

// Calculate monthly rates from annual
const getMonthlyRate = (annualRate: number) => Math.pow(1 + annualRate / 100, 1 / 12) - 1;

/**
 * Simulates the savings plan for a given constant deposit over a specific period.
 * Returns the simulation log and whether it failed (balance < 0).
 */
const runSimulationPeriod = (
  startBalance: number,
  startCostBasis: number, // Adjusted for inflation (Real Cost Basis)
  startNominalCostBasis: number, // Not adjusted for inflation (Nominal Cost Basis)
  startDate: Date,
  startMonthIndex: number,
  durationMonths: number,
  monthlyDeposit: number,
  params: FinancialParams,
  eventsInPeriod: Map<number, SavingsEvent[]>
): { schedule: SimulationMonth[]; finalBalance: number; finalCostBasis: number; finalNominalCostBasis: number; failed: boolean } => {
  
  let balance = startBalance;
  let costBasis = startCostBasis;
  let nominalCostBasis = startNominalCostBasis;
  const schedule: SimulationMonth[] = [];
  let failed = false;

  const monthlyReturnRate = getMonthlyRate(params.annualReturn);
  const monthlyInflationRate = getMonthlyRate(params.annualInflation);
  const taxRate = params.capitalGainsTax / 100;

  for (let i = 0; i < durationMonths; i++) {
    const currentMonthIndex = startMonthIndex + i;
    const currentDate = addMonths(startDate, i);
    const balanceStart = balance;

    // 1. Add Deposit
    balance += monthlyDeposit;
    costBasis += monthlyDeposit;
    nominalCostBasis += monthlyDeposit;

    // 2. Apply Growth
    balance *= (1 + monthlyReturnRate);
    
    // 3. Apply Inflation to Real Cost Basis (Indexation)
    costBasis *= (1 + monthlyInflationRate);

    // 4. Handle Events (Withdrawals)
    const monthEvents = eventsInPeriod.get(currentMonthIndex);
    let monthWithdrawalGross = 0;
    let monthWithdrawalNet = 0;
    let monthTaxPaid = 0;
    let monthRealGain = 0;
    let monthNominalGain = 0;
    let preWithdrawalBalance = 0;
    let eventRef: SavingsEvent | undefined = undefined;

    if (monthEvents) {
      preWithdrawalBalance = balance;
      for (const event of monthEvents) {
        eventRef = event; // Keep ref for display (assuming 1 event per month for simplicity in chart, though logic supports multiple)
        
        // Calculate Target Net in Nominal Terms (Adjusted for inflation from T=0)
        // Note: Inflation is cumulative from the very start of the simulation, not just this period.
        const totalMonthsPassed = currentMonthIndex;
        const inflationFactor = Math.pow(1 + monthlyInflationRate, totalMonthsPassed);
        const targetNetNominal = event.targetAmount * inflationFactor;

        // Calculate Gross Withdrawal needed to get TargetNetNominal after Real Tax
        
        let grossNeeded = 0;
        let tax = 0;
        let realGain = 0;
        let nominalGain = 0;

        const realProfitRatio = balance > 0 ? Math.max(0, 1 - (costBasis / balance)) : 0;
        const nominalProfitRatio = balance > 0 ? Math.max(0, 1 - (nominalCostBasis / balance)) : 0;
        
        const effectiveTaxRate = realProfitRatio * taxRate;
        
        // Net = Gross * (1 - effectiveTaxRate)
        // Gross = Net / (1 - effectiveTaxRate)
        grossNeeded = targetNetNominal / (1 - effectiveTaxRate);

        // Sanity check for precision issues
        if (balance <= 0 && grossNeeded > 0) {
            failed = true;
        }

        tax = grossNeeded - targetNetNominal;
        realGain = grossNeeded * realProfitRatio;
        nominalGain = grossNeeded * nominalProfitRatio;
        
        balance -= grossNeeded;
        
        // Reduce cost basis proportionally to the withdrawal
        if (balance + grossNeeded > 0) {
            const withdrawalRatio = grossNeeded / (balance + grossNeeded);
            costBasis = costBasis * (1 - withdrawalRatio);
            nominalCostBasis = nominalCostBasis * (1 - withdrawalRatio);
        } else {
            costBasis = 0;
            nominalCostBasis = 0;
        }

        monthWithdrawalGross += grossNeeded;
        monthWithdrawalNet += targetNetNominal;
        monthTaxPaid += tax;
        monthRealGain += realGain;
        monthNominalGain += nominalGain;
      }
    }

    schedule.push({
      monthIndex: currentMonthIndex,
      date: formatDate(currentDate),
      deposit: monthlyDeposit,
      balanceStart: balanceStart,
      balanceEnd: balance,
      costBasis: costBasis,
      eventOccurred: eventRef,
      withdrawalGross: monthWithdrawalGross > 0 ? monthWithdrawalGross : undefined,
      withdrawalNet: monthWithdrawalNet > 0 ? monthWithdrawalNet : undefined,
      taxPaid: monthTaxPaid > 0 ? monthTaxPaid : undefined,
      preWithdrawalBalance: monthWithdrawalGross > 0 ? preWithdrawalBalance : undefined,
      realGain: monthWithdrawalGross > 0 ? monthRealGain : undefined,
      nominalGain: monthWithdrawalGross > 0 ? monthNominalGain : undefined
    });

    if (balance < -1) { // Tolerance for floating point
      failed = true;
    }
  }

  return { schedule, finalBalance: balance, finalCostBasis: costBasis, finalNominalCostBasis: nominalCostBasis, failed };
};


/**
 * Solves the maximum required monthly deposit to satisfy all future events
 * given a starting state.
 */
const solveRequiredDeposit = (
  startBalance: number,
  startCostBasis: number,
  startNominalCostBasis: number,
  startDate: Date,
  startMonthIndex: number,
  events: SavingsEvent[],
  params: FinancialParams
): number => {
    
  if (events.length === 0) return 0;

  const maxDepositCap = 1000000; 
  let low = 0;
  let high = maxDepositCap;
  let result = high;

  // Binary search
  for (let i = 0; i < 20; i++) { 
    const mid = (low + high) / 2;
    
    const lastEventMonth = Math.max(...events.map(e => e.monthOffset));
    const duration = lastEventMonth - startMonthIndex + 1;
    
    const periodEvents = new Map<number, SavingsEvent[]>();
    events.forEach(e => {
        if (!periodEvents.has(e.monthOffset)) periodEvents.set(e.monthOffset, []);
        periodEvents.get(e.monthOffset)?.push(e);
    });

    const sim = runSimulationPeriod(
        startBalance, 
        startCostBasis, 
        startNominalCostBasis,
        startDate, 
        startMonthIndex, 
        duration, 
        mid, 
        params, 
        periodEvents
    );

    if (sim.failed) {
        low = mid;
    } else {
        result = mid;
        high = mid;
    }
  }

  // Round up to nearest 10
  return Math.ceil(result / 10) * 10;
};

export const calculateSavingsPlan = (params: FinancialParams, events: SavingsEvent[]): SimulationResult => {
  const sortedEvents = [...events].sort((a, b) => a.monthOffset - b.monthOffset);
  const startDate = new Date(params.startDate);
  
  if (sortedEvents.length === 0) {
      // Just project growth if no events
      return {
          success: true,
          schedule: [],
          finalBalance: params.initialCapital,
          totalDeposited: 0,
          totalTaxPaid: 0,
          totalWithdrawnNet: 0
      };
  }

  const fullSchedule: SimulationMonth[] = [];
  
  let currentBalance = params.initialCapital;
  let currentCostBasis = params.initialCapital;
  let currentNominalCostBasis = params.initialCapital;
  let currentMonth = 0;
  let maxDepositConstraint = Infinity; // Deposit can never be higher than this
  
  const eventsByMonth = new Map<number, SavingsEvent[]>();
  sortedEvents.forEach(e => {
      if (!eventsByMonth.has(e.monthOffset)) eventsByMonth.set(e.monthOffset, []);
      eventsByMonth.get(e.monthOffset)?.push(e);
  });
  
  const eventMonths = Array.from(eventsByMonth.keys()).sort((a, b) => a - b);

  for (const nextEventMonth of eventMonths) {
      // 1. Solve for required deposit looking ahead at ALL remaining events
      // Filter events that haven't happened yet (or are happening now)
      const remainingEvents = sortedEvents.filter(e => e.monthOffset >= currentMonth);
      
      const requiredDeposit = solveRequiredDeposit(
          currentBalance,
          currentCostBasis,
          currentNominalCostBasis,
          addMonths(startDate, currentMonth),
          currentMonth,
          remainingEvents,
          params
      );

      // 2. Apply "Never Upwards" constraint
      let actualDeposit = requiredDeposit;
      if (maxDepositConstraint !== Infinity) {
          if (actualDeposit > maxDepositConstraint) {
             actualDeposit = maxDepositConstraint; 
          }
      }
      maxDepositConstraint = actualDeposit;

      // 3. Simulate until this event month (inclusive of the event month itself)
      const duration = nextEventMonth - currentMonth + 1;
      
      const segmentEvents = new Map<number, SavingsEvent[]>();
      segmentEvents.set(nextEventMonth, eventsByMonth.get(nextEventMonth) || []);

      const simSegment = runSimulationPeriod(
          currentBalance,
          currentCostBasis,
          currentNominalCostBasis,
          addMonths(startDate, currentMonth),
          currentMonth,
          duration,
          actualDeposit,
          params,
          segmentEvents
      );

      fullSchedule.push(...simSegment.schedule);
      currentBalance = simSegment.finalBalance;
      currentCostBasis = simSegment.finalCostBasis;
      currentNominalCostBasis = simSegment.finalNominalCostBasis;
      currentMonth = nextEventMonth + 1; // Prepare for next segment starting next month
  }

  // Calculate totals
  const totalDeposited = fullSchedule.reduce((acc, m) => acc + m.deposit, 0);
  const totalWithdrawnNet = fullSchedule.reduce((acc, m) => acc + (m.withdrawalNet || 0), 0);
  const totalTaxPaid = fullSchedule.reduce((acc, m) => acc + (m.taxPaid || 0), 0);
  const failed = fullSchedule.some(m => m.balanceEnd < -1); // Check for negative balance

  return {
    success: !failed,
    schedule: fullSchedule,
    finalBalance: currentBalance,
    totalDeposited,
    totalWithdrawnNet,
    totalTaxPaid
  };
};