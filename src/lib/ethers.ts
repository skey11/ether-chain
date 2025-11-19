import { BrowserProvider, JsonRpcProvider, ethers } from "ethers";
import type { Eip1193Provider } from "ethers";

const FALLBACK_RPC = "https://eth-mainnet.g.alchemy.com/v2/demo";
const rpcUrl =
  (import.meta.env.VITE_ALCHEMY_URL as string | undefined)?.trim() ||
  FALLBACK_RPC;

export const rpcProvider = new JsonRpcProvider(rpcUrl);

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
