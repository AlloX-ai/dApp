import { useEffect, useState } from "react";
import {
  Copy,
  Check,
  Users,
  Gem,
  Calendar,
  Info,
  X,
  Coins,
  Sparkles,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Staking pools
const STAKING_POOLS = [
  { id: "ETH60", name: "ETH Pool", lockDays: 60 },
  { id: "ETH30", name: "ETH Pool", lockDays: 30 },
  { id: "BTC90", name: "BTC Pool", lockDays: 90 },
  { id: "USDT30", name: "USDT Pool", lockDays: 30 },
];

export function ReferralsPage() {
  const [isActivated, setIsActivated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPool, setSelectedPool] = useState("");
  const [dateFilter, setDateFilter] = useState("30d");
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showTiersModal, setShowTiersModal] = useState(false);
  const [showPoolLinkModal, setShowPoolLinkModal] = useState(false);

  // Mock data
  const referralCode = "ALX-USER-9F3K7";
  const baseReferralLink = `https://allox.ai/ref/${referralCode}`;

  // Summary stats
  const totalGems = 127.5;
  const totalPoints = 12540;

  // Registrations data
  const [registrations] = useState([
    {
      id: 1,
      wallet: "0xa542...fb53a",
      registeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      hasActivatedReferral: true,
    },
    {
      id: 2,
      wallet: "0x7d8f...c421e",
      registeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      hasActivatedReferral: true,
    },
    {
      id: 3,
      wallet: "0x9c3a...d892f",
      registeredDate: new Date(Date.now() - 1000 * 60 * 60 * 12),
      hasActivatedReferral: false,
    },
    {
      id: 4,
      wallet: "0x2b4e...a1c7d",
      registeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
      hasActivatedReferral: true,
    },
    {
      id: 5,
      wallet: "0x5f1c...b984a",
      registeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
      hasActivatedReferral: true,
    },
    {
      id: 6,
      wallet: "0x8d6b...e372c",
      registeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
      hasActivatedReferral: false,
    },
    {
      id: 7,
      wallet: "0x1a9f...c2e4b",
      registeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      hasActivatedReferral: false,
    },
    {
      id: 8,
      wallet: "0x4c7d...a8f3e",
      registeredDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
      hasActivatedReferral: true,
    },
  ]);

  // Completed actions data
  const [completedActions] = useState([
    {
      id: 1,
      wallet: "0xa542...fb53a",
      type: "direct",
      pool: "ETH Pool",
      lockPeriod: "60 days",
      gemsEarned: 5,
      pointsEarned: 1250,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      id: 2,
      wallet: "0x7d8f...c421e",
      type: "direct",
      pool: "BTC Pool",
      lockPeriod: "90 days",
      gemsEarned: 10,
      pointsEarned: 2800,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
    {
      id: 3,
      wallet: "0x7d8f...c421e",
      type: "network",
      gemsEarned: 12.5,
      pointsEarned: 950,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    },
    {
      id: 4,
      wallet: "0x9c3a...d892f",
      type: "direct",
      pool: "ETH Pool",
      lockPeriod: "30 days",
      gemsEarned: 1,
      pointsEarned: 400,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10),
    },
    {
      id: 5,
      wallet: "0x5f1c...b984a",
      type: "direct",
      pool: "USDT Pool",
      lockPeriod: "30 days",
      gemsEarned: 5,
      pointsEarned: 1100,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
    },
    {
      id: 6,
      wallet: "0x5f1c...b984a",
      type: "network",
      gemsEarned: 8.5,
      pointsEarned: 720,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
    {
      id: 7,
      wallet: "0x2b4e...a1c7d",
      type: "direct",
      pool: "ETH Pool",
      lockPeriod: "60 days",
      gemsEarned: 5,
      pointsEarned: 1350,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    },
    {
      id: 8,
      wallet: "0x2b4e...a1c7d",
      type: "network",
      gemsEarned: 6.5,
      pointsEarned: 580,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
    },
  ]);

  const handleCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }

    document.body.removeChild(textArea);
  };

  const handleActivate = () => {
    setIsActivated(true);
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getFilteredData = (data) => {
    const now = Date.now();
    let timeLimit = 0;

    if (dateFilter === "7d") {
      timeLimit = now - 7 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === "30d") {
      timeLimit = now - 30 * 24 * 60 * 60 * 1000;
    }

    return data.filter((item) => {
      const itemDate = item.registeredDate || item.timestamp;
      if (!itemDate) return true;
      return itemDate.getTime() >= timeLimit;
    });
  };

  const filteredRegistrations = getFilteredData(registrations);
  const filteredActions = getFilteredData(completedActions);

  const getPoolSpecificLink = () => {
    if (!selectedPool) return baseReferralLink;
    const pool = STAKING_POOLS.find((p) => p.id === selectedPool);
    if (!pool) return baseReferralLink;
    return `https://app.allox.ai/staking?pool=${pool.id}&ref=${referralCode}`;
  };

  const handleDownloadCSV = () => {
    // Prepare CSV data
    const csvRows = [];

    // Headers
    csvRows.push("Type,Wallet,Details,Gems Earned,Points Earned,Date");

    // Add registrations
    filteredRegistrations.forEach((reg) => {
      const date = reg.registeredDate.toLocaleString();
      csvRows.push(`Registration,${reg.wallet},-,-,-,${date}`);
    });

    // Add completed actions
    filteredActions.forEach((action) => {
      const date = action.timestamp.toLocaleString();
      const details =
        action.type === "direct"
          ? `${action.pool} - ${action.lockPeriod}`
          : "Network - 5% earnings";
      csvRows.push(
        `${action.type === "direct" ? "Direct" : "Network"},${action.wallet},${details},${action.gemsEarned},${action.pointsEarned},${date}`,
      );
    });

    // Create CSV content
    const csvContent = csvRows.join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `allox-referrals-${dateFilter}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Referral";
  }, []);

  return (
    <div className="space-y-6 flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      {!isActivated ? (
        // Landing Page - Before Activation
        <>
          {/* Header with buttons in top right */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Referral Program</h2>
              <p className="text-gray-600 text-sm">
                Invite friends to stake and earn more Gems over time.
              </p>
            </div>

            {/* Info Buttons - Top Right */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowBenefitsModal(true)}
                className="glass-card px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <Info size={14} className="text-blue-600" />
                <span className="font-medium">Program Benefits</span>
              </button>
              <button
                onClick={() => setShowTiersModal(true)}
                className="glass-card px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <Gem size={14} className="text-purple-600" />
                <span className="font-medium">How Rewards Work</span>
              </button>
            </div>
          </div>

          {/* Benefits Table */}
          <div className="glass-card p-6 overflow-x-auto border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              Benefits
            </h3>
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-3 text-sm font-semibold">
                    Benefit
                  </th>
                  <th className="text-center py-3 px-3 text-sm font-semibold bg-green-100 border-l-2 border-r border-green-200">
                    <div className="flex items-center justify-center gap-1.5">
                      <Users size={14} className="text-green-700" />
                      <span className="text-green-800">Direct Referral</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-3 text-sm font-semibold bg-blue-100 border-r-2 border-blue-200">
                    <div className="flex items-center justify-center gap-1.5">
                      <Sparkles size={14} className="text-blue-700" />
                      <span className="text-blue-800">Network Referral</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-3 text-sm">
                    Earn Gems from first valid staking action
                  </td>
                  <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                  <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-3 text-sm">30 day cookie tracking</td>
                  <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                  <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-3 text-sm">
                    Anti-fraud and wallet validation
                  </td>
                  <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                  <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-3 text-sm">
                    Visible in referral dashboard
                  </td>
                  <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                  <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-3 text-sm">
                    Unlimited earning duration
                  </td>
                  <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                  <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-3 text-sm">
                    Earn from referral's own users
                  </td>
                  <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                    <X className="inline text-gray-300" size={18} />
                  </td>
                  <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 text-sm">
                    5% of lifetime earnings from referral network
                  </td>
                  <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                    <X className="inline text-gray-300" size={18} />
                  </td>
                  <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                    <Check className="inline text-green-500" size={18} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CTA */}
          <div className="text-center">
            <button
              onClick={handleActivate}
              className="bg-black text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors mb-2"
            >
              Activate
            </button>
            <p className="text-xs text-gray-500">
              Activating creates your unique referral link and unlocks your
              referral dashboard.
            </p>
          </div>
        </>
      ) : (
        // Dashboard - After Activation
        <>
          {/* Header with buttons in top right */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Referral Dashboard</h2>
              <p className="text-gray-600 text-sm">
                Track your referrals and earnings
              </p>
            </div>

            {/* Info Buttons - Top Right */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowBenefitsModal(true)}
                className="glass-card px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <Info size={14} className="text-blue-600" />
                <span className="font-medium">Program Benefits</span>
              </button>
              <button
                onClick={() => setShowTiersModal(true)}
                className="glass-card px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
              >
                <Gem size={14} className="text-purple-600" />
                <span className="font-medium">How Rewards Work</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 md:grid-cols-2 gap-4">
            <div className="glass-card p-5 flex">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Gem size={20} className="text-purple-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-600">Total Gems</div>
                  <div className="text-2xl font-bold">{totalGems}</div>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 flex">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Coins size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-600">Total Points</div>
                  <div className="text-2xl font-bold">
                    {totalPoints.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="font-bold text-sm mb-3">Your Referral Link</h3>
              <div className="flex gap-2 relative">
                <input
                  type="text"
                  value={baseReferralLink}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-xs font-mono"
                />
                <button
                  onClick={() => handleCopy(baseReferralLink)}
                  className="px-3 absolute right-0 h-full py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center gap-1.5 whitespace-nowrap text-xs"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Pool-Specific Link */}
            <div className="glass-card p-5">
              <h3 className="font-bold text-sm mb-3">Pool Specific Link</h3>
              <button
                onClick={() => setShowPoolLinkModal(true)}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-600 font-medium text-xs"
              >
                <Sparkles size={14} />
                <span>Create Pool Link</span>
              </button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Activity</h3>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <button
                onClick={handleDownloadCSV}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download as CSV"
              >
                <Download size={16} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Two Tables Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] max-h-[350px] gap-4">
            {/* Left Table: Registrations */}
            <div className="glass-card p-5">
              <h3 className="font-bold text-sm mb-4">Registrations</h3>

              <div className="overflow-auto max-h-[500px]">
                {filteredRegistrations.length > 0 ? (
                  <div className="space-y-2">
                    {filteredRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                          reg.hasActivatedReferral
                            ? "border-2 border-blue-300 bg-blue-50/50 hover:bg-blue-100/50"
                            : "border border-transparent hover:bg-gray-50"
                        }`}
                      >
                        <span className="font-mono text-xs">{reg.wallet}</span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(reg.registeredDate)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Users size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No registrations yet.</p>
                  </div>
                )}
              </div>

              {/* Legend */}
              {filteredRegistrations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-4 h-4 border-2 border-blue-300 bg-blue-50 rounded"></div>
                    <span>Network active (can earn from their referrals)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-4 h-4 border border-gray-300 bg-gray-100 rounded"></div>
                    <span>Not yet activated</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Table: Completed Actions */}
            <div className="glass-card p-5">
              <h3 className="font-bold text-sm mb-4">Completed Actions</h3>

              <div className="overflow-auto max-h-[450px]">
                {filteredActions.length > 0 ? (
                  <div className="space-y-2">
                    {filteredActions.map((action) => (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-lg border transition-colors ${
                          action.type === "network"
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-mono text-xs font-semibold truncate">
                                {action.wallet}
                              </span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                  action.type === "network"
                                    ? "bg-blue-200 text-blue-800"
                                    : "bg-green-200 text-green-800"
                                }`}
                              >
                                {action.type === "network"
                                  ? "Network"
                                  : "Direct"}
                              </span>
                            </div>

                            {action.type === "direct" ? (
                              <div className="text-xs text-gray-600">
                                {action.pool}, {action.lockPeriod}
                              </div>
                            ) : (
                              <div className="text-xs text-blue-700">
                                5% of their earnings
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 ml-2">
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 border border-purple-200 rounded">
                              <Gem size={10} className="text-purple-600" />
                              <span className="text-xs font-bold text-purple-700">
                                +{action.gemsEarned}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 border border-blue-200 rounded">
                              <Coins size={10} className="text-blue-600" />
                              <span className="text-xs font-bold text-blue-700">
                                +{action.pointsEarned}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(action.timestamp)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Gem size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No completed actions yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Benefits Modal */}
      <AnimatePresence>
        {showBenefitsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Program Benefits</h2>
                <button
                  onClick={() => setShowBenefitsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-3 px-3 text-sm font-semibold">
                          Benefit
                        </th>
                        <th className="text-center py-3 px-3 text-sm font-semibold bg-green-100 border-l-2 border-r border-green-200">
                          <div className="flex items-center justify-center gap-1.5">
                            <Users size={14} className="text-green-700" />
                            <span className="text-green-800">
                              Direct Referral
                            </span>
                          </div>
                        </th>
                        <th className="text-center py-3 px-3 text-sm font-semibold bg-blue-100 border-r-2 border-blue-200">
                          <div className="flex items-center justify-center gap-1.5">
                            <Sparkles size={14} className="text-blue-700" />
                            <span className="text-blue-800">
                              Network Referral
                            </span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-3 text-sm">
                          Earn Gems from first valid staking action
                        </td>
                        <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                        <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-3 text-sm">
                          30 day cookie tracking
                        </td>
                        <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                        <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-3 text-sm">
                          Anti-fraud and wallet validation
                        </td>
                        <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                        <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-3 text-sm">
                          Visible in referral dashboard
                        </td>
                        <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                        <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-3 text-sm">
                          Unlimited earning duration
                        </td>
                        <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                        <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-3 text-sm">
                          Earn from referral's own users
                        </td>
                        <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                          <X className="inline text-gray-300" size={18} />
                        </td>
                        <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 text-sm">
                          5% of lifetime earnings from referral network
                        </td>
                        <td className="py-3 px-3 text-center bg-green-50/50 border-l-2 border-r border-green-100">
                          <X className="inline text-gray-300" size={18} />
                        </td>
                        <td className="py-3 px-3 text-center bg-blue-50/50 border-r-2 border-blue-100">
                          <Check className="inline text-green-500" size={18} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tiers Modal */}
      <AnimatePresence>
        {showTiersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">How Rewards Work</h2>
                <button
                  onClick={() => setShowTiersModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <h3 className="font-bold mb-2">Direct Referral Rewards</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Earn Gems based on your referral's first valid staking action:
                </p>

                <div className="grid grid-cols-1 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-blue-900 mb-0.5">
                          Tier A
                        </div>
                        <div className="text-xs text-blue-600">
                          $1 - $100 staked
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/70 rounded-lg">
                          <Gem size={14} className="text-purple-600" />
                          <span className="text-sm font-bold text-gray-900">
                            1
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/70 rounded-lg">
                          <Coins size={14} className="text-blue-600" />
                          <span className="text-sm font-bold text-gray-900">
                            250
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-purple-900 mb-0.5">
                          Tier B
                        </div>
                        <div className="text-xs text-purple-600">
                          $101 - $1,000 staked
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/70 rounded-lg">
                          <Gem size={14} className="text-purple-600" />
                          <span className="text-sm font-bold text-gray-900">
                            5
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/70 rounded-lg">
                          <Coins size={14} className="text-blue-600" />
                          <span className="text-sm font-bold text-gray-900">
                            1,250
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-amber-900 mb-0.5">
                          Tier C
                        </div>
                        <div className="text-xs text-amber-600">
                          Over $1,000 staked
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/70 rounded-lg">
                          <Gem size={14} className="text-purple-600" />
                          <span className="text-sm font-bold text-gray-900">
                            10
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/70 rounded-lg">
                          <Coins size={14} className="text-blue-600" />
                          <span className="text-sm font-bold text-gray-900">
                            2,500
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="font-bold mb-2">Network Referral Rewards</h3>
                <p className="text-gray-600 text-sm mb-3">
                  When your direct referral activates their own referrals and
                  starts earning, you receive:
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
                      <Users size={16} className="text-blue-700" />
                    </div>
                    <div className="font-bold text-blue-900">
                      5% of Their Earnings
                    </div>
                  </div>
                  <p className="text-sm text-blue-700">
                    You earn 5% of the Gems and Points your network referral
                    earns from their own direct referrals.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pool Link Modal */}
      <AnimatePresence>
        {showPoolLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full"
            >
              <div className="border-b border-gray-200 p-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Create Pool-Specific Link</h2>
                <button
                  onClick={() => setShowPoolLinkModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <p className="text-sm text-gray-600 mb-4">
                  Route your invitees directly to a specific staking pool for
                  higher conversion.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Step 1: Choose a Staking Pool
                  </label>
                  <select
                    value={selectedPool}
                    onChange={(e) => setSelectedPool(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option value="">Select a pool...</option>
                    {STAKING_POOLS.map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.name} - {pool.lockDays} days
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Step 2: Copy Pool-Specific Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={getPoolSpecificLink()}
                      readOnly
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-mono"
                    />
                    <button
                      onClick={() => handleCopy(getPoolSpecificLink())}
                      className="px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-sm font-medium text-blue-900 mb-1.5">
                    💡 How it works
                  </div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>
                      • Your invitee lands directly on the selected staking pool
                    </div>
                    <div>
                      • They must complete their first valid stake to activate
                      rewards
                    </div>
                    <div>
                      • You earn Gems and Points based on their staking tier
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
