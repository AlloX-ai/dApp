import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "./useAuth";
import { useCheckin } from "./useCheckin";

/**
 * Returns the sum of user points (from localStorage/authUser / Redux) and
 * daily bonus points (from check-in), for display in Header and LaunchSidebar.
 */
export function useTotalPoints() {
  const { user } = useAuth();
  const pointsBalance = useSelector((state) => state.points?.balance);
  const { status: checkinStatus } = useCheckin();

  return useMemo(() => {
    const userPoints =
      pointsBalance ??
      user?.points ??
      user?.season1?.points ??
      0;
    const dailyBonusPoints = checkinStatus?.totalPointsEarned ?? 0;
    const u = Number(userPoints) || 0;
    const d = Number(dailyBonusPoints) || 0;
    return {
      totalPoints: u + d,
      userPoints: u,
      dailyBonusPoints: d,
    };
  }, [pointsBalance, user?.points, user?.season1?.points, checkinStatus?.totalPointsEarned]);
}
