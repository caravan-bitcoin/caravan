import { useState, useCallback, useEffect } from "react";

interface UseAddressInputProps {
  availableAddresses: string[];
  initialSelectionType?: "predefined" | "custom";
}

export const useAddressInput = ({
  availableAddresses,
  initialSelectionType = "predefined",
}: UseAddressInputProps) => {
  const [address, setAddress] = useState<string>("");
  const [selectionType, setSelectionType] = useState<"predefined" | "custom">(
    initialSelectionType,
  );

  // Initialize with first available address if using predefined
  useEffect(() => {
    if (
      availableAddresses.length > 0 &&
      !address &&
      selectionType === "predefined"
    ) {
      setAddress(availableAddresses[0]);
    }
  }, [availableAddresses, address, selectionType]);

  const handleSelectionTypeChange = useCallback(
    (type: "predefined" | "custom") => {
      setSelectionType(type);
      if (type === "custom") {
        setAddress("");
      } else if (availableAddresses.length > 0) {
        setAddress(availableAddresses[0]);
      }
    },
    [availableAddresses],
  );

  const handleAddressChange = useCallback((value: string) => {
    setAddress(value);
  }, []);

  return {
    address,
    selectionType,
    handleSelectionTypeChange,
    handleAddressChange,
  };
};
