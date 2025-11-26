import { useEffect, useState } from "react";
import type { JsonRpcProvider } from "ethers";

type FeeInfo = {
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
};

type NetworkInfo = {
  name: string;
  chainId: bigint;
};

export const useChainData = (provider?: JsonRpcProvider, address?: string) => {
  const [blockNumber, setBlockNumber] = useState<bigint>();
  const [balance, setBalance] = useState<bigint>();
  const [feeData, setFeeData] = useState<FeeInfo>({});
  const [network, setNetwork] = useState<NetworkInfo>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(undefined);

      if (!provider) {
        setError("未配置 RPC 服务，无法读取链上数据");
        setLoading(false);
        return;
      }

      try {
        const [latestBlock, providerFeeData, providerNetwork] = await Promise.all([
          provider.getBlockNumber(),
          provider.getFeeData(),
          provider.getNetwork(),
        ]);
        const fetchedBalance = address
          ? await provider.getBalance(address)
          : undefined;

        if (cancelled) return;

        setBlockNumber(BigInt(latestBlock));
        setFeeData({
          gasPrice: providerFeeData.gasPrice ?? undefined,
          maxFeePerGas: providerFeeData.maxFeePerGas ?? undefined,
          maxPriorityFeePerGas: providerFeeData.maxPriorityFeePerGas ?? undefined,
        });
        setNetwork({
          name: providerNetwork.name,
          chainId:
            typeof providerNetwork.chainId === "bigint"
              ? providerNetwork.chainId
              : BigInt(providerNetwork.chainId),
        });
        setBalance(fetchedBalance);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 20_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [provider, address, refreshIndex]);

  const refresh = () => setRefreshIndex((idx) => idx + 1);

  return {
    blockNumber,
    balance,
    feeData,
    network,
    loading,
    error,
    refresh,
  };
};
