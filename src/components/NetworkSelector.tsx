import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import OutsideClickHandler from "react-outside-click-handler";
import { toast } from "sonner";
import { setAddress, setChainId, setIsConnected, setWalletType } from "../redux/slices/walletSlice";
import { connect, disconnect, getAccount } from "@wagmi/core";
import { wagmiClient } from "../wagmiConnectors";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSwitchChain, useAccount } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { setChainId } from "../redux/slices/walletSlice";
import {
  getPrivyEmbedded,
  switchPrivyEmbeddedToChain,
} from "../utils/privyWalletUtils";

const SOLANA_CHAIN_ID = 101;
const AUTH_USER_KEY = "authUser";

function getStoredAuthUser(): { walletType?: string; address?: string;[k: string]: unknown } | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
}

type NetworkOption = {
  name: string;
  icon: string;
  chainId: number;
  chainHex: string;
  chainName: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
};

type NetworkSelectorProps = {
  onDisconnectClick: () => void;
};

export function NetworkSelector({ onDisconnectClick }: NetworkSelectorProps) {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const chainId = useSelector((state: any) => state.wallet.chainId);
  const walletType = useSelector((state: any) => state.wallet.walletType);
  const { connected: solanaConnected, publicKey: solanaPublicKey } = useWallet();
  const sessionSource = useSelector((state: any) => state.wallet.sessionSource);
  const { wallets } = useWallets();
  const { connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const isPrivySession =
    sessionSource === "privy" ||
    walletType === "privy";
  const errorNetwork: NetworkOption[] = [
    {
      name: "",
      icon: "https://cdn.allox.ai/allox/networks/error.svg",
      chainId: 0,
      chainHex: "0",
      chainName: "0",
      rpcUrls: [""],
      blockExplorerUrls: [""],
      nativeCurrency: { name: "", symbol: "", decimals: 1 },
    },
  ]
  const networks: NetworkOption[] = [

    {
      name: 'Ethereum',
      icon: 'https://cdn.allox.ai/allox/networks/eth.svg',
      chainId: 1,
      chainHex: '0x1',
      chainName: 'Ethereum Mainnet',
      rpcUrls: ['https://cloudflare-eth.com'],
      blockExplorerUrls: ['https://etherscan.io'],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    },
    {
      name: 'BNB Chain',
      icon: 'https://cdn.allox.ai/allox/networks/bnbIcon.svg',
      chainId: 56,
      chainHex: '0x38',
      chainName: 'BNB Smart Chain',
      rpcUrls: ['https://bsc-dataseed.binance.org'],
      blockExplorerUrls: ['https://bscscan.com'],
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    },
    {
      name: "Base",
      icon: "https://cdn.allox.ai/allox/networks/base.svg",
      chainId: 8453,
      chainHex: "0x2105",
      chainName: "Base",
      rpcUrls: ["https://mainnet.base.org"],
      blockExplorerUrls: ["https://basescan.org"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    },
    {
      name: "Solana",
      icon: "https://cdn.allox.ai/allox/networks/solana.svg",
      chainId: 101,
      chainHex: "0x65",
      chainName: "Solana Mainnet",
      rpcUrls: ["https://api.mainnet-beta.solana.com"],
      blockExplorerUrls: ["https://explorer.solana.com"],
      nativeCurrency: { name: "SOL", symbol: "SOL", decimals: 9 },
    },
  ];

  const selectedNetwork =
    networks.find((network) => network.chainId === chainId) ?? errorNetwork[0];

  const handleSwitchNetwork = async (network: NetworkOption) => {
    if (network.name === "Solana") {
      if (isPrivySession) {
        toast.error(
          "Your session uses Privy’s embedded EVM wallet. Use Ethereum, BNB Chain, or Base.",
        );
        setIsOpen(false);
        return;
      }
      try {
        localStorage.setItem(PREFERRED_CHAIN_STORAGE_KEY, String(SOLANA_CHAIN_ID));
        dispatch(setChainId(SOLANA_CHAIN_ID));
      } catch (e) {
        console.warn("Failed to persist preferred chain", e);
      }
      if (walletType !== "solana") {
        toast.error(
          "Solana requires a Solana-capable wallet (e.g. MetaMask with Solana). Please connect with a Solana wallet.",
        );
        setIsOpen(false);
        return;
      }
      dispatch(setChainId(SOLANA_CHAIN_ID));
      setIsOpen(false);
      return;
    }

    const provider = (window as any).ethereum;
    if (!provider) {
      toast.error("No EVM wallet detected (e.g. MetaMask).");
    if (network.name !== "Solana" && walletType === "solana" && !isPrivySession) {
      toast.error(
        "EVM networks require an EVM wallet (e.g. MetaMask, Binance Wallet). Please connect with an EVM wallet.",
      );
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    setIsSwitching(true);
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainHex }],
      });
      try {
        await provider.request({ method: "eth_requestAccounts" });
      } catch (accountsError) {
        console.error("Failed to request EVM accounts:", accountsError);
      }

      const metaMaskConnector = wagmiClient.connectors.find(
        (c: { name: string; }) => c.name?.toLowerCase().includes("metamask"),
      );
      if (metaMaskConnector) {
        const existingAccount = getAccount(wagmiClient);
        const alreadyMetaMask =
          existingAccount?.connector?.name?.toLowerCase?.().includes("metamask") &&
          existingAccount?.status === "connected";
        if (!alreadyMetaMask) {
          await connect(wagmiClient, { connector: metaMaskConnector });
        }
        const account = getAccount(wagmiClient);
        if (account?.address) {
          dispatch(setAddress(account.address));
          dispatch(setWalletType("evm"));
          dispatch(setIsConnected(true));
        }
      }
      dispatch(setChainId(network.chainId));
      const stored = getStoredAuthUser();
      if (stored) {
        const account = getAccount(wagmiClient);
        localStorage.setItem(
          AUTH_USER_KEY,
          JSON.stringify({ ...stored, walletType: "evm", address: account?.address ?? stored.address }),
        );
      }
      setIsOpen(false);
    } catch (error) {
      const walletError = error as { code?: number };
      if (walletError?.code === 4902 && connector) {
        try {
          const provider: any = await connector.getProvider();
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: network.chainHex,
                chainName: network.chainName,
                rpcUrls: network.rpcUrls,
                blockExplorerUrls: network.blockExplorerUrls,
                nativeCurrency: network.nativeCurrency,
              },
            ],
          });
          const metaMaskConnector = wagmiClient.connectors.find(
            (c) => c.name?.toLowerCase().includes("metamask"),
          );
          if (metaMaskConnector) {
            const existingAccount = getAccount(wagmiClient);
            const alreadyMetaMask =
              existingAccount?.connector?.name?.toLowerCase?.().includes("metamask") &&
              existingAccount?.status === "connected";
            if (!alreadyMetaMask) {
              await connect(wagmiClient, { connector: metaMaskConnector });
            }
            const account = getAccount(wagmiClient);
            if (account?.address) {
              dispatch(setAddress(account.address));
              dispatch(setWalletType("evm"));
              dispatch(setIsConnected(true));
            }
          }
          dispatch(setChainId(network.chainId));
          const stored = getStoredAuthUser();
          if (stored) {
            const account = getAccount(wagmiClient);
            localStorage.setItem(
              AUTH_USER_KEY,
              JSON.stringify({ ...stored, walletType: "evm", address: account?.address ?? stored.address }),
            );
          }
          setIsOpen(false);
        } catch (addErr) {
          console.error("Add network error:", addErr);
          toast.error("Failed to add or switch network.");
        }
      } else {
        console.error("Network switch error:", error);
        toast.error("Failed to switch network.");
      }
      toast.error("Failed to switch network.");
    } finally {
      setSwitching(false);
      setIsSwitching(false);
    }
  };

  const switchPrivyEVMChain = async (network: NetworkOption) => {
    const embedded = getPrivyEmbedded(wallets);
    if (!embedded) {
      toast.error("Embedded wallet not ready. Refresh the page or sign in again.");
      return;
    }
    try {
      setIsSwitching(true);
      await switchPrivyEmbeddedToChain(embedded, network.chainId);
      dispatch(setChainId(network.chainId));
      localStorage.removeItem(PREFERRED_CHAIN_STORAGE_KEY);
      setIsOpen(false);
    } catch (error) {
      console.error("Privy network switch error:", error);
      toast.error("Failed to switch network.");
    } finally {
      setIsSwitching(false);
    }
  };

  const switchEVMChain = async (network: NetworkOption) => {
    if (network.name === "Solana") return;
    if (isPrivySession) {
      await switchPrivyEVMChain(network);
      return;
    }
    if (!switchChainAsync) {
      toast.error("Unable to switch chain. Please try reconnecting your wallet.");
      return;
    }
    if (!connector) {
      toast.error("No wallet connected. Please connect an EVM wallet first.");
      return;
    }
    try {
      setIsSwitching(true);
      await switchChainAsync({ chainId: network.chainId });
      dispatch(setChainId(network.chainId));
      // localStorage.removeItem(PREFERRED_CHAIN_STORAGE_KEY);
      setIsOpen(false);
    } catch (error) {
      const err = error as { code?: number };
      if (err?.code === 4902) {
        try {
          const provider: any = await connector.getProvider();
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: network.chainHex,
                chainName: network.chainName,
                rpcUrls: network.rpcUrls,
                blockExplorerUrls: network.blockExplorerUrls,
                nativeCurrency: network.nativeCurrency,
              },
            ],
          });
          await switchChainAsync({ chainId: network.chainId });
          dispatch(setChainId(network.chainId));
          // localStorage.removeItem(PREFERRED_CHAIN_STORAGE_KEY);
          setIsOpen(false);
        } catch (addErr) {
          console.error("Add network error:", addErr);
          toast.error("Failed to add or switch network.");
        }
      } else {
        console.error("Network switch error:", error);
        toast.error("Failed to switch network.");
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSwitchToSolana = async () => {
    if (!solanaConnected || !solanaPublicKey) {
      toast.error(
        "Please connect MetaMask Solana from the wallet modal first.",
      );
      return;
    }
    setSwitching(true);
    try {
      const currentAccount = getAccount(wagmiClient);
      if (currentAccount?.connector) {
        await disconnect(wagmiClient, { connector: currentAccount.connector });
      }
      const address = solanaPublicKey.toBase58();
      dispatch(setWalletType("solana"));
      dispatch(setAddress(address));
      dispatch(setChainId(SOLANA_CHAIN_ID));
      dispatch(setIsConnected(true));
      const stored = getStoredAuthUser();
      if (stored) {
        localStorage.setItem(
          AUTH_USER_KEY,
          JSON.stringify({
            ...stored,
            walletType: "solana",
            address: address ?? stored.address,
          }),
        );
      }
      setIsOpen(false);
    } catch (err) {
      console.error("Switch to Solana:", err);
      toast.error("Failed to switch to Solana. Please try again.");
    } finally {
      setSwitching(false);
    }
  };

  const handleSwitchNetworkEVM = async (network: NetworkOption) => {
    if (network.name === "Solana") {
      if (isPrivySession) {
        toast.error(
          "Your session uses Privy’s embedded EVM wallet. Use Ethereum, BNB Chain, or Base.",
        );
        setIsOpen(false);
        return;
      }
      toast.error(
        "Solana requires a Solana-capable wallet (e.g. MetaMask with Solana). Please connect with a Solana wallet.",
      );
      setIsOpen(false);
      return;
    }
    await switchEVMChain(network);
  };

  const manageSwitchNetwork = (network: NetworkOption) => {
    if (walletType === "solana") {
      handleSwitchNetwork(network);
    } else if (network.name === "Solana") {
      handleSwitchToSolana();
    } else {
      handleSwitchNetworkEVM(network);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black rounded-full px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 hover:bg-gray-800 transition-colors"
      >
        <img src={selectedNetwork.icon} alt="" className="h-5 w-5 sm:h-6 sm:w-6" />
        {/* <span className="font-medium text-sm hidden md:block">{selectedNetwork?.name}</span> */}
        <ChevronDown
          size={16}
          className={`text-white transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl p-2 min-w-[200px] z-20 animate-fade-in">
            <OutsideClickHandler onOutsideClick={() => setIsOpen(false)}>
              {networks.map((network) => (
                <button
                  key={network.name}
                  onClick={() => manageSwitchNetwork(network)}
                  disabled={switching}
                  className={`w-full flex hover:bg-black/5 hover:shadow-sm items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:pointer-events-none ${selectedNetwork?.name === network.name
                    ? "bg-black text-white font-medium hover:bg-gray-800"
                    : "hover:bg-black/5"
                    }`}
                >
                  <img src={network.icon} alt="" className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>{network.name}</span>
                </button>
              ))}
              <div className="border-t border-gray-200/50 w-full my-3" />
              <button
                className="w-full text-[#F54900] px-4 py-2 flex items-center gap-2 rounded-xl hover:bg-[#FDDDCB]"
                onClick={onDisconnectClick}
              >
                Disconnect
              </button>
              {isSwitching && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Waiting for you to confirm network switch in your wallet…</span>
                </div>
              )}
            </OutsideClickHandler>
          </div>
        </>
      )}
    </div>
  );
}
