export interface Token<T = Record<string, never>> {
  id: number;
  regex: string;
  rawText: string;
  generalizedText: string;
  options: T;
}

export interface OptimizationEntry {
  ids: number[];
  regex: string;
  weight: number;
  count: number;
}

export interface RegexResult<T = Record<string, never>> {
  tokens: Token<T>[];
  optimizationTable: Record<string, OptimizationEntry>;
}