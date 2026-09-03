export interface JewelOutput {
  abyss: Array<JewelRegex>;
  regular: Array<JewelRegex>;
}

export interface JewelRegex {
  regexAffix: string;
  isAbyss: boolean;
  isPrefix: boolean;
  mod: string;
  regex: string;
}

export type Jewel = JewelOutput;
