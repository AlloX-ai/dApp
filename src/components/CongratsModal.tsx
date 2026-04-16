import { X, Trophy, Gem, Share2, Sparkles, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { findSeason2RewardForWallet } from "../constants/rewards";
import { useEffect, useMemo } from "react";

interface CongratsModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

export function CongratsModal({
  isOpen,
  onClose,
  address,
}: CongratsModalProps) {

  const handleShareToTwitter = () => {
    const twitterUrl = `https://x.com/intent/tweet`;
    window.open(twitterUrl, "_blank");
  };


  const user = useMemo(
    () => findSeason2RewardForWallet(address),
    [address],
  );

  useEffect(() => {
    if (!isOpen || !user) return;

    const today = new Date().toDateString();
    const lastShown = localStorage.getItem("chatDate");
    const count = parseInt(
      localStorage.getItem("chatCount") || "0",
      10,
    );

    if (lastShown !== today && count < 3) {
      localStorage.setItem("chatCount", String(count + 1));
      localStorage.setItem("chatDate", today);
    }
  }, [isOpen, user]);



  if (!user) {
    return null; // Don't render the modal if the user is not in the rewards list
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full border border-white/30 overflow-hidden"
          >
            {/* Confetti Background Effect */}
            <div className="absolute inset-0 bg-white pointer-events-none" />

            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl z-10"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="relative p-8 text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
                className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl relative"
              >
                <Trophy className="w-12 h-12 text-white" />
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full blur-xl"
                />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-gray-900 mb-2"
              >
                Congratulations!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-700 mb-6"
              >
                You are a winner of Spring Series S2
              </motion.p>

              {/* Rewards Display */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="glass-card p-6 mb-6 bg-gradient-to-br from-purple-50/80 to-pink-50/80 border-2 border-purple-200/50"
              >
                <div className="text-sm text-gray-600 mb-2 font-medium">
                  Your Rewards
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Gem className="w-6 h-6 text-purple-600" />
                  <span className="text-3xl font-bold text-gray-900">
                    {user.gems}
                  </span>
                  <span className="text-xl text-gray-600">(${user.gems * 5})</span>
                </div>
              </motion.div>

              {/* Call to Action */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-2xl p-5 mb-6 border border-blue-200/50"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 leading-relaxed text-left">
                    Take a screenshot and share your win on X. Tag{" "}
                    <span className="font-semibold text-blue-600">
                      @alloxdotai{" "}
                    </span>{" "}
                    to show your achievement. <span className="font-semibold text-red-600">
                      ❤
                    </span>
                  </p>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col gap-3"
              >
                <button
                  onClick={handleShareToTwitter}
                  className="w-full px-6 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Share on X
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
