/**
 * Build smooth cubic-bezier path from (x1,y1) to (x2,y2)
 */
export const buildCurvePath = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  const dx = Math.abs(x2 - x1);
  const control = Math.max(dx * 0.25, 40);
  const c1x = x1 + (x2 > x1 ? control : -control);
  const c2x = x2 - (x2 > x1 ? control : -control);
  return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
};

/**
 * Format address for display (truncate middle)
 */
export const formatAddress = (address: string) => {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
};

/**
 * Format script type for display
 */
export const formatScriptType = (scriptType?: string) => {
  if (!scriptType) return "Unknown";
  return scriptType.toUpperCase().replace("_", "-");
};

/**
 * Get script type color based on type
 */
export const getScriptTypeColor = (
  scriptType?: string,
  theme?: any,
): string => {
  if (!theme) return "#9e9e9e"; // fallback grey

  switch (scriptType?.toLowerCase()) {
    case "p2wsh":
      return theme.palette.success.main;
    case "p2sh-p2wsh":
    case "p2sh_p2wsh":
      return theme.palette.info.main;
    case "p2sh":
      return theme.palette.warning.main;
    case "p2wpkh":
      return theme.palette.success.light;
    case "p2pkh":
      return theme.palette.warning.light;
    default:
      return theme.palette.grey[500];
  }
};

/**
 * Get status display info (label and color)
 */
export const getStatusDisplay = (
  status?: string,
  confirmations?: number,
  theme?: any,
) => {
  if (!theme) return { label: "Unknown", color: "#9e9e9e" }; // fallback

  switch (status) {
    case "draft":
      return { label: "Draft", color: theme.palette.grey[500] };
    case "partial":
      return { label: "Partially Signed", color: theme.palette.info.main };
    case "ready":
      return {
        label: "Ready to Broadcast",
        color: theme.palette.primary.main,
      };
    case "broadcast-pending":
      return { label: "Broadcast Pending", color: theme.palette.info.light };
    case "unconfirmed":
      return { label: "Unconfirmed", color: theme.palette.warning.main };
    case "confirmed":
      return {
        label: `Confirmed${confirmations ? ` (${confirmations})` : ""}`,
        color: theme.palette.success.main,
      };
    case "finalized":
      return { label: "Finalized", color: theme.palette.success.dark };
    case "rbf":
      return {
        label: "Replaced by Fee",
        color: theme.palette.secondary.main,
      };
    case "dropped":
      return { label: "Dropped", color: theme.palette.grey[400] };
    case "conflicted":
      return { label: "Conflicted", color: theme.palette.error.main };
    case "rejected":
      return { label: "Rejected", color: theme.palette.error.dark };
    default:
      return { label: "Unknown", color: theme.palette.grey[500] };
  }
};
