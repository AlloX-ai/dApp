import { X, X as CloseIcon, Info, TrendingUp, Gem } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// FAQ Modal Component
export default function StakeFAQModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold">Gems Rewards System</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Everything you need to know
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                    >
                        <CloseIcon size={20} className="text-gray-600" />
                    </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="p-6 space-y-6  overflow-y-auto max-h-[calc(80vh-88px)]">
                    {/* Overview */}
                    <div className="">
                        <h3 className="font-bold text-lg mb-3 text-gray-900">
                            How It Works
                        </h3>
                        <p className="text-gray-700 text-sm leading-relaxed">
                            Earn Gems by staking tokens in pools with lock periods. The number
                            of Gems you earn depends on your lock duration and total staked
                            value.
                        </p>
                    </div>

                    {/* Lock Period Requirements */}
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-gray-900">
                            Lock Period Requirements
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <X size={16} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">
                                        Flexible Staking
                                    </div>
                                    <div className="text-sm text-gray-600">No Gems earned</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm">
                                    30
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">
                                        30 Days Lock
                                    </div>
                                    <div className="text-sm text-gray-600">Gems rewarded</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm">
                                    90
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">
                                        90 Days Lock
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Higher Gems rewards
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-xs">
                                    180
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">
                                        180 Days Lock
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Maximum Gems rewards
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Staking Tiers */}
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-gray-900">
                            Staking Tiers & Rewards
                        </h3>
                        <div className=" mb-4">
                            {/* <div className="flex items-center gap-2 mb-2">
                                <Info size={16} className="text-orange-600" />
                                <span className="font-semibold text-orange-900 text-sm">Important:</span>
                            </div> */}
                            <p className="text-sm text-gray-700">
                                Rewards are based on your total staked value, not individual
                                deposits. Gems are awarded only when you cross new tier
                                thresholds.
                            </p>
                        </div>

                        {/* Tier Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="text-left py-3 px-4 font-bold text-gray-900">
                                            Tier
                                        </th>
                                        <th className="text-left py-3 px-4 font-bold text-gray-900">
                                            Staked Value
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold text-gray-900">
                                            30 Days
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold text-gray-900">
                                            90 Days
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold text-gray-900">
                                            180 Days
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4 font-semibold text-gray-900">
                                            Tier A
                                        </td>
                                        <td className="py-3 px-4 text-gray-700">$10 - $100</td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                                            <div className="justify-center flex gap-2">
                                                5 <Gem className="text-purple-600" />
                                            </div>{" "}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                                            <div className="justify-center flex gap-2">
                                                {" "}
                                                10 <Gem className="text-purple-600" />
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                                            <div className="justify-center flex gap-2">
                                                {" "}
                                                15 <Gem className="text-purple-600" />
                                            </div>{" "}
                                        </td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4 font-semibold text-gray-900">
                                            Tier B
                                        </td>
                                        <td className="py-3 px-4 text-gray-700">$101 - $1,000</td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                                            <div className="justify-center flex gap-2">
                                                {" "}
                                                10 <Gem className="text-purple-600" />
                                            </div>{" "}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                                            <div className="justify-center flex gap-2">
                                                {" "}
                                                20 <Gem className="text-purple-600" />
                                            </div>{" "}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                                            <div className="justify-center flex gap-2">
                                                {" "}
                                                30 <Gem className="text-purple-600" />
                                            </div>{" "}
                                        </td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4 font-semibold text-gray-900">
                                            Tier C
                                        </td>
                                        <td className="py-3 px-4 text-gray-700">$1,000+</td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                                            <div className="justify-center flex gap-2">
                                                20 <Gem className="text-purple-600" />
                                            </div>{" "}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                                            <div className="justify-center flex gap-2">
                                                {" "}
                                                30 <Gem className="text-purple-600" />
                                            </div>{" "}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                                            <div className="justify-center flex gap-2">
                                                60 <Gem className="text-purple-600" />
                                            </div>{" "}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Tier C Growth */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-200">
                        <div className="flex items-start gap-3">
                            {/* <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <TrendingUp size={20} className="text-white" />
                            </div> */}
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 mb-2">
                                    Tier C Growth Rewards
                                </h4>
                                <p className="text-sm text-gray-700 mb-2">
                                    After reaching Tier C, you can continue earning additional
                                    Gems as your stake increases.
                                </p>
                                <div className="bg-white/60 p-3 rounded-lg">
                                    <div className="flex gap-2 items-baseline">
                                        <div className="font-semibold text-indigo-900 text-sm mb-1">
                                            Reward Rate:
                                        </div>

                                        <strong className="flex items-center text-indigo-700">
                                            +<Gem className="text-purple-600 mx-1" size={14} /> Tier C Rate
                                        </strong>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        for every additional
                                        <strong className="mx-1">$5,000</strong> increase in total
                                        stake
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Example */}
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-5 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            {/* <span className="text-lg">💡</span> */}
                            Example Scenario
                        </h4>
                        <div className="space-y-2 text-sm text-gray-700">
                            <div className="flex items-start gap-2">
                                <span className="text-purple-600 mt-1">→</span>
                                <span>
                                    You stake <strong>$12,000</strong> in a 30-day pool
                                </span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-purple-600 mt-1">→</span>
                                <span className="flex sm:flex-row flex-col sm:items-center items-start">
                                    You cross:
                                    <span className="flex">
                                        <span className="flex items-center">
                                            Tier A (5 <Gem className="text-purple-600" size={14} />)
                                        </span>{" "}
                                        +{" "}
                                        <span className="flex items-center">
                                            Tier B (10 <Gem className="text-purple-600" size={14} />)
                                        </span>{" "}
                                        +{" "}
                                        <span className="flex items-center">
                                            Tier C (20 <Gem className="text-purple-600" size={14} />)
                                        </span>
                                    </span>
                                </span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-purple-600 mt-1">→</span>
                                <span className="flex sm:flex-row flex-col sm:items-center items-start">
                                    Plus 2 additional $5,000 blocks:{" "}
                                    <span className="flex">
                                        <span className="flex items-center">
                                            {" "}
                                            +20 <Gem className="text-purple-600" size={14} />
                                        </span>{" "}
                                        <span className="flex items-center">
                                            {" "}
                                            + 20 <Gem className="text-purple-600" size={14} />
                                        </span></span>
                                </span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="font-bold text-purple-600 text-base flex items-center">
                                    Total Earned: 75{" "}
                                    <Gem className="text-purple-600 mx-1" size={14} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
