import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import OutsideClickHandler from "react-outside-click-handler";
import {
  portfolioSidebarNav,
  isPortfolioSidebarNavActive,
  isActivePath,
} from "../constants/navigation";

/**
 * Shared "Portfolios" expander: My Portfolio, Top Portfolios, Watchlist.
 * Used by LaunchSidebar (desktop) and Header mobile menu.
 */
export function PortfolioNavGroup({
  pathname,
  navigate,
  onItemNavigate,
  idPrefix = "portfolio",
}) {
  const [open, setOpen] = useState(false);
  const { label, Icon: TriggerIcon, items } = portfolioSidebarNav;
  const groupActive = isPortfolioSidebarNavActive(pathname);
  const triggerFilled = open || groupActive;

  const triggerId = `${idPrefix}-trigger`;
  const submenuId = `${idPrefix}-submenu`;

  const rowClass =
    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all duration-200";

  return (
    <OutsideClickHandler onOutsideClick={() => setOpen(false)}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={submenuId}
          id={triggerId}
          aria-label={
            open
              ? "Portfolios menu expanded, click to collapse"
              : "Portfolios menu collapsed, click to expand"
          }
          className={`${rowClass} ${
            triggerFilled
              ? "bg-black font-semibold text-white shadow-md hover:bg-neutral-900"
              : "font-medium text-slate-700 hover:bg-black/4 hover:shadow-sm"
          }`}
        >
          <TriggerIcon
            size={20}
            strokeWidth={triggerFilled ? 2.25 : 2}
            className={`shrink-0 ${triggerFilled ? "text-white" : "text-slate-700"}`}
          />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {open ? (
            <ChevronUp size={18} className="shrink-0 text-white" aria-hidden />
          ) : (
            <ChevronDown
              size={18}
              className={`shrink-0 ${triggerFilled ? "text-white" : "text-slate-500"}`}
              aria-hidden
            />
          )}
        </button>

        {open && (
          <div
            id={submenuId}
            className="mt-2 ml-1 space-y-1 border-l-2 border-slate-200/90 pl-3"
            role="group"
            aria-labelledby={triggerId}
          >
            {items.map((item) => {
              const SubIcon = item.Icon;
              const subActive = isActivePath(pathname, item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    setOpen(false);
                    onItemNavigate?.();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    subActive
                      ? "bg-slate-100 text-slate-900 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]"
                      : "text-slate-700 hover:bg-slate-50 active:bg-slate-100/80"
                  }`}
                  aria-current={subActive ? "page" : undefined}
                >
                  <SubIcon
                    size={18}
                    strokeWidth={2}
                    className={`shrink-0 ${
                      subActive ? "text-slate-800" : "text-slate-500"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </OutsideClickHandler>
  );
}
