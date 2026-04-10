import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, CircleHelp, Plus, Trash2, X } from "lucide-react";
import OutsideClickHandler from "react-outside-click-handler";
import { toast } from "sonner";
import { notificationsApi } from "../utils/alertsApi";
import { useAuth } from "../hooks/useAuth";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const STEP_OPTIONS = [5, 10, 15, 20];

export function PortfolioAlertSettings({ portfolioId, onClose }) {
  const { ensureAuthenticated, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [customPercent, setCustomPercent] = useState("");
  const [customMode, setCustomMode] = useState("TOTAL");
  const [isStepMenuOpen, setIsStepMenuOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [pendingDefaultEnabled, setPendingDefaultEnabled] = useState(null);
  const [pendingPaused, setPendingPaused] = useState(null);

  const loadConfig = useCallback(async () => {
    if (!portfolioId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      await ensureAuthenticated();
      const data = await notificationsApi.getConfig(portfolioId);
      setConfig(data);
    } catch (error) {
      if (error?.status === 401) logout();
      setErrorMessage(
        error?.message || "Unable to load notification settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [ensureAuthenticated, logout, portfolioId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    setPendingDefaultEnabled(null);
    setPendingPaused(null);
  }, [config?.defaultEnabled, config?.paused]);

  const patchConfig = async (payload) => {
    if (!portfolioId) return;
    setSaving(true);
    try {
      await ensureAuthenticated();
      const next = await notificationsApi.updateConfig(portfolioId, payload);
      setConfig((prev) => ({ ...prev, ...next, ...payload }));
    } catch (error) {
      if (error?.status === 401) logout();
      toast.error(error?.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustom = async () => {
    const percent = Number(customPercent);
    if (!percent || percent < -1000 || percent > 1000) {
      toast.error(
        "Enter a valid threshold percent (negative values allowed, e.g. -2).",
      );
      return;
    }
    try {
      setSaving(true);
      await ensureAuthenticated();
      const next = await notificationsApi.addCustomThreshold(portfolioId, {
        percent,
        mode: customMode,
      });
      setConfig(next);
      setCustomPercent("");
      setCustomMode("TOTAL");
    } catch (error) {
      if (error?.status === 401) logout();
      toast.error(error?.message || "Unable to add custom threshold.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustom = async (thresholdId) => {
    try {
      setSaving(true);
      await ensureAuthenticated();
      await notificationsApi.removeCustomThreshold(portfolioId, thresholdId);
      await loadConfig();
    } catch (error) {
      if (error?.status === 401) logout();
      toast.error(error?.message || "Unable to remove custom threshold.");
    } finally {
      setSaving(false);
    }
  };

  const customThresholds = useMemo(
    () =>
      Array.isArray(config?.customThresholds) ? config.customThresholds : [],
    [config?.customThresholds],
  );

  const stepValue = Number(config?.stepPercent || 5);
  const effectiveDefaultEnabled =
    pendingDefaultEnabled == null
      ? Boolean(config?.defaultEnabled)
      : Boolean(pendingDefaultEnabled);
  const effectivePaused =
    pendingPaused == null ? Boolean(config?.paused) : Boolean(pendingPaused);
  const hasPendingDefault = pendingDefaultEnabled != null;
  const hasPendingPaused = pendingPaused != null;

  const ToggleRow = ({
    label,
    checked,
    onToggle,
    disabled,
    onConfirm,
    onCancel,
    showConfirm,
    helpText,
  }) => (
    <div className="space-y-2">
      <div className="w-full flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {helpText ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-800"
                  aria-label={`${label} info`}
                >
                  <CircleHelp size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                hideArrow
                className="max-w-[320px] bg-black text-white rounded-xl px-3 py-2 text-xs"
              >
                {helpText}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="disabled:opacity-60"
          aria-pressed={checked}
        >
          <span
            className={`relative inline-block w-11 h-6 rounded-full transition-colors ${
              checked ? "bg-black" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                checked ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </div>
      {showConfirm && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-black text-white text-xs hover:bg-gray-800 disabled:opacity-60"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 max-w-[600px] w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-1.5">
          <h4 className="text-lg font-bold">Portfolio Alert Settings</h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800"
                aria-label="Portfolio alert settings info"
              >
                <CircleHelp size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              hideArrow
              className="max-w-[360px] bg-black text-white rounded-xl px-3 py-2 text-xs"
            >
              Notifications are generated when your ON_CHAIN portfolio crosses
              step thresholds or custom targets. Default step alerts trigger on
              percentage steps (e.g. 5%, 10%, 15%).
            </TooltipContent>
          </Tooltip>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 hover:bg-black/5"
          aria-label="Close alert settings"
        >
          <X size={18} />
        </button>
      </div>

      {loading && <p className="text-sm text-gray-600">Loading settings...</p>}
      {!loading && errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}

      {!loading && !errorMessage && config && (
        <div className="space-y-4">
          <ToggleRow
            label="Default step alerts"
            checked={effectiveDefaultEnabled}
            onToggle={() => setPendingDefaultEnabled(!effectiveDefaultEnabled)}
            onConfirm={() =>
              patchConfig({ defaultEnabled: effectiveDefaultEnabled })
            }
            onCancel={() => setPendingDefaultEnabled(null)}
            showConfirm={hasPendingDefault}
            disabled={saving}
            helpText="When enabled, you receive alerts every stepPercent move in either direction. Example: step 5% triggers at ±5%, ±10%, ±15%."
          />

          <div className="flex items-center justify-between gap-3 text-sm">
            <span>Step size</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsModeMenuOpen(false);
                  setIsStepMenuOpen((prev) => !prev);
                }}
                disabled={saving}
                className="min-w-[120px] px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm inline-flex items-center justify-between gap-3 hover:bg-black/5 disabled:opacity-60"
              >
                <span>{stepValue}%</span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
              {isStepMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl p-2 min-w-[140px] z-20 animate-fade-in">
                  <OutsideClickHandler
                    onOutsideClick={() => setIsStepMenuOpen(false)}
                  >
                    {STEP_OPTIONS.map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => {
                          patchConfig({ stepPercent: step });
                          setIsStepMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors ${
                          stepValue === step
                            ? "bg-black text-white font-medium hover:bg-gray-800"
                            : "hover:bg-black/5 hover:shadow-sm"
                        }`}
                      >
                        {stepValue === step ? (
                          <Check size={14} />
                        ) : (
                          <span className="w-[14px]" />
                        )}
                        <span>{step}%</span>
                      </button>
                    ))}
                  </OutsideClickHandler>
                </div>
              )}
            </div>
          </div>

          <ToggleRow
            label="Pause all alerts"
            checked={effectivePaused}
            onToggle={() => setPendingPaused(!effectivePaused)}
            onConfirm={() => patchConfig({ paused: effectivePaused })}
            onCancel={() => setPendingPaused(null)}
            showConfirm={hasPendingPaused}
            disabled={saving}
            helpText="Temporarily disables notifications for this portfolio without deleting your configuration."
          />

          <div className="pt-2 border-t border-gray-100">
            <h5 className="text-sm font-semibold mb-2">Custom Thresholds</h5>
            <p className="text-xs text-gray-500 mb-2">
              Use positive values for gain alerts and negative values for loss
              alerts (e.g. -2%).
            </p>
            <div className="flex flex-col md:flex-row items-center gap-2 mb-3">
              <input
                type="number"
                placeholder="-2% or 10%"
                min={-1000}
                max={1000}
                value={customPercent}
                onChange={(e) => setCustomPercent(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 w-full bg-white"
                disabled={saving}
              />
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => {
                    setIsStepMenuOpen(false);
                    setIsModeMenuOpen((prev) => !prev);
                  }}
                  disabled={saving}
                  className="min-w-[180px] bg-white px-3 py-2 rounded-xl border border-gray-200 text-sm inline-flex items-center justify-between gap-3 hover:bg-black/5 disabled:opacity-60"
                >
                  <span>
                    {customMode === "TOTAL"
                      ? "One-time (TOTAL)"
                      : "Recurring (EVERY)"}
                  </span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                {isModeMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl p-2 min-w-[220px] z-20 animate-fade-in">
                    <OutsideClickHandler
                      onOutsideClick={() => setIsModeMenuOpen(false)}
                    >
                      {[
                        { value: "TOTAL", label: "One-time (TOTAL)" },
                        { value: "EVERY", label: "Recurring (EVERY)" },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setCustomMode(item.value);
                            setIsModeMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors ${
                            customMode === item.value
                              ? "bg-black text-white font-medium hover:bg-gray-800"
                              : "hover:bg-black/5 hover:shadow-sm"
                          }`}
                        >
                          {customMode === item.value ? (
                            <Check size={14} />
                          ) : (
                            <span className="w-[14px]" />
                          )}
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </OutsideClickHandler>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={saving}
                className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-black text-white disabled:opacity-60"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-semibold mb-2">Current Alerts</h5>

              {customThresholds.map((item) => {
                const id = item?._id || item?.id;
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-gray-200 bg-white"
                  >
                    <span className="text-sm">
                      {Number(item?.percent) >= 0 ? "+" : ""}
                      {item?.percent}% ({item?.mode})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={saving}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              {customThresholds.length === 0 && (
                <p className="text-xs text-gray-500">
                  No custom thresholds yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
