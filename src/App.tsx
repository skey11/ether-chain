import { ethers } from "ethers";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import "./App.css";
import { useChainData } from "./hooks/useChainData";
import { useTransactionDetails } from "./hooks/useTransactionDetails";
import { formatEth, formatGwei, injectedProvider } from "./lib/ethers";

const shortenAddress = (value?: string) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "";

function App() {
  const [account, setAccount] = useState<string>();
  const [addressInput, setAddressInput] = useState("");
  const [connectError, setConnectError] = useState<string>();
  const [txHashInput, setTxHashInput] = useState("");

  const normalizedInput = addressInput.trim();
  const targetAddress = normalizedInput || account;
  const normalizedTxHash = txHashInput.trim();
  const txHashPattern = /^0x([a-fA-F0-9]{64})$/;
  const activeTxHash = txHashPattern.test(normalizedTxHash)
    ? normalizedTxHash
    : undefined;

  const { blockNumber, balance, feeData, network, loading, error, refresh } =
    useChainData(targetAddress);
  const {
    transaction,
    receipt,
    loading: txLoading,
    error: txError,
    refresh: refreshTx,
  } = useTransactionDetails(activeTxHash);

  const handleConnect = async () => {
    try {
      setConnectError(undefined);
      const provider = injectedProvider();
      const [selected] = await provider.send("eth_requestAccounts", []);
      if (!selected) throw new Error("未选择任何账户");
      const normalized = ethers.getAddress(selected);
      setAccount(normalized);
      setAddressInput(normalized);
    } catch (err) {
      setConnectError((err as Error).message);
    }
  };

  const submitAddress = (event: FormEvent) => {
    event.preventDefault();
    refresh();
  };

  const submitTxHash = (event: FormEvent) => {
    event.preventDefault();
    if (!activeTxHash) return;
    refreshTx();
  };

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

  return (
    <main className="app">
      <section className="panel">
        <header>
          <p className="eyebrow">React + Ether.js</p>
          <h1>链上数据看板</h1>
          <p className="lead">
            连接钱包或粘贴任意地址，即可实时读取区块高度、Gas 价格与账户余额。
          </p>
        </header>

        <div className="actions">
          <button type="button" onClick={handleConnect}>
            {account ? `已连接 ${shortenAddress(account)}` : "连接钱包"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "同步中…" : "刷新"}
          </button>
        </div>
        {connectError && <p className="error">{connectError}</p>}

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
      </section>
    </main>
  );
}

export default App;
