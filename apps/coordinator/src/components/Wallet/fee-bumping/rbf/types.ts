import { ExtendedAnalyzer } from "components/types/fees";

export interface RBFDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newFeeRate: number) => void;
  createPsbt: (newFeeRate: number) => string;
  transaction: ExtendedAnalyzer | null;
  currentNetworkFeeRate: number;
  isGeneratingPSBT: boolean;
}

export interface TransactionTableProps {
  title: string;
  items: any[];
  isInputs: boolean;
  template: any;
}

export interface AdjustFeeRateSliderProps {
  newFeeRate: number;
  setNewFeeRate: (value: number) => void;
  currentFeeRate: number;
  currentNetworkFeeRate: number;
  handlePreviewTransaction: () => void;
}

export interface FeeComparisonBoxProps {
  currentFees: string;
  newFees: string;
  currentFeeRate: string;
  newFeeRate: number;
  additionalFees: string;
}
