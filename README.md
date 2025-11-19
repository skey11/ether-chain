# Ether Chain Dashboard

React + TypeScript + Ether.js 构建的链上数据面板，可以实时查看以太坊区块高度、gas 费用以及任意地址余额。

## 功能亮点
- 使用 `ethers.JsonRpcProvider` 读取最新区块、网络及 gas 价格。
- 连接浏览器钱包（MetaMask 等）后自动读取当前账户余额。
- 支持手动输入任意地址，查看该地址余额。
- 20 秒自动轮询，可手动刷新。
- 粘贴交易哈希，即可查询交易状态、所在区块、Gas 用量与实际手续费。

## 本地运行
1. 安装依赖：
   ```bash
   npm install
   ```
2. 复制 `.env.example` 为 `.env` 并填入自己的 RPC（推荐 Alchemy 或 Infura）：
   ```
   VITE_ALCHEMY_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
   ```
   默认为 Alchemy Demo Key，可直接体验但性能有限。
3. 启动开发服务器：
   ```bash
   npm run dev
   ```
4. 浏览器访问 `http://localhost:5173`，连接钱包或粘贴任意地址即可查看链上数据。

## 架构说明
- `src/lib/ethers.ts`：集中管理 RPC Provider、浏览器 Provider 与常用格式化方法。
- `src/hooks/useChainData.ts`：封装链上数据读取逻辑，负责轮询、错误处理、刷新等。
- `src/hooks/useTransactionDetails.ts`：按交易哈希读取交易与回执信息。
- `src/App.tsx`：UI 视图层，展示网络信息、gas 数据与余额。

欢迎在此基础上拓展更多读取/写入功能，例如加载交易、调用智能合约等。
