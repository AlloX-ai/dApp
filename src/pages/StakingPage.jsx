import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Info, HelpCircle, Gem, Lock } from "lucide-react";
import {
  addStakedPool,
  setSelectedStaking,
  setStakingAmount,
} from "../redux/slices/stakingSlice";
import StakeFAQModal from "../components/StakeFAQModal";

const MIN_DEPOSIT = 0.001;

export function StakingPage() {
  const dispatch = useDispatch();
  const { stakingAmount, stakedPools } = useSelector((state) => state.staking);
  const [modalOpen, setModalOpen] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState("7.00");
  const [faqModalOpen, setFaqModalOpen] = useState(false);

  const stakingOptions = [
    {
      id: 1,
      name: "BNB Chain",
      protocol: "Aerodrome Finance",
      token: "BNB",
      apy: 5,
      lockPeriod: "Flexible",
      lockDays: 0,
      color: "from-blue-400 to-blue-600",
      userBalance: "1,200",
      totalEarnings: 0.260997,
      totalStaked: 1,
      icon: "https://cdn.allox.ai/allox/tokens/aero.svg",
    },
    {
      id: 2,
      name: "Solana",
      protocol: "Virtual Protocol",
      token: "SOL",
      apy: 10,
      lockPeriod: "7 days",
      lockDays: 7,
      color: "from-purple-400 to-purple-600",
      userBalance: "850",
      totalEarnings: 127,
      totalStaked: 100,
      icon: "https://cdn.allox.ai/allox/tokens/virtual.svg",
    },
    {
      id: 3,
      name: "Ethereum",
      protocol: "Lido Finance",
      token: "ETH",
      apy: 15,
      lockPeriod: "30 days",
      lockDays: 0,
      color: "from-cyan-400 to-cyan-600",
      userBalance: "2.45",
      icon: "https://cdn.allox.ai/allox/tokens/prime.svg",
    },
  ];
  let selectedStaking = stakingOptions[1];
  const handleStake = (option) => {
    dispatch(setSelectedStaking(option));
    dispatch(setStakingAmount(""));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    dispatch(setSelectedStaking(null));
    dispatch(setStakingAmount(""));
  };

  const handleMax = () => {
    if (selectedStaking) {
      dispatch(setStakingAmount(selectedStaking.userBalance));
    }
  };

  const handleConfirmStaking = () => {
    if (!selectedStaking || !stakingAmount) return;
    const amount = parseFloat(stakingAmount) || 0;
    if (amount < MIN_DEPOSIT) return;

    const newStakedPool = {
      id: Date.now(),
      name: selectedStaking.name,
      protocol: selectedStaking.protocol,
      token: selectedStaking.token,
      amountStaked: stakingAmount,
      apy: selectedStaking.apy,
      lockDaysRemaining: selectedStaking.lockDays,
      currentRewards: "0",
      estimatedTotalRewards: ((amount * selectedStaking.apy) / 100).toFixed(2),
      color: selectedStaking.color,
    };

    dispatch(addStakedPool(newStakedPool));
    dispatch(setStakingAmount(""));
  };

  const unlockLabel = selectedStaking?.lockDays
    ? `${selectedStaking.lockDays}d:2h:38m`
    : "0d:0h:0m";
  const isUnlocked = selectedStaking?.lockDays === 0;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Staking";
  }, []);

  return (
    <div className="flex-1 px-6 py-8 portfolio-wrapper ms-auto w-full overflow-y-auto">
      <div className="flex flex-row justify-between gap-2 align-center mb-6">
        <h2 className="text-3xl font-bold">Staking</h2>
        <button
          onClick={() => setFaqModalOpen(true)}
          className="bg-white h-fit rounded-full hover:bg-gray-200 transition-colors px-3 py-2 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
        >
          <Gem size={16} className="text-purple-600" />
          <span className="font-medium">Gems Rewards Info</span>
        </button>
      </div>

      {/* <h3 className="text-xl font-bold mb-4">Staking Opportunities</h3> */}
      <div className="grid md:grid-cols-3 gap-6">
        {stakingOptions.map((option) => (
          <div
            key={option.id}
            className="glass-card h-fit p-6 transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50 flex flex-col gap-4"
          >
            {/* Card Info Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${option.color} rounded-xl`}
                  ></div>
                  <div>
                    <h3 className="font-bold">{option.name}</h3>
                    <p className="text-sm text-gray-600">{option.protocol}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-sm text-gray-600 mb-1">APY</div>
                  <div className="text-2xl font-bold text-green-600">
                    {option.apy}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Lock Period</div>
                  <div className="font-medium">{option.lockPeriod}</div>
                </div>
              </div>
            </div>

            {/* Stake Section */}
            <div className="border-t border-gray-200/50 pt-6">
              {/* <h4 className="font-semibold mb-4">Stake Tokens</h4> */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Available Balance</span>
                  <span className="font-medium">1,250.00 {option.token}</span>
                </div>

                <div className="mt-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div className="flex justify-end gap-2 text-sm">
                  <span className="text-gray-600">Approved Amount</span>
                  <span className="font-medium">1,000.00 {option.token}</span>
                </div>
                <div className="flex justify-between text-sm bg-purple-50 p-3 rounded-lg">
                  <span className="text-gray-600">Estimated Rewards</span>
                  <span className="font-semibold text-purple-600">
                    ~125.00 {option.token}
                  </span>
                </div>
                <button
                  // onClick={() => handleStake(option)}
                  className="btn-primary w-full transition-all duration-200 hover:shadow-lg mt-2"
                >
                  Stake {option.token}
                </button>
              </div>
            </div>
            {option.id === 1 && (
              <>
                {/* Claim/Reinvest Section */}
                <div className="border-t border-gray-200/50 pt-3">
                  <h4 className="font-semibold mb-4">My Rewards</h4>
                  <div className="space-y-3">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-0 justify-between items-start md:items-center bg-green-50 p-3 rounded-xl">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">
                          Total Earned
                        </div>
                        <div className="text-xl font-bold text-green-600 flex items-center gap-2">
                          0.042 BNB
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 w-full md:w-fit">
                        <button className="px-4 py-2 rounded-xl bg-transparent border border-black text-black font-medium hover:bg-black transition-colors hover:text-white duration-200 hover:shadow-lg">
                          Claim
                        </button>
                        <button className="px-4 py-2 rounded-xl bg-transparent border border-black text-black font-medium hover:bg-black transition-colors hover:text-white duration-200 hover:shadow-lg">
                          Reinvest
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Withdraw Section */}
                <div className="border-t border-gray-200/50 pt-3">
                  <div className="flex justify-between items-center gap-2">
                    <h4 className="font-semibold mb-4">Withdraw</h4>
                    <div className="flex justify-between text-sm gap-2">
                      <span className="text-gray-600">Staked</span>
                      <span className="font-medium">500.00 {option.token}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-orange-50 p-3 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                      <div>
                        <div className="text-sm text-gray-600 ">
                          Time Until Unlock
                        </div>
                        <div className="text-lg font-bold text-orange-600">
                          12d 5h 23m
                        </div>{" "}
                      </div>
                      <div className="flex flex-col gap-2 w-full md:w-fit">
                        <button
                          disabled
                          className="w-full px-4 py-2 rounded-xl flex items-center gap-2 bg-gray-200 text-gray-500 font-medium cursor-not-allowed"
                        >
                          <Lock size={18} /> Withdraw
                        </button>
                      </div>
                    </div>
                  </div>
                </div>{" "}
              </>
            )}
          </div>
        ))}
      </div>

      {modalOpen && selectedStaking && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
          aria-hidden
        >
          <div
            className="rounded-2xl bg-white max-w-lg w-full p-8 relative animate-fade-in"
            role="dialog"
            aria-labelledby="staking-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/5 text-gray-500 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2
              id="staking-modal-title"
              className="text-xl font-bold mb-6 pr-8"
            >
              Deposit
            </h2>

            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-600 mb-3">
                Deposit
              </h3>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Wallet Balance</label>
                  <span className="text-sm text-gray-600">
                    {selectedStaking.userBalance} {selectedStaking.token}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={stakingAmount}
                  onChange={(e) => dispatch(setStakingAmount(e.target.value))}
                  placeholder={`Minimum ${MIN_DEPOSIT} ${selectedStaking.token}`}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white/80 transition-all"
                />
                <button
                  type="button"
                  onClick={handleMax}
                  className="px-4 py-3 rounded-xl bg-white/60 border border-gray-200/50 hover:bg-white/80 font-medium text-gray-900 transition-all"
                >
                  Max
                </button>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">
                  Lock Time
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button className="py-3 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200">
                    Flexible
                  </button>
                  <button className="py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 hover:shadow-lg transition-all duration-200">
                    7 days
                  </button>
                  <button className="py-3 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200">
                    30 days
                  </button>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl my-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    Estimated Rewards (1 year)
                  </span>
                  <span className="font-bold text-green-600">
                    +
                    {(
                      ((parseFloat(stakingAmount) || 0) * selectedStaking.apy) /
                      100
                    ).toFixed(2)}{" "}
                    {selectedStaking.token}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">APY</span>
                  <span className="font-bold text-green-600">
                    {selectedStaking.apy}%
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmStaking}
                disabled={
                  !stakingAmount || parseFloat(stakingAmount) < MIN_DEPOSIT
                }
                className="w-full py-3 rounded-2xl font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Stake
              </button>
            </section>

            {selectedStaking.totalEarnings && (
              <>
                <section className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-600">
                      Earnings
                    </h3>
                    <button
                      type="button"
                      className="p-0.5 rounded-full hover:bg-black/5 text-gray-500"
                      aria-label="Earnings info"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-2xl font-semibold text-green-600 mb-3">
                    {selectedStaking.totalEarnings.toFixed(6)}{" "}
                    {selectedStaking.token}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 py-3 rounded-2xl font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Claim
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white/60 hover:bg-white/80 font-medium text-gray-900 transition-all"
                    >
                      Reinvest
                    </button>
                  </div>
                </section>

                <section className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">
                    My Deposit
                  </h3>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-amber-600 font-medium">
                      Unlocks in {unlockLabel}
                    </span>
                    <button
                      type="button"
                      disabled={!isUnlocked}
                      className="py-2.5 px-4 rounded-xl border border-gray-200 bg-white/60 hover:bg-white/80 font-medium text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Withdraw
                    </button>
                  </div>
                  {selectedStaking.totalStaked > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Staked: {selectedStaking.totalStaked}{" "}
                      {selectedStaking.token}
                    </p>
                  )}
                </section>

                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Info className="w-4 h-4" />
                  Details
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <StakeFAQModal
        isOpen={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
      />
    </div>
  );
}
