import { BrowserProvider, JsonRpcProvider, ethers } from "ethers";
import type { Eip1193Provider } from "ethers";

export type RpcSource = "alchemy" | "infura";

const DEFAULT_ALCHEMY_MAINNET = "https://eth-mainnet.g.alchemy.com/v2/demo";
const DEFAULT_ALCHEMY_SEPOLIA =
  "https://eth-sepolia.g.alchemy.com/v2/demo";
const DEFAULT_INFURA_MAINNET = "https://mainnet.infura.io/v3/84842078b09946638c03157f83405213";
const DEFAULT_INFURA_SEPOLIA =
  "https://sepolia.infura.io/v3/84842078b09946638c03157f83405213";

const resolveRpcUrl = (source: RpcSource, chainId?: number) => {
  const alchemyEnv = (import.meta.env.VITE_ALCHEMY_URL as string | undefined)?.trim();
  const infuraEnv = (import.meta.env.VITE_INFURA_URL as string | undefined)?.trim();
  const isSepolia = chainId === 11155111;

  if (source === "alchemy") {
    return (
      alchemyEnv ||
      (isSepolia ? DEFAULT_ALCHEMY_SEPOLIA : DEFAULT_ALCHEMY_MAINNET)
    );
  }

  return (
    infuraEnv ||
    alchemyEnv ||
    (isSepolia ? DEFAULT_INFURA_SEPOLIA : DEFAULT_INFURA_MAINNET)
  );
};

export const rpcUrlFor = (source: RpcSource, chainId?: number) =>
  resolveRpcUrl(source, chainId);

export const createRpcProvider = (source: RpcSource, chainId?: number) =>
  new JsonRpcProvider(resolveRpcUrl(source, chainId));

export const injectedProvider = () => {
  if (window.ethereum) {
    return new BrowserProvider(window.ethereum as Eip1193Provider);
  }

  throw new Error("未检测到浏览器钱包，请先安装 MetaMask 等扩展");
};

export const formatEth = (wei: bigint, decimals = 4) =>
  Number(ethers.formatEther(wei)).toFixed(decimals);

export const formatGwei = (wei: bigint, decimals = 2) =>
  Number(ethers.formatUnits(wei, "gwei")).toFixed(decimals);
