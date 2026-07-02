import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { apiCall } from "../utils/api";
import {
	resetVolumeState,
	setCompetition,
	setLeaderboard,
	setUserData,
} from "../redux/slices/volumeSlice";

const initialLoadingState = {
	competition: false,
	leaderboard: false,
	userData: false,
	volumeData: false,
};

const VOLUME_CAMPAIGN_ENDPOINT = "/campaigns/volume-league";

export function useVolume() {
	const dispatch = useDispatch();
	const volume = useSelector((state) => state.volume);
	const [loading, setLoading] = useState(initialLoadingState);
	const [error, setError] = useState(null);

	const setLoadingState = useCallback((key, value) => {
		setLoading((prev) => ({ ...prev, [key]: value }));
	}, []);

	const clearVolumeError = useCallback(() => {
		setError(null);
	}, []);

	const fetchCompetition = useCallback(
		async () => {
			setLoadingState("competition", true);
			setError(null);

			try {
				const data = await apiCall(VOLUME_CAMPAIGN_ENDPOINT);
				dispatch(setCompetition(data));
				return data;
			} catch (err) {
				setError(err?.message || "Failed to fetch competition details");
				throw err;
			} finally {
				setLoadingState("competition", false);
			}
		},
		[dispatch, setLoadingState],
	);

	const fetchLeaderboard = useCallback(
		async ({ week = 1, limit = 20, page = 1 } = {}) => {
			setLoadingState("leaderboard", true);
			setError(null);

			try {
				const data = await apiCall(
					`${VOLUME_CAMPAIGN_ENDPOINT}/leaderboard?week=${week}&limit=${limit}&page=${page}`,
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
		[dispatch, setLoadingState],
	);

	const fetchUserCompetitionData = useCallback(
		async ({ address } = {}) => {
			setLoadingState("userData", true);
			setError(null);

			try {
				if (!address) {
					throw new Error("Wallet address is required");
				}

				const data = await apiCall(
					`${VOLUME_CAMPAIGN_ENDPOINT}/?address=${address}`,
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
		[dispatch, setLoadingState],
	);

	const fetchVolumeData = useCallback(
		async ({ week = 1, limit = 10, page = 1, address, includeUser = false } = {}) => {
			setLoadingState("volumeData", true);
			setError(null);

			try {
				const [competitionData, leaderboardData, userCompetitionData] = await Promise.all([
					apiCall(VOLUME_CAMPAIGN_ENDPOINT),
					apiCall(`${VOLUME_CAMPAIGN_ENDPOINT}/leaderboard?week=${week}&limit=${limit}&page=${page}`),
					includeUser && address
						? apiCall(`${VOLUME_CAMPAIGN_ENDPOINT}/?address=${address}`)
						: Promise.resolve(null),
				]);

				dispatch(setCompetition(competitionData));
				dispatch(setLeaderboard(leaderboardData));
				dispatch(setUserData(userCompetitionData));

				return {
					competition: competitionData,
					leaderboard: leaderboardData,
					userData: userCompetitionData,
				};
			} catch (err) {
				setError(err?.message || "Failed to fetch volume data");
				throw err;
			} finally {
				setLoadingState("volumeData", false);
			}
		},
		[dispatch, setLoadingState],
	);

	const resetVolume = useCallback(() => {
		dispatch(resetTradingState());
		setError(null);
		setLoading(initialLoadingState);
	}, [dispatch]);

	return {
		...volume,
		loading,
		error,
		clearVolumeError,
		fetchCompetition,
		fetchLeaderboard,
		fetchUserCompetitionData,
		fetchVolumeData,
		resetVolume,
	};
}