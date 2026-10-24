import type { BaseContract } from "ethers";

export function getSelectors(
  contract: BaseContract
): string[] {
  const selectors: string[] = [];

  contract.interface.forEachFunction((func) => {
    selectors.push(func.selector);
  });

  return selectors;
}