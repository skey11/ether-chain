import { useEffect, useState } from "react";
import type {
  JsonRpcProvider,
  TransactionReceipt,
  TransactionResponse,
} from "ethers";

export const useTransactionDetails = (
  provider?: JsonRpcProvider,
  hash?: string,
) => {
  const [transaction, setTransaction] = useState<TransactionResponse | null>();
  const [receipt, setReceipt] = useState<TransactionReceipt | null>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!hash) {
      setTransaction(undefined);
      setReceipt(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchTx = async () => {
      setLoading(true);
      setError(undefined);

      if (!provider) {
        setError("未配置 RPC 服务，无法查询交易");
        setLoading(false);
        return;
      }

      try {
        const [tx, txReceipt] = await Promise.all([
          provider.getTransaction(hash),
          provider.getTransactionReceipt(hash),
        ]);

        if (cancelled) return;

        if (!tx) {
          setTransaction(null);
          setReceipt(null);
          setError("未查询到该交易，请确认哈希是否正确或交易已广播");
          return;
        }

        setTransaction(tx);
        setReceipt(txReceipt);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTx();

    return () => {
      cancelled = true;
    };
  }, [provider, hash, refreshIndex]);

  const refresh = () => setRefreshIndex((idx) => idx + 1);

  return {
    transaction,
    receipt,
    loading,
    error,
    refresh,
  };
};
