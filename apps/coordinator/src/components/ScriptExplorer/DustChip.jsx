import { useSelector } from "react-redux";
import { WasteMetrics } from "@caravan/health";
import { getWalletConfig } from "../../selectors/wallet";
import { Chip } from "@mui/material";

const DustChip = ({ amountSats, feeRate }) => {
  const walletConfig = useSelector(getWalletConfig);
  const wasteMetrics = new WasteMetrics();
  const scriptType = walletConfig.addressType;
  const config = {
    requiredSignerCount: walletConfig.quorum.requiredSigners,
    totalSignerCount: walletConfig.quorum.totalSigners,
  };
  const { lowerLimit, upperLimit } = wasteMetrics.calculateDustLimits(
    feeRate,
    scriptType,
    config,
  );
  let chipArgs = {
    color: "success",
    label: "economical",
  };

  if (amountSats <= lowerLimit) {
    chipArgs = {
      color: "error",
      label: "dust",
    };
  } else if (amountSats > lowerLimit && amountSats <= upperLimit) {
    chipArgs = {
      color: "warning",
      label: "warning",
    };
  }

  return <Chip {...chipArgs} />;
};

export default DustChip;
