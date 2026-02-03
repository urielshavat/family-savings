export interface FinancialParams {
  startDate: string;
  annualReturn: number;
  annualInflation: number;
  capitalGainsTax: number;
  initialCapital: number;
}

export interface SavingsEvent {
  id: string;
  name: string;
  monthOffset: number; // Months from start date
  targetAmount: number; // Net amount in today's terms
}

export interface SimulationMonth {
  monthIndex: number;
  date: string;
  deposit: number;
  balanceStart: number;
  balanceEnd: number;
  costBasis: number;
  eventOccurred?: SavingsEvent;
  withdrawalGross?: number;
  withdrawalNet?: number;
  taxPaid?: number;
  preWithdrawalBalance?: number;
  realGain?: number;
  nominalGain?: number;
}

export interface SimulationResult {
  success: boolean;
  schedule: SimulationMonth[];
  finalBalance: number;
  totalDeposited: number;
  totalWithdrawnNet: number;
  totalTaxPaid: number;
}