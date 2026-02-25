import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import OutsideClickHandler from "react-outside-click-handler";
import { toast } from "sonner";
import { setAddress, setChainId, setIsConnected, setWalletType } from "../redux/slices/walletSlice";
import { connect, disconnect, getAccount } from "@wagmi/core";
import { wagmiClient } from "../wagmiConnectors";
import { useWallet } from "@solana/wallet-adapter-react";

const SOLANA_CHAIN_ID = 101;
const AUTH_USER_KEY = "authUser";

function getStoredAuthUser(): { walletType?: string; address?: string; [k: string]: unknown } | null {
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
  const chainId = useSelector((state: any) => state.wallet.chainId);
  const walletType = useSelector((state: any) => state.wallet.walletType);
  const { connected: solanaConnected, publicKey: solanaPublicKey } = useWallet();
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
      return;
    }

    setSwitching(true);
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
    } catch (error) {
      const walletError = error as { code?: number };
      if (walletError?.code === 4902) {
        try {
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
          return;
        } catch (addError) {
          console.error("Network add error:", addError);
        }
      } else {
        console.error("Network switch error:", error);
      }
      toast.error("Failed to switch network.");
    } finally {
      setSwitching(false);
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
      toast.error(
        "Solana requires a Solana-capable wallet (e.g. MetaMask with Solana). Please connect with a Solana wallet.",
      );
      setIsOpen(false);
      return;
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      toast.error("MetaMask not detected.");
      return;
    }

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainHex }],
      });
      setIsOpen(false);
    } catch (error) {
      const walletError = error as { code?: number };
      if (walletError?.code === 4902) {
        try {
          await ethereum.request({
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
          setIsOpen(false);
          return;
        } catch (addError) {
          console.error("Network add error:", addError);
        }
      } else {
        console.error("Network switch error:", error);
      }
      toast.error("Failed to switch network.");
    }
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
            </OutsideClickHandler>
          </div>
        </>
      )}
    </div>
  );
}
