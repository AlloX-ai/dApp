import { useDispatch, useSelector } from "react-redux";
import {
  addStakedPool,
  setSelectedStaking,
  setStakingAmount,
} from "../redux/slices/stakingSlice";

export function StakingPage() {
  const dispatch = useDispatch();
  const { selectedStaking, stakingAmount, stakedPools } = useSelector(
    (state) => state.staking,
  );

  const stakingOptions = [
    {
      id: 1,
      name: "AERO Staking",
      protocol: "Aerodrome Finance",
      token: "AERO",
      apy: 18.5,
      lockPeriod: "Flexible",
      lockDays: 0,
      color: "from-blue-400 to-blue-600",
      userBalance: "1,200",
    },
    {
      id: 2,
      name: "VIRTUAL Staking",
      protocol: "Virtual Protocol",
      token: "VIRTUAL",
      apy: 22.3,
      lockPeriod: "7 days",
      lockDays: 7,
      color: "from-purple-400 to-purple-600",
      userBalance: "850",
    },
    {
      id: 3,
      name: "ETH Staking",
      protocol: "Lido Finance",
      token: "ETH",
      apy: 4.2,
      lockPeriod: "Flexible",
      lockDays: 0,
      color: "from-cyan-400 to-cyan-600",
      userBalance: "2.45",
    },
  ];

  const handleStake = (stakingOption) => {
    dispatch(setSelectedStaking(stakingOption));
  };

  const handleConfirmStaking = () => {
    if (!selectedStaking || !stakingAmount) return;

    const newStakedPool = {
      id: Date.now(),
      name: selectedStaking.name,
      protocol: selectedStaking.protocol,
      token: selectedStaking.token,
      amountStaked: stakingAmount,
      apy: selectedStaking.apy,
      lockDaysRemaining: selectedStaking.lockDays,
      currentRewards: "0",
      estimatedTotalRewards: (
        ((parseFloat(stakingAmount) || 0) * selectedStaking.apy) /
        100
      ).toFixed(2),
      color: selectedStaking.color,
    };

    dispatch(addStakedPool(newStakedPool));
    dispatch(setSelectedStaking(null));
    dispatch(setStakingAmount(""));
  };

  if (stakedPools.length > 0) {
    return (
      <div className="flex-1 px-6 py-8 max-w-[1200px] mx-auto w-full overflow-y-auto">
        <h2 className="text-3xl font-bold mb-6">Active Staking</h2>

        <div className="max-w-2xl space-y-4">
          {stakedPools.map((pool) => (
            <div
              key={pool.id}
              className="glass-card p-8 transition-all duration-200 hover:bg-white/80 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${pool.color} rounded-2xl`}
                ></div>
                <div>
                  <h3 className="text-2xl font-bold">{pool.name}</h3>
                  <p className="text-gray-600">{pool.protocol}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Staked</span>
                  <span className="font-bold">
                    {pool.amountStaked} {pool.token}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lock Time Remaining</span>
                  <span className="font-bold">
                    {pool.lockDaysRemaining === 0
                      ? "Flexible"
                      : `${pool.lockDaysRemaining} days`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Rewards</span>
                  <span className="font-bold text-green-600">
                    +{pool.currentRewards} {pool.token}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">APY</span>
                  <span className="font-bold text-green-600">{pool.apy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Total Rewards</span>
                  <span className="font-bold text-green-600">
                    +{pool.estimatedTotalRewards} {pool.token}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="btn-primary flex-1 transition-all duration-200 hover:shadow-lg">
                  Claim Rewards
                </button>
                <button
                  disabled={pool.lockDaysRemaining > 0}
                  className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                >
                  {pool.lockDaysRemaining > 0
                    ? "Withdraw (Locked)"
                    : "Withdraw"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-8 max-w-[1200px] mx-auto w-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Staking Opportunities</h2>

      {!selectedStaking && (
        <div className="grid md:grid-cols-2 gap-6">
          {stakingOptions.map((option) => (
            <div
              key={option.id}
              className="glass-card p-6 transition-all duration-200 hover:bg-white/80 hover:shadow-lg hover:border hover:border-gray-200/50"
            >
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
              <div className="flex justify-between items-end mb-4">
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
              <button
                onClick={() => handleStake(option)}
                className="btn-primary w-full transition-all duration-200 hover:shadow-lg"
              >
                Stake {option.token}
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedStaking && (
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => dispatch(setSelectedStaking(null))}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6 transition-colors duration-200"
          >
            ← Back to Staking Options
          </button>

          <div className="glass-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-16 h-16 bg-gradient-to-br ${selectedStaking.color} rounded-2xl`}
              ></div>
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedStaking.name}
                </h2>
                <p className="text-gray-600">{selectedStaking.protocol}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Wallet Balance</label>
                  <span className="text-sm text-gray-600">
                    {selectedStaking.userBalance} {selectedStaking.token}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Amount to Stake
                </label>
                <input
                  type="text"
                  value={stakingAmount}
                  onChange={(e) => dispatch(setStakingAmount(e.target.value))}
                  placeholder={`Enter ${selectedStaking.token} amount`}
                  className="w-full px-4 py-4 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white/80 transition-all duration-200"
                />
                <button
                  onClick={() =>
                    dispatch(setStakingAmount(selectedStaking.userBalance))
                  }
                  className="text-sm text-blue-600 hover:underline mt-2 transition-all duration-200"
                >
                  Use Max
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

              <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
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
                onClick={handleConfirmStaking}
                disabled={!stakingAmount}
                className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl"
              >
                Confirm Staking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
