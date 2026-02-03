import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { Wallet, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { NetworkSelector } from "./NetworkSelector";
import { shortAddress } from "../hooks/shortAddress";
import { navigationTabs, isActivePath } from "../constants/navigation";
import OutsideClickHandler from "react-outside-click-handler/build/OutsideClickHandler";
import alloxDesktop from "../assets/AlloX-desktop.svg";
export function Header({
  isConnected,
  coinbase,
  onConnectClick,
  onDisconnectClick,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-pattern/95 backdrop-blur-lg border-b border-gray-200/50">
      <div className="flex items-center justify-between">
        <NavLink className="flex items-center gap-2 cursor-pointer" to="/">
          <img src={alloxDesktop} alt="" className="h-8"/>
        </NavLink>

        <div className="flex items-center gap-4">
          {isConnected && <NetworkSelector />}

          {isConnected ? (
            <div className="glass-card px-4 py-2 flex items-center gap-3 transition-all duration-200 hover:shadow-md">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"></div>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm font-medium flex items-center">
                  {shortAddress(coinbase)}
                </span>
                <button
                  className="w-12 h-8 bg-black rounded-xl flex items-center justify-center"
                  onClick={onDisconnectClick}
                >
                  <LogOut className="text-white" />
                </button>
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
                    </div>
                  </div>
                </OutsideClickHandler>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
