import { QueryClient } from "@tanstack/react-query";
import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

import { rpcUrlFor } from "./ethers";

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [mainnet.id]: http(rpcUrlFor("alchemy", mainnet.id)),
    [sepolia.id]: http(rpcUrlFor("alchemy", sepolia.id)),
  },
  ssr: false,
});

export const queryClient = new QueryClient();
