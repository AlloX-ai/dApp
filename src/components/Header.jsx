import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Wallet,
  Menu,
  X,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  SendHorizontal,
  Gem,
} from "lucide-react";
import { NetworkSelector } from "./NetworkSelector";
import { shortAddress } from "../hooks/shortAddress";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { navigationTabs, isActivePath } from "../constants/navigation";
import OutsideClickHandler from "react-outside-click-handler/build/OutsideClickHandler";

export function Header({
  isConnected,
  coinbase,
  onConnectClick,
  onDisconnectClick,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pointsBalance = useSelector((state) => state.points?.balance);
  const rateLimit = useSelector((state) => state.chat?.rateLimit);

  const messagesRemaining =
    rateLimit?.remaining ?? rateLimit?.messagesRemaining;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showTooltip, setShowTooltip] = useState(false);

  const handleLaunchClick = () => {
    setShowTooltip(true);
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-pattern/95 backdrop-blur-lg border-b border-gray-200/50">
      <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-4">
            {pointsBalance != null && pointsBalance >= 0 && isConnected && (
              <Tooltip
                open={showTooltip}
                // onOpenChange={(open) => {
                //     if (!open) setShowTooltip(false);
                // }}
              >
                <TooltipTrigger asChild>
                  <div
                    className="glass-card px-3 py-2 flex items-center gap-3 cursor-pointer"
                    onClick={handleLaunchClick}
                    role="button"
                  >
                    <div className="flex items-center gap-2">
                      <Gem className="size-4 text-amber-500" />

                      <span className="text-sm font-semibold tabular-nums">
                        {pointsBalance.toLocaleString()}
                      </span>
                    </div>
                    {messagesRemaining != null && (
                      <div className="border-l border-gray-200/60 pl-3 flex items-center gap-2">
                        <SendHorizontal className="size-4 text-green-600" />
                        <span className="text-sm font-semibold tabular-nums">
                          {messagesRemaining}
                        </span>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  sideOffset={10}
                  hideArrow={true}
                  className="border border-neutral-200/80 bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-4 py-3 text-sm font-medium text-neutral-800 flex items-center gap-2.5 [&>svg]:text-amber-500"
                >
                  <div className="flex flex-col gap-2 p-3 w-fit">
                    <span className="flex gap-2">
                      <Sparkles
                        className="text-amber-500 size-4 shrink-0"
                        strokeWidth={2}
                      />{" "}
                      Earn points by getting started and staying active.
                    </span>
                    <span>Welcome bonus 5000 points.</span>
                    <span>
                      Create a Narrative Portfolio and earn 250 points each.
                    </span>
                    <span>
                      Send chat messages and earn 25 points per message.
                    </span>
                    <div className="border-t border-gray-200 w-full my-1"></div>
                    <span>Up to 100 messages allowed every 24 hours.</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            {isConnected ? (
              <div className="glass-card px-0 md:pr-4 flex items-center gap-3 transition-all duration-200 hover:shadow-md">
                <NetworkSelector onDisconnectClick={onDisconnectClick} />
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
                        {navigationTabs.map(({ id, label, path, Icon }) => {
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
                                <Icon size={20} />
                                {label}
                              </span>
                              <ChevronRight size={18} />
                            </button>
                          );
                        })}
                        {isConnected && (
                          <div className="flex items-center gap-2">
                            <span
                              className=" px-4 py-3 text-sm font-medium flex gap-3 items-center"
                              onClick={() => handleCopy(coinbase)}
                            >
                              {copied ? (
                                <Check size={20} className="text-black" />
                              ) : (
                                <Copy size={20} className="text-black" />
                              )}
                              {shortAddress(coinbase)}
                            </span>
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
  );
}
