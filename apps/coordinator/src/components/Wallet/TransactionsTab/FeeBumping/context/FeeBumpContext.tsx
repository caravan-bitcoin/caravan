import React, { createContext, useContext, useReducer, ReactNode } from "react";
import {
  feeBumpingReducer,
  initialState,
  FeeBumpingState,
} from "./feeBumpReducer";
import { FeeBumpActionTypes } from "./feeBumpActions";

interface FeeBumpContextType {
  state: FeeBumpingState;
  dispatch: React.Dispatch<FeeBumpActionTypes>;
}

const FeeBumpContext = createContext<FeeBumpContextType | undefined>(undefined);

interface FeeBumpProviderProps {
  children: ReactNode;
}

export function FeeBumpProvider({ children }: FeeBumpProviderProps) {
  const [state, dispatch] = useReducer(feeBumpingReducer, initialState);

  return (
    <FeeBumpContext.Provider value={{ state, dispatch }}>
      {children}
    </FeeBumpContext.Provider>
  );
}

export function useFeeBumpContext() {
  const context = useContext(FeeBumpContext);
  if (context === undefined) {
    throw new Error("useFeeBumpContext must be used within a FeeBumpProvider");
  }
  return context;
}
