import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  TableCell,
  Tooltip,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Edit, Warning } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

const ActionCell = styled(TableCell)(() => ({
  whiteSpace: "nowrap",
}));

const ActionButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(0.5),
  textTransform: "none",
}));

const WarningDialog = ({
  open,
  onClose,
  onProceed,
  recommendedStrategy,
  chosenStrategy,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>
      <Warning color="warning" /> Warning: Not Recommended Strategy
    </DialogTitle>
    <DialogContent>
      <Typography>
        The recommended strategy for this transaction is {recommendedStrategy},
        but you've chosen {chosenStrategy}. Proceeding with {chosenStrategy} may
        not be optimal for this transaction.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="primary">
        Cancel
      </Button>
      <Button onClick={onProceed} color="secondary">
        Proceed Anyway
      </Button>
    </DialogActions>
  </Dialog>
);

WarningDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onProceed: PropTypes.func.isRequired,
  recommendedStrategy: PropTypes.string.isRequired,
  chosenStrategy: PropTypes.string.isRequired,
};

const TransactionActions = ({ tx, onRBF, onCPFP }) => {
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const handleAction = (action) => {
    if (getRecommendedStrategy() !== action) {
      setWarningOpen(true);
      setPendingAction(action);
    } else {
      executeAction(action);
    }
  };

  const executeAction = (action) => {
    if (action === "RBF") {
      onRBF(tx);
    } else if (action === "CPFP") {
      onCPFP(tx);
    }
  };

  const handleProceed = () => {
    setWarningOpen(false);
    executeAction(pendingAction);
  };

  const getRecommendedStrategy = () => {
    if (tx.analyzer.recommendedStrategy === "RBF" && tx.canRBF) {
      return "RBF";
    } else if (tx.canCPFP) {
      return "CPFP";
    }
    return "NONE";
  };

  const recommendedStrategy = getRecommendedStrategy();

  const renderActionButton = (strategy, isRecommended) => {
    const feeRate =
      strategy === "RBF" ? tx.analyzer.rbfFeeRate : tx.analyzer.cpfpFeeRate;
    return (
      <Tooltip
        title={`${strategy} (${parseFloat(feeRate).toFixed(2)} sat/vB)`}
        arrow
      >
        <ActionButton
          variant={isRecommended ? "contained" : "outlined"}
          color={isRecommended ? "primary" : "secondary"}
          size="small"
          onClick={() => handleAction(strategy)}
          startIcon={<Edit />}
        >
          {strategy}
        </ActionButton>
      </Tooltip>
    );
  };

  return (
    <ActionCell>
      {recommendedStrategy !== "NONE" ? (
        <>
          {renderActionButton(recommendedStrategy, true)}
          {recommendedStrategy === "RBF" &&
            tx.canCPFP &&
            renderActionButton("CPFP", false)}
          {recommendedStrategy === "CPFP" &&
            tx.canRBF &&
            renderActionButton("RBF", false)}
        </>
      ) : (
        <Typography variant="body2" color="textSecondary">
          No actions available
        </Typography>
      )}
      <WarningDialog
        open={warningOpen}
        onClose={() => setWarningOpen(false)}
        onProceed={handleProceed}
        recommendedStrategy={recommendedStrategy}
        chosenStrategy={pendingAction}
      />
    </ActionCell>
  );
};

TransactionActions.propTypes = {
  tx: PropTypes.shape({
    canRBF: PropTypes.bool.isRequired,
    canCPFP: PropTypes.bool.isRequired,
    analyzer: PropTypes.shape({
      rbfFeeRate: PropTypes.string.isRequired,
      cpfpFeeRate: PropTypes.string.isRequired,
      recommendedStrategy: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  onRBF: PropTypes.func.isRequired,
  onCPFP: PropTypes.func.isRequired,
};

export default TransactionActions;
