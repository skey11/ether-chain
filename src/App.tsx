import { JsonRpcProvider, ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import "./App.css";
import { useChainData } from "./hooks/useChainData";
import { useTransactionDetails } from "./hooks/useTransactionDetails";
import { useUsdtTransfer } from "./hooks/useUsdtTransfer";
import {
  createRpcProvider,
  formatEth,
  formatGwei,
  type RpcSource,
} from "./lib/ethers";

const shortenAddress = (value?: string) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "";

const DATA_LOGGER_ABI = [
  "function log(string memo, bytes32 dataId)",
  "event DataLogged(address indexed sender, string memo, bytes32 indexed dataId, uint256 timestamp)",
];

const txHashPattern = /^0x([a-fA-F0-9]{64})$/;

function App() {
  const chainId = useChainId();
  const [rpcSource, setRpcSource] = useState<RpcSource>("alchemy");
  const rpcProvider = useMemo<JsonRpcProvider>(
    () => createRpcProvider(rpcSource, chainId),
    [rpcSource, chainId],
  );

  const { address, isConnected } = useAccount();
  const { connect, connectors, error: wagmiError, isPending: connecting } =
    useConnect();
  const { disconnect } = useDisconnect();

  const [connectError, setConnectError] = useState<string>();
  const [addressInput, setAddressInput] = useState("");
  const [txHashInput, setTxHashInput] = useState("");
  const [usdtHashInput, setUsdtHashInput] = useState("");
  const [logMemo, setLogMemo] = useState("Hello from Sepolia testnet");
  const [logCustomId, setLogCustomId] = useState("");
  const loggerAddress =
    (import.meta.env.VITE_DATA_LOGGER_ADDRESS as string | undefined)?.trim();

  useEffect(() => {
    if (address) setAddressInput(address);
  }, [address]);

  const normalizedInput = addressInput.trim();
  const targetAddress = normalizedInput || address;
  const normalizedTxHash = txHashInput.trim();
  const activeTxHash = txHashPattern.test(normalizedTxHash)
    ? normalizedTxHash
    : undefined;
  const normalizedUsdtHash = usdtHashInput.trim();
  const activeUsdtHash = txHashPattern.test(normalizedUsdtHash)
    ? normalizedUsdtHash
    : undefined;

  const { blockNumber, balance, feeData, network, loading, error, refresh } =
    useChainData(rpcProvider, targetAddress);
  const {
    transaction,
    receipt,
    loading: txLoading,
    error: txError,
    refresh: refreshTx,
  } = useTransactionDetails(rpcProvider, activeTxHash);
  const {
    details: usdtDetails,
    loading: usdtLoading,
    error: usdtError,
  } = useUsdtTransfer(rpcProvider, activeUsdtHash);

  const { writeContract, data: logTxHash, isPending: logPending, error: logError } =
    useWriteContract();
  const { isLoading: logConfirming, isSuccess: logConfirmed } =
    useWaitForTransactionReceipt({ hash: logTxHash });

  const dataIdForCall = useMemo(() => {
    const manual = logCustomId.trim();
    if (manual && manual.startsWith("0x") && manual.length === 66) {
      return manual as `0x${string}`;
    }
    return ethers.id(manual || logMemo || "logger");
  }, [logCustomId, logMemo]);

  const formattedBalance = useMemo(() => {
    if (!balance) return "—";
    return `${formatEth(balance)} ETH`;
  }, [balance]);

  const txStatusLabel = receipt
    ? receipt.status === 1
      ? "Success"
      : "Failed"
    : transaction
    ? "Pending"
    : "—";

  const blockForTx =
    receipt?.blockNumber ?? transaction?.blockNumber ?? transaction?.blockNumber;
  const txValueDisplay = transaction?.value
    ? `${formatEth(transaction.value)} ETH`
    : "—";
  const gasUsed = receipt?.gasUsed;
  const gasPriceForTx =
    receipt?.gasPrice ??
    transaction?.gasPrice ??
    transaction?.maxFeePerGas ??
    undefined;
  const totalFeePaid =
    gasUsed && gasPriceForTx
      ? `${formatEth(gasUsed * gasPriceForTx)} ETH`
      : "—";

  const submitAddress = (event: FormEvent) => {
    event.preventDefault();
    refresh();
  };

  const submitTxHash = (event: FormEvent) => {
    event.preventDefault();
    if (!activeTxHash) return;
    refreshTx();
  };

  const submitUsdtHash = (event: FormEvent) => {
    event.preventDefault();
    // hook reacts to hash change
  };

  const handleConnect = () => {
    setConnectError(undefined);
    const connector = connectors[0];
    if (!connector) {
      setConnectError("未找到可用的浏览器钱包连接器");
      return;
    }
    connect({ connector });
  };

  const handleLogWrite = async (event: FormEvent) => {
    event.preventDefault();
    if (!loggerAddress) {
      setConnectError("请在 .env 设置 VITE_DATA_LOGGER_ADDRESS (测试网)");
      return;
    }
    try {
      await writeContract({
        address: loggerAddress as `0x${string}`,
        abi: DATA_LOGGER_ABI,
        functionName: "log",
        args: [logMemo, dataIdForCall],
      });
    } catch (err) {
      setConnectError((err as Error).message);
    }
  };

  return (
    <main className="app">
      <section className="panel">
        <header>
          <p className="eyebrow">Infura / Alchemy · wagmi</p>
          <h1>链上数据与交互面板</h1>
          <p className="lead">
            左侧数据源切换 Alchemy / Infura，使用 wagmi 连接钱包，支持读取区块、交易、USDT
            转账以及向测试网合约写入日志。
          </p>
        </header>

        <div className="actions">
          <div className="pill">
            <span className="label">数据源</span>
            <div className="segmented">
              {(["alchemy", "infura"] as RpcSource[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === rpcSource ? "active" : "ghost"}
                  onClick={() => setRpcSource(option)}
                >
                  {option === "alchemy" ? "Alchemy" : "Infura"}
                </button>
              ))}
            </div>
          </div>

          <div className="pill">
            <span className="label">钱包</span>
            <div className="segmented">
              <button
                type="button"
                onClick={() => (isConnected ? disconnect() : handleConnect())}
                disabled={connecting}
              >
                {isConnected
                  ? `断开 ${shortenAddress(address)}`
                  : connecting
                  ? "连接中…"
                  : "连接钱包 (wagmi)"}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="ghost"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "同步中…" : "刷新"}
          </button>
        </div>
        {(connectError || wagmiError) && (
          <p className="error">{connectError || wagmiError?.message}</p>
        )}

        <form className="field" onSubmit={submitAddress}>
          <label htmlFor="address">读取地址</label>
          <input
            id="address"
            spellCheck={false}
            placeholder="0x..."
            value={addressInput}
            onChange={(event) => setAddressInput(event.target.value)}
          />
          <button type="submit" className="ghost">
            读取
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {!error && loading && (
          <p className="muted">正在读取最新区块与余额数据…</p>
        )}

        <ul className="grid">
          <li>
            <span className="label">网络</span>
            <strong>
              {network
                ? `${network.name} (#${network.chainId.toString()})`
                : "—"}
            </strong>
            <small className="hint">当前 RPC：{rpcSource}</small>
          </li>
          <li>
            <span className="label">最新区块</span>
            <strong>{blockNumber ? blockNumber.toString() : "—"}</strong>
          </li>
          <li>
            <span className="label">Gas Price</span>
            <strong>
              {feeData.gasPrice ? `${formatGwei(feeData.gasPrice)} Gwei` : "—"}
            </strong>
          </li>
          <li>
            <span className="label">Max Fee</span>
            <strong>
              {feeData.maxFeePerGas
                ? `${formatGwei(feeData.maxFeePerGas)} Gwei`
                : "—"}
            </strong>
          </li>
          <li>
            <span className="label">Max Priority</span>
            <strong>
              {feeData.maxPriorityFeePerGas
                ? `${formatGwei(feeData.maxPriorityFeePerGas)} Gwei`
                : "—"}
            </strong>
          </li>
          <li>
            <span className="label">账户余额</span>
            <strong>{formattedBalance}</strong>
            <small className="hint">
              {targetAddress ? shortenAddress(targetAddress) : "未选择地址"}
            </small>
          </li>
        </ul>

        <div className="section">
          <h2>交易详情</h2>
          <p className="lead small">
            粘贴 0x 开头的 66 位交易哈希，可即时获取交易状态、区块信息与费用。
          </p>
          <form className="field block" onSubmit={submitTxHash}>
            <label htmlFor="txHash">交易哈希</label>
            <input
              id="txHash"
              spellCheck={false}
              placeholder="0x..."
              value={txHashInput}
              onChange={(event) => setTxHashInput(event.target.value)}
            />
            <button type="submit" className="ghost" disabled={!activeTxHash}>
              查询
            </button>
          </form>
          {txHashInput && !activeTxHash && (
            <p className="error">交易哈希格式需为 0x 开头的 66 个字符</p>
          )}
          {txError && <p className="error">{txError}</p>}
          {txLoading && <p className="muted">正在查询交易详情…</p>}
          {!txLoading && activeTxHash && !txError && transaction && (
            <ul className="tx-grid">
              <li>
                <span className="label">状态</span>
                <strong>{txStatusLabel}</strong>
              </li>
              <li>
                <span className="label">区块</span>
                <strong>{blockForTx ?? "—"}</strong>
              </li>
              <li>
                <span className="label">金额</span>
                <strong>{txValueDisplay}</strong>
              </li>
              <li>
                <span className="label">Gas Price</span>
                <strong>
                  {gasPriceForTx ? `${formatGwei(gasPriceForTx)} Gwei` : "—"}
                </strong>
              </li>
              <li>
                <span className="label">Gas Used</span>
                <strong>{gasUsed ? gasUsed.toString() : "—"}</strong>
              </li>
              <li>
                <span className="label">实际手续费</span>
                <strong>{totalFeePaid}</strong>
              </li>
              <li>
                <span className="label">From</span>
                <strong title={transaction.from ?? undefined} className="mono">
                  {transaction.from ? shortenAddress(transaction.from) : "—"}
                </strong>
              </li>
              <li>
                <span className="label">To</span>
                <strong title={transaction.to ?? undefined} className="mono">
                  {transaction.to ? shortenAddress(transaction.to) : "—"}
                </strong>
              </li>
            </ul>
          )}
        </div>

        <div className="section">
          <h2>USDT 转账回显</h2>
          <p className="lead small">
            通过转 U 的交易哈希，解析 USDT 合约地址、链 ID / 区块号与转账金额。
          </p>
          <form className="field block" onSubmit={submitUsdtHash}>
            <label htmlFor="usdtHash">USDT Tx Hash</label>
            <input
              id="usdtHash"
              spellCheck={false}
              placeholder="0x..."
              value={usdtHashInput}
              onChange={(event) => setUsdtHashInput(event.target.value)}
            />
            <button type="submit" className="ghost" disabled={!activeUsdtHash}>
              解析
            </button>
          </form>
          {usdtHashInput && !activeUsdtHash && (
            <p className="error">请输入有效的交易哈希</p>
          )}
          {usdtError && <p className="error">{usdtError}</p>}
          {usdtLoading && <p className="muted">正在读取 USDT 交易…</p>}
          {usdtDetails && !usdtError && (
            <ul className="tx-grid">
              <li>
                <span className="label">USDT 合约</span>
                <strong className="mono" title={usdtDetails.tokenAddress}>
                  {shortenAddress(usdtDetails.tokenAddress)}
                </strong>
              </li>
              <li>
                <span className="label">链 ID</span>
                <strong>{usdtDetails.chainId ?? "—"}</strong>
                <small className="hint">区块：{usdtDetails.blockNumber ?? "—"}</small>
              </li>
              <li>
                <span className="label">金额</span>
                <strong>
                  {usdtDetails.amountFormatted} {usdtDetails.symbol} (
                  {usdtDetails.decimals} dec)
                </strong>
              </li>
              <li>
                <span className="label">From</span>
                <strong className="mono" title={usdtDetails.from}>
                  {shortenAddress(usdtDetails.from)}
                </strong>
              </li>
              <li>
                <span className="label">To</span>
                <strong className="mono" title={usdtDetails.to}>
                  {shortenAddress(usdtDetails.to)}
                </strong>
              </li>
            </ul>
          )}
        </div>

        <div className="section">
          <h2>写入链上日志 (测试网)</h2>
          <p className="lead small">
            已提供 DataLogger.sol 合约，部署到测试链后在 .env 配置
            VITE_DATA_LOGGER_ADDRESS，连接钱包即可通过事件写入链上。
          </p>
          <form className="field block" onSubmit={handleLogWrite}>
            <label htmlFor="logMemo">日志内容</label>
            <input
              id="logMemo"
              spellCheck={false}
              value={logMemo}
              onChange={(event) => setLogMemo(event.target.value)}
            />
            <input
              spellCheck={false}
              placeholder="可选：自定义 bytes32 ID 或留空自动哈希"
              value={logCustomId}
              onChange={(event) => setLogCustomId(event.target.value)}
            />
            <button type="submit" disabled={logPending || logConfirming}>
              {logPending ? "发送中…" : logConfirming ? "确认中…" : "写入日志"}
            </button>
          </form>
          <p className="muted">调用数据 ID：{dataIdForCall}</p>
          {loggerAddress ? (
            <p className="muted">合约地址：{loggerAddress}</p>
          ) : (
            <p className="error">未配置 VITE_DATA_LOGGER_ADDRESS</p>
          )}
          {logError && <p className="error">{logError.message}</p>}
          {logTxHash && (
            <p className="muted">已广播交易：{shortenAddress(logTxHash)}</p>
          )}
          {logConfirmed && <p className="muted">日志交易已上链 ✅</p>}
        </div>
      </section>
    </main>
  );
}

export default App;
