import { useEffect, useState } from "react";
import { Contract, JsonRpcProvider, ethers } from "ethers";

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const iface = new ethers.Interface(ERC20_ABI);
const TRANSFER_TOPIC = iface.getEvent("Transfer")?.topicHash ??
  ethers.id("Transfer(address,address,uint256)");

export type UsdtTransferDetails = {
  tokenAddress: string;
  symbol: string;
  decimals: number;
  amountFormatted: string;
  rawAmount: bigint;
  from: string;
  to: string;
  blockNumber?: number;
  chainId?: number;
  txHash: string;
};

export const useUsdtTransfer = (
  provider?: JsonRpcProvider,
  hash?: string,
) => {
  const [details, setDetails] = useState<UsdtTransferDetails>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!hash) {
      setDetails(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    if (!provider) {
      setError("未配置 RPC 服务，无法读取 USDT 转账");
      setDetails(undefined);
      return;
    }

    let cancelled = false;

    const fetchTransfer = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const [receipt, network] = await Promise.all([
          provider.getTransactionReceipt(hash),
          provider.getNetwork(),
        ]);

        if (cancelled) return;

        if (!receipt) {
          setError("未找到该交易收据，可能还未上链");
          return;
        }

        const log = receipt.logs.find((item) =>
          item.topics[0]?.toLowerCase() === TRANSFER_TOPIC.toLowerCase(),
        );

        if (!log) {
          setError("交易中没有检测到 USDT Transfer 事件");
          return;
        }

        const parsed = iface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        const tokenAddress = ethers.getAddress(log.address);
        const contract = new Contract(tokenAddress, ERC20_ABI, provider);

        const [symbol, decimals] = await Promise.all([
          contract.symbol().catch(() => "USDT"),
          contract.decimals().catch(() => 6),
        ]);

        const rawAmount = parsed?.args?.[2] as bigint;
        const formatted = ethers.formatUnits(rawAmount, decimals);

        setDetails({
          tokenAddress,
          symbol,
          decimals,
          amountFormatted: formatted,
          rawAmount,
          from: ethers.getAddress(parsed?.args?.[0] as string),
          to: ethers.getAddress(parsed?.args?.[1] as string),
          blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
          chainId: Number(network.chainId),
          txHash: hash,
        });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTransfer();

    return () => {
      cancelled = true;
    };
  }, [provider, hash]);

  return { details, loading, error };
};
