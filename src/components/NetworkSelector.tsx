import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import OutsideClickHandler from 'react-outside-click-handler';

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

export function NetworkSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const chainId = useSelector((state: any) => state.wallet.chainId);

  const networks: NetworkOption[] = [
    {
      name: 'Ethereum',
      icon: '💎',
      chainId: 1,
      chainHex: '0x1',
      chainName: 'Ethereum Mainnet',
      rpcUrls: ['https://cloudflare-eth.com'],
      blockExplorerUrls: ['https://etherscan.io'],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    },
    {
      name: 'BNB Chain',
      icon: '🟡',
      chainId: 56,
      chainHex: '0x38',
      chainName: 'BNB Smart Chain',
      rpcUrls: ['https://bsc-dataseed.binance.org'],
      blockExplorerUrls: ['https://bscscan.com'],
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    },
    {
      name: 'Arbitrum',
      icon: '🔷',
      chainId: 42161,
      chainHex: '0xa4b1',
      chainName: 'Arbitrum One',
      rpcUrls: ['https://arb1.arbitrum.io/rpc'],
      blockExplorerUrls: ['https://arbiscan.io'],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    },
    {
      name: 'Base',
      icon: '🔵',
      chainId: 8453,
      chainHex: '0x2105',
      chainName: 'Base',
      rpcUrls: ['https://mainnet.base.org'],
      blockExplorerUrls: ['https://basescan.org'],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    },
    {
      name: 'opBNB',
      icon: '🟠',
      chainId: 204,
      chainHex: '0xcc',
      chainName: 'opBNB',
      rpcUrls: ['https://opbnb-mainnet-rpc.bnbchain.org'],
      blockExplorerUrls: ['https://opbnbscan.com'],
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    },
  ];

  const selectedNetwork =
    networks.find((network) => network.chainId === chainId) ?? networks[0];

  const handleSwitchNetwork = async (network: NetworkOption) => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      (window as any).alertify?.error?.('MetaMask not detected.');
      return;
    }

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainHex }],
      });
      setIsOpen(false);
    } catch (error) {
      const walletError = error as { code?: number };
      if (walletError?.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
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
          console.error('Network add error:', addError);
        }
      } else {
        console.error('Network switch error:', error);
      }
      (window as any).alertify?.error?.('Failed to switch network.');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-card px-4 py-2 flex items-center gap-3 hover:bg-white/80 transition-colors"
      >
        <span className="text-lg">
          {selectedNetwork?.icon}
        </span>
        <span className="font-medium text-sm hidden md:block">{selectedNetwork?.name}</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
                onClick={() => handleSwitchNetwork(network)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                  selectedNetwork?.name === network.name
                    ? 'bg-black text-white font-medium'
                    : 'hover:bg-black/5'
                }`}
              >
                <span className="text-lg">{network.icon}</span>
                <span>{network.name}</span>
              </button>
            ))}
            </OutsideClickHandler>
          </div>
        </>
      )}
    </div>
  );
}
