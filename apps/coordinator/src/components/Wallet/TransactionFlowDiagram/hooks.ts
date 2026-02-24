import { useState, useLayoutEffect, useEffect, RefObject } from "react";
import { buildCurvePath } from "./utils";

/**
 * Calculate SVG paths for connecting lines
 */
export const useFlowPaths = (
  inputRefs: RefObject<(HTMLDivElement | null)[]>,
  recipientOutputRefs: RefObject<(HTMLDivElement | null)[]>,
  changeOutputRefs: RefObject<(HTMLDivElement | null)[]>,
  feeRef: RefObject<HTMLDivElement | null>,
  centerRef: RefObject<HTMLDivElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  inputsLength: number,
  outputsLength: number,
) => {
  const [inputPaths, setInputPaths] = useState<string[]>([]);
  const [outputPaths, setOutputPaths] = useState<string[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  const computePaths = () => {
    const svgEl = svgRef.current;
    const centerEl = centerRef.current;
    if (!svgEl || !centerEl) return;

    const containerRect = svgEl.getBoundingClientRect();
    const centerRect = centerEl.getBoundingClientRect();

    setSvgSize({ width: containerRect.width, height: containerRect.height });

    const centerLeftX = centerRect.left - containerRect.left;
    const centerRightX = centerRect.right - containerRect.left;
    const centerY = centerRect.top - containerRect.top + centerRect.height / 2;

    // Input paths
    const newInputPaths: string[] = [];
    inputRefs.current?.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x1 = r.right - containerRect.left;
      const y1 = r.top - containerRect.top + r.height / 2;
      newInputPaths.push(buildCurvePath(x1, y1, centerLeftX, centerY));
    });

    // Output paths
    const newOutputPaths: string[] = [];
    const allOutputs = [
      ...(recipientOutputRefs.current || []),
      ...(changeOutputRefs.current || []),
      feeRef.current || null,
    ];
    allOutputs.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x2 = r.left - containerRect.left;
      const y2 = r.top - containerRect.top + r.height / 2;
      newOutputPaths.push(buildCurvePath(centerRightX, centerY, x2, y2));
    });

    setInputPaths(newInputPaths);
    setOutputPaths(newOutputPaths);
  };

  useLayoutEffect(() => {
    computePaths();
  }, [inputsLength, outputsLength]);

  useEffect(() => {
    const onResize = () => computePaths();
    window.addEventListener("resize", onResize);
    const id = window.setTimeout(() => computePaths(), 0);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(id);
    };
  }, []);

  return { inputPaths, outputPaths, svgSize };
};
