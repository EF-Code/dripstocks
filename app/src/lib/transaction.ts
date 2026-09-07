import { BaseError, ContractFunctionRevertedError } from "viem";

/** Keep raw call arguments (including claim secrets) out of visible errors. */
export function describeTransactionError(error: unknown): string {
  if (error instanceof BaseError) {
    const reverted = error.walk((cause) => cause instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      return reverted.data?.errorName
        ? `Transaction reverted: ${reverted.data.errorName}.`
        : "Transaction reverted. Check the stream, balance and approval, then retry.";
    }
    const rejected = error.walk((cause) => typeof cause === "object" && cause !== null && "code" in cause && cause.code === 4001);
    if (rejected && "code" in rejected && rejected.code === 4001) return "Request declined in your wallet.";
  }
  return "Transaction failed. Check your wallet network and connection, then retry.";
}
