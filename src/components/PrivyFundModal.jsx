import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useFundWallet, useWallets } from "@privy-io/react-auth";
import { bsc, base, mainnet } from "wagmi/chains";
import { ChevronDown, Info, Loader2, X } from "lucide-react";
import OutsideClickHandler from "react-outside-click-handler/build/OutsideClickHandler";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { getPrivyEmbedded } from "../utils/privyWalletUtils";

/** Networks for Privy funding (EVM chains must match Dashboard / supportedChains). */
const FUND_NETWORK_OPTIONS = [
  {
    key: "56",
    label: "BNB Chain",
    chain: bsc,
    nativeSymbol: "BNB",
    icon: "https://cdn.allox.ai/allox/networks/bnbIcon.svg",
  },
  {
    key: "1",
    label: "Ethereum",
    chain: mainnet,
    nativeSymbol: "ETH",
    icon: "https://cdn.allox.ai/allox/networks/eth.svg",
  },
  {
    key: "8453",
    label: "Base",
    chain: base,
    nativeSymbol: "ETH",
    icon: "https://cdn.allox.ai/allox/networks/base.svg",
  },
];

/** USDT (ERC-20) on EVM networks that support it in the fund modal (not BNB Chain). */
const USDT_ERC20_BY_NETWORK_KEY = {
  1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  8453: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
};

function resolveDefaultFundNetworkKey(walletChainId) {
  if (walletChainId === 1 || walletChainId === 56 || walletChainId === 8453) {
    return String(walletChainId);
  }
  return "56";
}

function fundAssetsForNetwork(networkKey) {
  const net =
    FUND_NETWORK_OPTIONS.find((n) => n.key === networkKey) ??
    FUND_NETWORK_OPTIONS[0];

  if (networkKey === "56") {
    return [{ id: "native", displayLabel: net.nativeSymbol, icon: net.icon }];
  }

  const nativeTokenIcon =
    networkKey === "8453"
      ? "https://cdn.allox.ai/allox/networks/eth.svg"
      : net.icon;

  return [
    { id: "native", displayLabel: net.nativeSymbol, icon: nativeTokenIcon },
    {
      id: "usdc",
      displayLabel: "USDC",
      icon: "https://cdn.allox.ai/allox/tokens/usdc.svg",
    },
    {
      id: "usdt",
      displayLabel: "USDT",
      icon: "https://cdn.allox.ai/allox/tokens/usdt.svg",
    },
  ];
}

export function PrivyFundModal({ open, onClose, walletChainId, coinbase }) {
  const [fundNetworkKey, setFundNetworkKey] = useState("56");
  const [fundAsset, setFundAsset] = useState("native");
  const [fundAmount, setFundAmount] = useState("0.01");
  const [fundSubmitting, setFundSubmitting] = useState(false);
  const [chainMenuOpen, setChainMenuOpen] = useState(false);
  const [assetMenuOpen, setAssetMenuOpen] = useState(false);
  const { user: authUser } = useAuth();
  const walletAddress = useSelector((state) => state.wallet.address);
  const { fundWallet } = useFundWallet();
  const { wallets } = useWallets();

  useEffect(() => {
    if (!open) {
      setChainMenuOpen(false);
      setAssetMenuOpen(false);
      return;
    }
    setFundNetworkKey(resolveDefaultFundNetworkKey(walletChainId));
    setFundAsset("native");
    setFundAmount("0.01");
    setChainMenuOpen(false);
    setAssetMenuOpen(false);
  }, [open, walletChainId]);

  const handleConfirmFund = async () => {
    const selectedNet = FUND_NETWORK_OPTIONS.find(
      (n) => n.key === fundNetworkKey,
    );
    if (!selectedNet) {
      toast.error("Select a network.");
      return;
    }
    const raw = fundAmount.trim().replace(",", ".");
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid amount greater than zero.");
      return;
    }

    setFundSubmitting(true);
    try {
      const evmAddr = (
        authUser?.address ||
        coinbase ||
        walletAddress ||
        ""
      ).trim();
      if (!evmAddr) {
        toast.error("Wallet address not available.");
        return;
      }

      const baseOpts = {
        chain: selectedNet.chain,
        amount: raw,
        // defaultFundingMethod: "card",
        card: { preferredProvider: "moonpay" },
      };
      let evmOptions;
      if (fundAsset === "native") {
        evmOptions = baseOpts;
      } else if (fundAsset === "usdc") {
        evmOptions = { ...baseOpts, asset: "USDC" };
      } else {
        const usdtHex = USDT_ERC20_BY_NETWORK_KEY[selectedNet.key];
        if (!usdtHex) {
          toast.error("USDT is not available on this network.");
          return;
        }
        evmOptions = { ...baseOpts, asset: { erc20: usdtHex } };
      }

      const embedded = getPrivyEmbedded(wallets);
      if (embedded?.fund) {
        await embedded.fund(evmOptions);
      } else {
        await fundWallet({ address: evmAddr, options: evmOptions });
      }
      onClose();
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || e || "");
      toast.error(msg || "Could not start funding. Please try again.");
    } finally {
      setFundSubmitting(false);
    }
  };

  const selectedNet =
    FUND_NETWORK_OPTIONS.find((n) => n.key === fundNetworkKey) ??
    FUND_NETWORK_OPTIONS[0];
  const assetRows = fundAssetsForNetwork(fundNetworkKey);
  const showAssetPicker = assetRows.length > 1;
  const selectedAssetRow =
    assetRows.find((r) => r.id === fundAsset) ?? assetRows[0];
  const amountUnitLabel =
    selectedAssetRow.id === "native"
      ? selectedNet.nativeSymbol
      : selectedAssetRow.displayLabel;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fund-modal-title"
      onClick={() => !fundSubmitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[100dvh] overflow-y-auto border border-gray-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-6 border-b border-gray-100">
          <h2
            id="fund-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Add funds
          </h2>
          <button
            type="button"
            onClick={() => onClose()}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-3 text-sm text-amber-950">
            <Info
              className="shrink-0 mt-0.5 text-amber-600"
              size={18}
              aria-hidden
            />
            <div className="space-y-2 text-amber-950/90">
              <p>
                You’ll continue in Privy’s secure flow (e.g. MoonPay) to buy
                crypto with a card or other supported methods.
              </p>
              <p className="text-amber-900/85">
                The amount is in the <strong>asset you receive</strong>—not the
                fiat total (checkout shows that). <strong>BNB Chain</strong> is
                BNB only. <strong>Ethereum</strong> and <strong>Base</strong>{" "}
                support native ETH plus USDC and USDT.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full">
              <span
                id="fund-chain-label"
                className="block text-xs font-semibold text-gray-500 mb-1.5"
              >
                Network
              </span>
              <OutsideClickHandler
                onOutsideClick={() =>
                  !fundSubmitting && setChainMenuOpen(false)
                }
              >
                <div className="relative">
                  <button
                    type="button"
                    id="fund-chain-trigger"
                    aria-labelledby="fund-chain-label"
                    aria-haspopup="listbox"
                    aria-expanded={chainMenuOpen}
                    disabled={fundSubmitting}
                    onClick={() => setChainMenuOpen((v) => !v)}
                    className="w-full bg-black rounded-xl px-2 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <img
                        src={selectedNet.icon}
                        alt=""
                        className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
                      />
                      <span className="font-medium text-sm text-white truncate">
                        {selectedNet.label}
                      </span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-white transition-transform ${chainMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {chainMenuOpen && (
                    <div
                      className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl p-2 z-30 animate-fade-in shadow-lg max-h-[min(280px,45vh)] overflow-y-auto"
                      role="listbox"
                      aria-labelledby="fund-chain-label"
                    >
                      {FUND_NETWORK_OPTIONS.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          role="option"
                          aria-selected={fundNetworkKey === o.key}
                          onClick={() => {
                            setFundNetworkKey(o.key);
                            setChainMenuOpen(false);
                            const valid = new Set(
                              fundAssetsForNetwork(o.key).map((r) => r.id),
                            );
                            setFundAsset((a) => (valid.has(a) ? a : "native"));
                          }}
                          className={`w-full flex hover:bg-black/5 hover:shadow-sm items-center gap-3 px-4 py-2 rounded-xl text-sm transition-colors ${
                            fundNetworkKey === o.key
                              ? "bg-black text-white font-medium hover:bg-gray-800"
                              : "hover:bg-black/5"
                          }`}
                        >
                          <img
                            src={o.icon}
                            alt=""
                            className="h-5 w-5 sm:h-6 sm:w-6"
                          />
                          <span>{o.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </OutsideClickHandler>
            </div>

            {showAssetPicker && (
              <div className="w-full">
                <span
                  id="fund-asset-label"
                  className="block text-xs font-semibold text-gray-500 mb-1.5"
                >
                  Asset
                </span>
                <OutsideClickHandler
                  onOutsideClick={() =>
                    !fundSubmitting && setAssetMenuOpen(false)
                  }
                >
                  <div className="relative">
                    <button
                      type="button"
                      id="fund-asset-trigger"
                      aria-labelledby="fund-asset-label"
                      aria-haspopup="listbox"
                      aria-expanded={assetMenuOpen}
                      disabled={fundSubmitting}
                      onClick={() => setAssetMenuOpen((v) => !v)}
                      className="w-full bg-black rounded-xl px-2 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <img
                          src={selectedAssetRow.icon}
                          alt=""
                          className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
                        />
                        <span className="font-medium text-sm text-white truncate">
                          {selectedAssetRow.displayLabel}
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-white transition-transform ${assetMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {assetMenuOpen && (
                      <div
                        className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl p-2 z-30 animate-fade-in shadow-lg"
                        role="listbox"
                        aria-labelledby="fund-asset-label"
                      >
                        {assetRows.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            role="option"
                            aria-selected={fundAsset === row.id}
                            onClick={() => {
                              setFundAsset(row.id);
                              setAssetMenuOpen(false);
                            }}
                            className={`w-full flex hover:bg-black/5 hover:shadow-sm items-center gap-3 px-4 py-2 rounded-xl text-sm transition-colors ${
                              fundAsset === row.id
                                ? "bg-black text-white font-medium hover:bg-gray-800"
                                : "hover:bg-black/5"
                            }`}
                          >
                            <img
                              src={row.icon}
                              alt=""
                              className="h-5 w-5 sm:h-6 sm:w-6"
                            />
                            <span>{row.displayLabel}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </OutsideClickHandler>
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="fund-amount"
              className="block text-xs font-semibold text-gray-500 mb-1.5"
            >
              Amount ({amountUnitLabel})
            </label>
            <div className="bg-white border border-gray-200 rounded-xl">
              <input
                id="fund-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="0.01"
                disabled={fundSubmitting}
                className="w-full px-4 py-2 rounded-xl text-sm font-medium text-gray-900 tabular-nums bg-transparent outline-none focus-visible:outline-0 privy-input disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2 mb-6">
            <button
              type="button"
              onClick={() => onClose()}
              disabled={fundSubmitting}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmFund}
              disabled={fundSubmitting}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {fundSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opening…
                </>
              ) : (
                "Confirm & continue"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
