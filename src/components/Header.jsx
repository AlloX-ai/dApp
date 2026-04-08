import { useState, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { openCheckinModal } from "../redux/slices/walletSlice";
import {
  Wallet,
  Menu,
  X,
  ChevronRight,
  Copy,
  Check,
  SendHorizontal,
  Coins,
  Gem,
} from "lucide-react";
import { NetworkSelector } from "./NetworkSelector";
import { shortAddress } from "../hooks/shortAddress";
import { useCheckin } from "../hooks/useCheckin";
import { useTotalPoints } from "../hooks/useTotalPoints";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { navigationTabs, isActivePath } from "../constants/navigation";
import OutsideClickHandler from "react-outside-click-handler";
import { findSeason2RewardForWallet } from "../constants/rewards";
import { MessageLimitModal } from "./MessageLimitModal";
import { useAuth } from "../hooks/useAuth";
import {
  getBonusMessages,
  getDailyMessagesRemaining,
  getTotalMessagesRemaining,
} from "../utils/rateLimitMessages";

export function Header({
  isConnected,
  coinbase,
  onConnectClick,
  onDisconnectClick,
  onOpenFundModal,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const rateLimit = useSelector((state) => state.chat?.rateLimit);
  const { totalPoints } = useTotalPoints();
  const messagesRemaining = getTotalMessagesRemaining(rateLimit);
  const dailyMessagesRemaining = getDailyMessagesRemaining(rateLimit);
  const bonusMessages = getBonusMessages(rateLimit);
  const dispatch = useDispatch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [messageLimitModalOpen, setMessageLimitModalOpen] = useState(false);

  const user = useMemo(
    () => findSeason2RewardForWallet(coinbase),
    [coinbase],
  );
  const { checkedInToday } = useCheckin();
  const { user: authUser } = useAuth();

  const handleOpenCheckinModal = () => {
    dispatch(openCheckinModal());
    setIsMenuOpen(false);
  };

  const handleLaunchClick = () => {
    setShowTooltip(true);
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
  };

  return (
<>
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-pattern/95 backdrop-blur-lg border-b border-gray-200/50">
      <div className="flex gap-1 items-center justify-between">
        <NavLink className="flex items-center gap-2 cursor-pointer" to="/">
          <img
            src={"https://cdn.allox.ai/allox/AlloX-desktop.svg"}
            alt=""
            className="h-8 hidden md:flex "
          />
          <img
            src={"https://cdn.allox.ai/allox/AlloX-mobile.svg"}
            alt=""
            className="h-10 flex md:hidden "
          />
        </NavLink>
        <OutsideClickHandler
          onOutsideClick={() => {
            setShowTooltip(false);
          }}
        >
          <div className="flex gap-2 sm:gap-4">
            <div
              className="bg-white rounded-full px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => {
                navigate("/rewards");
              }}
              role="button"
            >
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-amber-500" />

                <span className="text-xs sm:text-sm font-semibold tabular-nums">
                  {totalPoints.toLocaleString()}
                </span>
              </div>
              {(messagesRemaining != null || user) && (
                <div className="border-l border-gray-200/60 pl-3 flex items-center gap-2">
                  <Gem className="size-4 text-purple-600" />
                  <span className="text-xs sm:text-sm font-semibold tabular-nums flex">
                    {user ? user.gems : 0}
                    <span className="text-xs sm:text-sm font-semibold tabular-nums text-[#4A5565]">
                      (${user ? user.gems * 5 : 0})
                    </span>
                  </span>
                </div>
              )}
            </div>
            {totalPoints >= 0 && isConnected && 
              <div
                    className="bg-white rounded-full px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-gray-200 transition-color"
                    onClick={() => setMessageLimitModalOpen(true)}
                    role="button"
                  >
                    {messagesRemaining != null && (
                      <div className="flex items-center gap-2">
                        <SendHorizontal className="size-4 text-green-600" />
                        <span className="text-sm font-semibold tabular-nums">
                          {messagesRemaining}
                        </span>
                      </div>
                    )}
                  </div>
            }
            {/* {totalPoints >= 0 && isConnected && (
              <Tooltip
                open={showTooltip}
              
              >
                <TooltipTrigger asChild>
                
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  sideOffset={10}
                  hideArrow={true}
                  className="border border-neutral-200/80 max-w-[370px] bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-2 py-2 text-sm font-medium text-neutral-800 flex items-center gap-2.5 [&>svg]:text-amber-500"
                >
                  <div className="flex flex-col gap-2 p-1 w-fit items-center justify-center">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border-2 border-indigo-200 hover:shadow-md transition-shadow">
                      <span className="w-full">
                        <b>Daily limit:</b> You have {messagesRemaining}{" "}
                        messages remaining today. The limit resets every 24
                        hours.
                      </span>
                    </div>
                    <button
                      onMouseDown={(event) => {
                        // Tooltip content renders in a portal, so outside-click can
                        // close it before click fires. Open modal on mousedown first.
                        event.preventDefault();
                        event.stopPropagation();
                        setMessageLimitModalOpen(true);
                        setShowTooltip(false);
                      }}
                      className="bg-black w-fit text-white px-8 py-3 rounded-xl font-semibold hover:bg-black/80 transition-colors"
                    >
                      Buy Messages
                    </button>
                  </div>
                </TooltipContent>
              </Tooltip>
            )} */}
            {isConnected ? (
              <div className="glass-card px-0 md:pr-4 flex items-center gap-3 transition-all duration-200 hover:shadow-md">
                {authUser?.authProvider === "privy" && (
                  <button
                    type="button"
                    onClick={onOpenFundModal}
                    className="hidden md:inline-flex ml-2 text-xs font-semibold px-3 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Add funds
                  </button>
                )}
                {/* <div className="hidden md:flex"> */}
                <NetworkSelector onDisconnectClick={onDisconnectClick} />
                {/* </div> */}
                <div className="hidden md:flex items-center gap-2">
                  <span
                    className="text-sm cursor-pointer font-medium flex gap-3 items-center"
                    onClick={() => handleCopy(coinbase)}
                  >
                    {shortAddress(coinbase)}
                    {copied ? (
                      <Check size={20} className="text-black" />
                    ) : (
                      <Copy size={20} className="text-black" />
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={onConnectClick}
                className="btn-primary transition-all duration-200 hover:shadow-lg"
              >
                <Wallet size={20} className="md:mr-2" />
                <span className="hidden md:inline">Connect Wallet</span>
              </button>
            )}

            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="glass-card p-2 rounded-full shadow-lg"
                aria-expanded={isMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              {isMenuOpen && (
                <>
                  <OutsideClickHandler
                    onOutsideClick={() => setIsMenuOpen(false)}
                  >
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMenuOpen(false)}
                    ></div>
                    <div className="fixed left-0 right-0 top-20 z-50 animate-fade-in">
                      <div className="mobile-menu-open bg-white p-3 space-y-2 shadow-xl shadow-black/10">
                        {navigationTabs.map((tab) => {
                          const { id, label, path } = tab;
                          const NavIcon = tab.Icon;
                          const isActive = isActivePath(pathname, path);
                          return (
                            <button
                              key={id}
                              onClick={() => {
                                navigate(path);
                                setIsMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                isActive
                                  ? "bg-black text-white shadow-lg"
                                  : "text-gray-700 hover:bg-black/5 hover:shadow-sm"
                              }`}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <span className="flex items-center gap-3">
                                <NavIcon size={20} />
                                {label}
                              </span>
                              <ChevronRight size={18} />
                            </button>
                          );
                        })}
                        {isConnected && authUser?.authProvider === "privy" && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenFundModal();
                              setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          >
                            Add funds
                          </button>
                        )}
                        {isConnected && (
                          <div className="flex items-center gap-2 justify-between">
                            <span
                              className=" pl-4 py-3 text-sm font-medium flex gap-3 items-center"
                              onClick={() => handleCopy(coinbase)}
                            >
                              {copied ? (
                                <Check size={20} className="text-black" />
                              ) : (
                                <Copy size={20} className="text-black" />
                              )}
                              {shortAddress(coinbase)}
                            </span>
                            {/* <NetworkSelector
                              onDisconnectClick={onDisconnectClick}
                            /> */}
                          </div>
                        )}
                        {isConnected && (
                          <div className="px-4 pb-4 mt-auto">
                            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-2xl p-4 shadow-lg">
                              {/* Decorative elements */}
                              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>

                              <div className="relative items-center z-10 flex gap-2 w-full">
                                <div className="w-full">
                                  <div className="text-white/90 text-xs font-semibold mb-1">
                                    Daily Bonus
                                  </div>
                                  <div className="text-white font-bold text-sm mb-0">
                                    Get up to 5,000 points
                                  </div>
                                </div>

                                <button
                                  onClick={handleOpenCheckinModal}
                                  disabled={!isConnected}
                                  className="w-full bg-white text-purple-600 font-semibold text-sm py-2 px-4 rounded-xl hover:bg-white/90 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {checkedInToday ? "Already Claimed" : "Claim"}
                                  {/* Coming Soon */}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </OutsideClickHandler>
                </>
              )}
            </div>
          </div>
        </OutsideClickHandler>
     
      </div>
    </header>
       <MessageLimitModal
          isOpen={messageLimitModalOpen}
          onClose={() => setMessageLimitModalOpen(false)}
          dailyMessagesRemaining={dailyMessagesRemaining}
          bonusMessages={bonusMessages}
        />
</>
  );
}
