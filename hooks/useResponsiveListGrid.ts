import { useWindowDimensions } from "react-native";
import { useState } from "react";

export function useResponsiveListGrid() {
  const { width } = useWindowDimensions();
  const [grid, setGrid] = useState(false);

  const showViewToggle = width >= 600;
  const columns = width >= 1200 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 0;

  return { grid, setGrid, columns, showViewToggle };
}