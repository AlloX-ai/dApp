import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { apiCall } from "../utils/api";
import {
	resetTradingState,
	setCompetition,
	setLeaderboard,
	setUserData,
} from "../redux/slices/tradingSlice";

const initialLoadingState = {
	activeCompetition: false,
	competition: false,
	leaderboard: false,
	userData: false,
	tradingData: false,
};

/** Active `/competition/active` can return multiple campaigns; trading uses this one only. */
const TRADING_LEADERBOARD_COMPETITION_NAME = "The Allocation Race";

const pickAllocationRaceCompetition = (competitions) => {
	if (!Array.isArray(competitions)) return null;
	return (
		competitions.find((c) => c?.name === TRADING_LEADERBOARD_COMPETITION_NAME) ??
		null
	);
};

const getCompetitionId = (payload) => {
	if (!payload) return null;

	if (typeof payload === "string") return payload;
	if (payload.id) return payload.id;
	if (payload._id) return payload._id;

	if (Array.isArray(payload.competitions)) {
		const picked = pickAllocationRaceCompetition(payload.competitions);
		return picked?._id ?? picked?.id ?? null;
	}

	if (Array.isArray(payload)) {
		const picked = pickAllocationRaceCompetition(payload);
		return picked?._id ?? picked?.id ?? null;
	}

	if (Array.isArray(payload.data)) {
		const picked = pickAllocationRaceCompetition(payload.data);
		if (picked) return picked._id ?? picked.id ?? null;
		const firstCompetition = payload.data[0];
		return firstCompetition?.id ?? firstCompetition?._id ?? null;
	}

	return null;
};

export function useTrading() {
	const dispatch = useDispatch();
	const trading = useSelector((state) => state.trading);
	const [loading, setLoading] = useState(initialLoadingState);
	const [error, setError] = useState(null);

	const setLoadingState = useCallback((key, value) => {
		setLoading((prev) => ({ ...prev, [key]: value }));
	}, []);

	const clearTradingError = useCallback(() => {
		setError(null);
	}, []);

	const fetchActiveCompetition = useCallback(async () => {
		setLoadingState("activeCompetition", true);
		setError(null);

		try {
			const data = await apiCall("/competition/active");
			const competitionId = getCompetitionId(data);
			const picked = pickAllocationRaceCompetition(data?.competitions);

			if (!competitionId) {
				throw new Error("No active competition found");
			}

			return {
				competitionId,
				data:
					picked != null
						? { ...data, competitions: [picked] }
						: data,
			};
		} catch (err) {
			setError(err?.message || "Failed to fetch active competition");
			throw err;
		} finally {
			setLoadingState("activeCompetition", false);
		}
	}, [setLoadingState]);

	const fetchCompetition = useCallback(
		async (competitionIdOverride) => {
			setLoadingState("competition", true);
			setError(null);

			try {
				const resolvedCompetitionId =
					competitionIdOverride ||
					(await fetchActiveCompetition()).competitionId;

				const data = await apiCall(`/competition/${resolvedCompetitionId}`);
				dispatch(setCompetition(data));
				return data;
			} catch (err) {
				setError(err?.message || "Failed to fetch competition details");
				throw err;
			} finally {
				setLoadingState("competition", false);
			}
		},
		[dispatch, fetchActiveCompetition, setLoadingState],
	);

	const fetchLeaderboard = useCallback(
		async ({ competitionId, page = 1, limit = 10 } = {}) => {
			setLoadingState("leaderboard", true);
			setError(null);

			try {
				const resolvedCompetitionId =
					competitionId ||
					(await fetchActiveCompetition()).competitionId;

				const data = await apiCall(
					`/competition/${resolvedCompetitionId}/leaderboard?limit=${limit}&page=${page}`,
				);

				dispatch(setLeaderboard(data));
				return data;
			} catch (err) {
				setError(err?.message || "Failed to fetch leaderboard");
				throw err;
			} finally {
				setLoadingState("leaderboard", false);
			}
		},
		[dispatch, fetchActiveCompetition, setLoadingState],
	);

	const fetchUserCompetitionData = useCallback(
		async ({ competitionId } = {}) => {
			setLoadingState("userData", true);
			setError(null);

			try {
				const resolvedCompetitionId =
					competitionId ||
					(await fetchActiveCompetition()).competitionId;

				const data = await apiCall(
					`/competition/${resolvedCompetitionId}/me`,
				);

				dispatch(setUserData(data));
				return data;
			} catch (err) {
				setError(err?.message || "Failed to fetch user competition data");
				throw err;
			} finally {
				setLoadingState("userData", false);
			}
		},
		[dispatch, fetchActiveCompetition, setLoadingState],
	);

	const fetchTradingData = useCallback(
		async ({ competitionId, page = 1, limit = 10, includeMe = false } = {}) => {
			setLoadingState("tradingData", true);
			setError(null);

			try {
				const resolvedCompetitionId =
					competitionId ||
					(await fetchActiveCompetition()).competitionId;

				const [competitionData, leaderboardData, userCompetitionData] =
					await Promise.all([
						apiCall(`/competition/${resolvedCompetitionId}`),
						apiCall(
							`/competition/${resolvedCompetitionId}/leaderboard?limit=${limit}&page=${page}`,
						),
						includeMe
							? apiCall(`/competition/${resolvedCompetitionId}/me`)
							: Promise.resolve(null),
					]);

				dispatch(setCompetition(competitionData));
				dispatch(setLeaderboard(leaderboardData));
				dispatch(setUserData(userCompetitionData));

				return {
					competition: competitionData,
					leaderboard: leaderboardData,
					userData: userCompetitionData,
					competitionId: resolvedCompetitionId,
				};
			} catch (err) {
				setError(err?.message || "Failed to fetch trading data");
				throw err;
			} finally {
				setLoadingState("tradingData", false);
			}
		},
		[dispatch, fetchActiveCompetition, setLoadingState],
	);

	const resetTrading = useCallback(() => {
		dispatch(resetTradingState());
		setError(null);
		setLoading(initialLoadingState);
	}, [dispatch]);

	return {
		...trading,
		loading,
		error,
		clearTradingError,
		fetchActiveCompetition,
		fetchCompetition,
		fetchLeaderboard,
		fetchUserCompetitionData,
		fetchTradingData,
		resetTrading,
	};
}
