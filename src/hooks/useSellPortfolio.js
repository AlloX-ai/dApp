import { useCallback, useMemo, useRef, useState } from "react";
import { encodeFunctionData, hashTypedData } from "viem";
import { useSelector } from "react-redux";
import {
  getEmbeddedConnectedWallet,
  useSendTransaction,
  useWallets,
} from "@privy-io/react-auth";
import { apiCall } from "../utils/api";
import { useAuth } from "./useAuth";
import {
  checkTxStatus,
  createPrivyExecutionTxEnv,
  createWagmiExecutionTxEnv,
  ensureStandardApproval,
  signTypedDataV4ForConnectedWallet,
} from "../utils/execution";
import { chainIdFor, normalizeChain } from "../config/chains";
import {
  APPROVAL_INDEX_LAG_MS,
  ERC20_ABI,
  MAX_ORDER_ATTEMPTS,
  MAX_POLL_ATTEMPTS,
  MAX_POST_APPROVAL_PREPARE_RETRIES,
  PERMIT2_ABI,
  PREPARE_RETRY_DELAY_MS,
  STALE_TX_SUBMITTED_TIMEOUT_MS,
  isPermit2BatchProvider,
  parseOptionalGasLimit,
  pickOrderAmountWei,
  pickOrderProvider,
  pickOrderTokenAddress,
  sellPollDelayMs,
  sleep,
} from "../utils/sellPortfolio";

export function useSellPortfolio({ onComplete, onRequestClose } = {}) {
  const sessionSource = useSelector((state) => state.wallet.sessionSource);
  const walletType = useSelector((state) => state.wallet.walletType);
  const { ensureAuthenticated, logout, user: authUser } = useAuth();
  const { wallets } = useWallets();
  const { sendTransaction: privySendTransaction } = useSendTransaction();

  const [sellTarget, setSellTarget] = useState(null);
  const [sellSlippage, setSellSlippage] = useState("1");
  const [isSellQuoteLoading, setIsSellQuoteLoading] = useState(false);
  const [sellQuote, setSellQuote] = useState(null);
  const [sellQuoteError, setSellQuoteError] = useState("");
  const [sellRequiredSlippage, setSellRequiredSlippage] = useState(null);
  const [isSellExecuting, setIsSellExecuting] = useState(false);
  const [sellExecutionError, setSellExecutionError] = useState("");
  const [sellExecutionLogs, setSellExecutionLogs] = useState([]);
  const [sellProgress, setSellProgress] = useState({
    stage: "idle",
    current: 0,
    total: 0,
    label: "",
  });
  const [orderStatusMap, setOrderStatusMap] = useState({});
  const [retryPrompt, setRetryPrompt] = useState(null);
  const retryResolverRef = useRef(null);

  const addSellLog = useCallback((message) => {
    setSellExecutionLogs((prev) => [...prev, message]);
  }, []);

  const resetSellState = useCallback(() => {
    setSellTarget(null);
    setSellQuote(null);
    setSellQuoteError("");
    setSellExecutionError("");
    setSellExecutionLogs([]);
    setSellProgress({ stage: "idle", current: 0, total: 0, label: "" });
    setSellRequiredSlippage(null);
    setOrderStatusMap({});
    setRetryPrompt(null);
    retryResolverRef.current = null;
  }, []);

  const closeSellModal = useCallback(() => {
    if (isSellExecuting) return;
    resetSellState();
  }, [isSellExecuting, resetSellState]);

  const handleRetryDecision = useCallback((shouldRetry) => {
    setRetryPrompt(null);
    retryResolverRef.current?.(shouldRetry);
    retryResolverRef.current = null;
  }, []);

  const quoteSell = useCallback(
    async (target) => {
      if (!target?.portfolioId) return;
      setIsSellQuoteLoading(true);
      setSellQuoteError("");
      setSellExecutionError("");
      setSellRequiredSlippage(null);
      setSellProgress({ stage: "idle", current: 0, total: 0, label: "" });
      try {
        await ensureAuthenticated();
        const nextSlippage = Number(sellSlippage);
        const body = {
          ...(target?.symbol ? { symbol: target.symbol } : {}),
          ...(Number.isFinite(nextSlippage) && nextSlippage > 0
            ? { slippage: nextSlippage }
            : {}),
        };
        const quote = await apiCall(
          `/portfolio/${target.portfolioId}/sell/quote`,
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        );
        setSellQuote(quote);
      } catch (error) {
        if (error?.status === 401) {
          logout();
        }
        setSellQuoteError(error?.message || "Unable to quote sell request.");
      } finally {
        setIsSellQuoteLoading(false);
      }
    },
    [ensureAuthenticated, logout, sellSlippage],
  );

  const openSellTarget = useCallback(
    (target) => {
      if (!target?.portfolioId) return;
      setSellTarget(target);
      setSellQuote(null);
      setSellQuoteError("");
      setSellExecutionError("");
      setSellExecutionLogs([]);
      setSellRequiredSlippage(null);
      quoteSell(target);
    },
    [quoteSell],
  );

  const runApprovalStep = useCallback(async (approvalStep, txEnv) => {
    const method = approvalStep?.tx?.method;
    const args = approvalStep?.tx?.args || [];
    const to = approvalStep?.tx?.to;
    if (!to || !method) {
      throw new Error("Approval step is missing transaction details.");
    }

    let data;
    if (method === "approve(address,uint256)") {
      data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [args[0], BigInt(args[1])],
      });
    } else if (method === "approve(address,address,uint160,uint48)") {
      data = encodeFunctionData({
        abi: PERMIT2_ABI,
        functionName: "approve",
        args: [args[0], args[1], BigInt(args[2]), BigInt(args[3])],
      });
    } else {
      throw new Error(`Unsupported approval method: ${method}`);
    }

    const gas = parseOptionalGasLimit(
      approvalStep?.tx?.gas ?? approvalStep?.tx?.gasLimit,
    );
    const txHash = await txEnv.sendTransaction({
      to,
      data,
      value: 0n,
      ...(gas !== undefined && { gas }),
    });
    await txEnv.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }, []);

  const signSellPermitTypedData = useCallback(
    async ({ typedData, userAddress, isPrivySession, embeddedWallet }) => {
      if (!typedData) {
        throw new Error("Permit batch response is missing typedData.");
      }

      try {
        const hashFE = hashTypedData({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        });
        console.log("FE will sign hash:", hashFE);
      } catch (hashErr) {
        console.warn("Unable to hash permit typedData on FE:", hashErr);
      }

      const payload = JSON.stringify(typedData);
      if (isPrivySession) {
        if (!embeddedWallet?.getEthereumProvider) {
          throw new Error("Embedded wallet provider is not available.");
        }
        const privyProvider = await embeddedWallet.getEthereumProvider();
        return privyProvider.request({
          method: "eth_signTypedData_v4",
          params: [userAddress, payload],
        });
      }

      return signTypedDataV4ForConnectedWallet({
        typedData,
        userAddress,
      });
    },
    [],
  );

  const buildSellPermitBatchSignatures = useCallback(
    async ({
      orders,
      chain,
      userAddress,
      isPrivySession,
      embeddedWallet,
      enablePermitBatch,
    }) => {
      if (!enablePermitBatch) {
        addSellLog("Token sell mode: skipping Permit2 batch.");
        return {};
      }
      const byProvider = {};
      let permit2CandidateCount = 0;
      for (const order of orders || []) {
        const provider = pickOrderProvider(order);
        if (!isPermit2BatchProvider(provider)) continue;
        permit2CandidateCount += 1;
        const token = pickOrderTokenAddress(order);
        const amountWei = pickOrderAmountWei(order);
        if (!token || !amountWei) {
          addSellLog(
            `Skipping ${order?.symbol || "order"} for Permit2 batch: missing token or amount in quote payload.`,
          );
          continue;
        }
        if (!byProvider[provider]) byProvider[provider] = [];
        byProvider[provider].push({
          token,
          amountWei,
        });
      }
      const providers = Object.keys(byProvider);
      if (!providers.length) {
        addSellLog(
          permit2CandidateCount > 0
            ? "Permit2 providers detected, but quote payload lacks batchable token/amount fields. Falling back to per-order approvals."
            : "No Permit2 providers in this quote. Skipping batch permit.",
        );
        return {};
      }

      addSellLog(
        `Preparing Permit2 signature${providers.length > 1 ? "s" : ""} (${providers.join(", ")})...`,
      );
      addSellLog(
        `Provider groups: ${providers.map((p) => `${p}:${byProvider[p].length}`).join(", ")}`,
      );

      const signaturesByProvider = {};
      let providerIdx = 0;
      for (const provider of providers) {
        providerIdx += 1;
        setSellProgress({
          stage: "signatures",
          current: providerIdx,
          total: providers.length,
          label: `Preparing signature ${providerIdx}/${providers.length} (${provider})...`,
        });
        const items = byProvider[provider].map((o) => ({
          token: o.token,
          amountWei: o.amountWei,
        }));
        addSellLog(
          `${provider}: requesting /execution/permit-batch for ${items.length} token(s)...`,
        );
        const res = await apiCall("/execution/permit-batch", {
          method: "POST",
          body: JSON.stringify({
            chain,
            provider,
            items,
          }),
        });
        addSellLog(
          `${provider}: /execution/permit-batch ready, requesting signature...`,
        );
        const signature = await signSellPermitTypedData({
          typedData: res?.typedData,
          userAddress,
          isPrivySession,
          embeddedWallet,
        });
        signaturesByProvider[provider] = {
          permitBatch: res?.permitBatch,
          permitBatchSignature: signature,
        };
        addSellLog(
          `${provider}: Permit2 batch signed for ${items.length} order(s).`,
        );
      }

      return signaturesByProvider;
    },
    [addSellLog, signSellPermitTypedData],
  );

  const executeSingleOrder = useCallback(
    async (
      order,
      txEnv,
      slippageValue,
      executionChain,
      permitBatchSignaturesByProvider,
      includePermitBatch,
    ) => {
      const symbol = order?.symbol || "TOKEN";

      const describeWalletError = (err) => {
        const code = err?.code;
        const raw = String(err?.message || err || "").toLowerCase();
        if (
          code === 4001 ||
          raw.includes("user rejected") ||
          raw.includes("rejected the request") ||
          raw.includes("user denied")
        ) {
          return "rejected in wallet";
        }
        if (
          raw.includes("transaction failed") ||
          raw.includes("failed to send") ||
          raw.includes("send transaction failed") ||
          raw.includes("wallet request failed")
        ) {
          return "wallet transaction failed";
        }
        return err?.message || "wallet error";
      };

      const callPrepare = () => {
        const provider = pickOrderProvider(order);
        const body = { slippage: slippageValue };
        if (includePermitBatch && isPermit2BatchProvider(provider)) {
          const signedBatch = permitBatchSignaturesByProvider?.[provider];
          if (signedBatch?.permitBatch && signedBatch?.permitBatchSignature) {
            body.permitBatch = signedBatch.permitBatch;
            body.permitBatchSignature = signedBatch.permitBatchSignature;
          } else {
            addSellLog(
              `${symbol}: no Permit2 batch signature found for provider ${provider}; prepare will use fallback approval flow.`,
            );
          }
        }
        return apiCall(`/execution/${order.executionOrderId}/prepare`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      };

      const prepareAfterApprovalsWithRetry = async () => {
        let lastErr;
        for (
          let attempt = 0;
          attempt < MAX_POST_APPROVAL_PREPARE_RETRIES;
          attempt += 1
        ) {
          if (attempt > 0) await sleep(PREPARE_RETRY_DELAY_MS);
          try {
            return await callPrepare();
          } catch (err) {
            lastErr = err;
            const stillWaitingForApproval =
              err?.status === 428 && Array.isArray(err?.data?.approvalSteps);
            if (!stillWaitingForApproval) throw err;
          }
        }
        throw lastErr;
      };

      let prepare;
      try {
        prepare = await callPrepare();
      } catch (error) {
        if (
          error?.status === 428 &&
          Array.isArray(error?.data?.approvalSteps)
        ) {
          addSellLog(`${symbol}: approvals required.`);
          try {
            for (const step of error.data.approvalSteps) {
              await runApprovalStep(step, txEnv);
            }
          } catch (approvalErr) {
            addSellLog(
              `${symbol}: approval ${describeWalletError(approvalErr)}.`,
            );
            return false;
          }
          await sleep(APPROVAL_INDEX_LAG_MS);
          try {
            prepare = await prepareAfterApprovalsWithRetry();
          } catch (retryPrepareErr) {
            addSellLog(
              `${symbol}: prepare failed after approvals (${retryPrepareErr?.message || "error"}).`,
            );
            return false;
          }
        } else if (
          error?.status === 422 &&
          error?.data?.error === "SLIPPAGE_INCREASE_REQUIRED"
        ) {
          setSellRequiredSlippage(error?.data?.requiredSlippage ?? null);
          throw new Error(
            error?.data?.message ||
              `${symbol}: higher slippage is required to continue.`,
          );
        } else {
          throw error;
        }
      }

      const txData = prepare?.txData;
      if (!txData?.to || !txData?.data) {
        addSellLog(`${symbol}: invalid prepared transaction data.`);
        return false;
      }

      if (prepare.approvalNeeded) {
        const fromTokenAddress = prepare.fromTokenAddress;
        const requiredAmount = (() => {
          try {
            return prepare.fromAmount != null && prepare.fromAmount !== ""
              ? BigInt(prepare.fromAmount)
              : 0n;
          } catch {
            return 0n;
          }
        })();

        try {
          if (prepare.approvalType === "permit2") {
            // On 200 /prepare responses, approvalType:"permit2" identifies the
            // swap route and does not imply an extra approval transaction.
          } else if (prepare.approvalType === "standard") {
            await ensureStandardApproval({
              chain: executionChain,
              approvalContract: prepare.approvalContract,
              tokenAddress: fromTokenAddress,
              userAddress: txEnv.userAddress,
              requiredAmount,
              update: () => {},
              txEnv,
            });
          }
        } catch (approvalErr) {
          addSellLog(
            `${symbol}: approval ${describeWalletError(approvalErr)}.`,
          );
          return false;
        }
      }

      addSellLog(`${symbol}: waiting for wallet confirmation...`);
      let txHash;
      try {
        const gas = parseOptionalGasLimit(txData?.gas ?? txData?.gasLimit);
        txHash = await txEnv.sendTransaction({
          to: txData.to,
          data: txData.data,
          value:
            txData.value != null && txData.value !== ""
              ? BigInt(txData.value)
              : 0n,
          ...(txData.nonce != null && txData.nonce !== ""
            ? { nonce: Number(txData.nonce) }
            : {}),
          ...(gas !== undefined && { gas }),
        });
      } catch (walletErr) {
        addSellLog(`${symbol}: ${describeWalletError(walletErr)}.`);
        return false;
      }
      addSellLog(`${symbol}: tx submitted ${txHash.slice(0, 10)}...`);

      try {
        await apiCall(`/execution/${order.executionOrderId}/submit`, {
          method: "POST",
          body: JSON.stringify({ txHash }),
        });
      } catch (submitErr) {
        addSellLog(
          `${symbol}: submit failed (${submitErr?.message || "error"}).`,
        );
        return false;
      }

      const immediateOnChain = await checkTxStatus(txHash, executionChain);
      if (immediateOnChain === "reverted") {
        addSellLog(`${symbol}: transaction failed on-chain.`);
        return false;
      }

      let lastStatusError = null;
      for (let i = 0; i < MAX_POLL_ATTEMPTS; i += 1) {
        await sleep(sellPollDelayMs(i, lastStatusError));

        if (i > 1 && i % 5 === 0) {
          const onChainStatus = await checkTxStatus(txHash, executionChain);
          if (onChainStatus === "reverted") {
            addSellLog(`${symbol}: transaction failed on-chain.`);
            return false;
          }
        }

        try {
          const statusData = await apiCall(
            `/execution/${order.executionOrderId}/status`,
          );
          const status = statusData?.status;
          lastStatusError = null;
          if (status === "CONFIRMED") {
            addSellLog(`${symbol}: confirmed.`);
            return true;
          }
          if (status === "FAILED") {
            addSellLog(`${symbol}: failed on-chain.`);
            return false;
          }
          if (status === "TX_SUBMITTED") {
            const submittedAtMs = Date.parse(String(statusData?.submittedAt || ""));
            const isStaleSubmitted =
              Number.isFinite(submittedAtMs) &&
              Date.now() - submittedAtMs > STALE_TX_SUBMITTED_TIMEOUT_MS;
            if (isStaleSubmitted) {
              const onChainStatus = await checkTxStatus(txHash, executionChain);
              if (onChainStatus == null) {
                addSellLog(
                  `${symbol}: tx still not visible on-chain after submit timeout; moving on.`,
                );
                return false;
              }
            }
          }
        } catch (statusErr) {
          lastStatusError = statusErr;
        }
      }

      addSellLog(`${symbol}: status timeout.`);
      return false;
    },
    [addSellLog, runApprovalStep],
  );

  const executeRequiredErc20Approvals = useCallback(
    async (requiredApprovals, txEnv) => {
      const approvals = Array.isArray(requiredApprovals) ? requiredApprovals : [];
      if (!approvals.length) return;
      setSellProgress({
        stage: "approvals",
        current: 0,
        total: approvals.length,
        label: "Confirming required ERC20 approvals...",
      });
      addSellLog(
        `Quote requires ${approvals.length} one-time ERC20 approval(s) to Permit2.`,
      );
      for (const [index, entry] of approvals.entries()) {
        const symbol = entry?.symbol || "TOKEN";
        const approvalTx = entry?.approvalTx;
        if (!approvalTx?.to || !approvalTx?.data) {
          throw new Error(
            `${symbol}: quote is missing approvalTx details for requiredErc20Approvals.`,
          );
        }
        setSellProgress({
          stage: "approvals",
          current: index + 1,
          total: approvals.length,
          label: `Approving ${symbol} (${index + 1}/${approvals.length})...`,
        });
        addSellLog(`${symbol}: waiting for one-time ERC20 approval...`);
        const gas = parseOptionalGasLimit(
          approvalTx?.gas ?? approvalTx?.gasLimit,
        );
        const txHash = await txEnv.sendTransaction({
          to: approvalTx.to,
          data: approvalTx.data,
          value:
            approvalTx?.value != null && approvalTx.value !== ""
              ? BigInt(approvalTx.value)
              : 0n,
          ...(gas !== undefined && { gas }),
        });
        await txEnv.waitForTransactionReceipt({ hash: txHash });
        addSellLog(`${symbol}: one-time ERC20 approval confirmed.`);
      }
    },
    [addSellLog],
  );

  const confirmSell = useCallback(async () => {
    if (!sellTarget?.portfolioId || !sellQuote?.orders?.length) return;
    setIsSellExecuting(true);
    setSellExecutionError("");
    setSellRequiredSlippage(null);
    setSellExecutionLogs([]);
    setSellProgress({
      stage: "starting",
      current: 0,
      total: 0,
      label: "Starting sell flow...",
    });
    setOrderStatusMap({});
    setRetryPrompt(null);
    const slippageValue = Number(sellSlippage) > 0 ? Number(sellSlippage) : 1;

    try {
      await ensureAuthenticated();
      const executionChain = normalizeChain(
        sellQuote?.chain || sellTarget?.chain,
      );
      const executionChainId = chainIdFor(executionChain);
      let txEnv;
      let embeddedWallet = null;
      const isPrivySession =
        authUser?.authProvider === "privy" ||
        sessionSource === "privy" ||
        walletType === "privy";
      if (isPrivySession) {
        embeddedWallet = getEmbeddedConnectedWallet(wallets);
        if (!embeddedWallet) {
          throw new Error(
            "Embedded wallet not found. Refresh the page or sign in again.",
          );
        }
        const chainId = embeddedWallet.chainId;
        const onExecutionChain =
          chainId === `eip155:${executionChainId}` ||
          (typeof chainId === "string" &&
            chainId.startsWith("0x") &&
            parseInt(chainId, 16) === executionChainId) ||
          Number(chainId) === executionChainId;
        if (!onExecutionChain) {
          await embeddedWallet.switchChain(executionChainId);
        }
        txEnv = createPrivyExecutionTxEnv(
          embeddedWallet.address,
          privySendTransaction,
          executionChain,
        );
      } else {
        txEnv = createWagmiExecutionTxEnv(executionChain);
      }
      txEnv.assertReady();

      const shouldUsePermitBatch = true;
      addSellLog(
        `Sell mode: permit-batch + swaps (${sellQuote.orders.length} order(s)).`,
      );

      await executeRequiredErc20Approvals(
        sellQuote?.requiredErc20Approvals,
        txEnv,
      );
      const permitBatchSignaturesByProvider =
        await buildSellPermitBatchSignatures({
          orders: sellQuote.orders,
          chain: executionChain,
          userAddress: txEnv.userAddress,
          isPrivySession,
          embeddedWallet,
          enablePermitBatch: shouldUsePermitBatch,
        });
      let includePermitBatch = shouldUsePermitBatch;

      let confirmed = 0;
      for (const [orderIndex, initialOrder] of sellQuote.orders.entries()) {
        let currentOrder = initialOrder;
        let orderConfirmed = false;
        const statusKey = initialOrder.executionOrderId;

        for (let attempt = 1; attempt <= MAX_ORDER_ATTEMPTS; attempt++) {
          setOrderStatusMap((prev) => ({
            ...prev,
            [statusKey]: "executing",
          }));
          setSellProgress({
            stage: "swaps",
            current: orderIndex + 1,
            total: sellQuote.orders.length,
            label: `Executing swap ${orderIndex + 1}/${sellQuote.orders.length} (${currentOrder?.symbol || "TOKEN"})...`,
          });

          let ok = false;
          try {
            ok = await executeSingleOrder(
              currentOrder,
              txEnv,
              slippageValue,
              executionChain,
              permitBatchSignaturesByProvider,
              includePermitBatch,
            );
          } catch (orderErr) {
            if (orderErr?.status === 401) throw orderErr;
            addSellLog(
              `${currentOrder?.symbol || "TOKEN"}: ${orderErr?.message || "error"}.`,
            );
          }

          if (ok) {
            setOrderStatusMap((prev) => ({
              ...prev,
              [statusKey]: "confirmed",
            }));
            orderConfirmed = true;
            if (includePermitBatch) {
              includePermitBatch = false;
              addSellLog(
                "First swap confirmed. Subsequent /prepare calls omit permitBatch signature.",
              );
            }
            try {
              await apiCall(
                `/portfolio/${sellTarget.portfolioId}/sell/complete`,
                { method: "POST" },
              );
            } catch {
              // Non-fatal — the final /sell/complete call below will catch up.
            }
            break;
          }

          setOrderStatusMap((prev) => ({
            ...prev,
            [statusKey]: "failed",
          }));

          if (attempt >= MAX_ORDER_ATTEMPTS) {
            addSellLog(
              `${currentOrder.symbol}: max retries (${MAX_ORDER_ATTEMPTS}) reached, skipping.`,
            );
            break;
          }

          setRetryPrompt({
            symbol: currentOrder.symbol,
            attempt,
            maxAttempts: MAX_ORDER_ATTEMPTS,
          });
          const shouldRetry = await new Promise((resolve) => {
            retryResolverRef.current = resolve;
          });
          setRetryPrompt(null);

          if (!shouldRetry) {
            addSellLog(`${currentOrder.symbol}: skipped by user.`);
            break;
          }

          addSellLog(
            `${currentOrder.symbol}: re-quoting for retry ${attempt + 1}...`,
          );
          try {
            const reQuote = await apiCall(
              `/portfolio/${sellTarget.portfolioId}/sell/quote`,
              {
                method: "POST",
                body: JSON.stringify({
                  symbol: currentOrder.symbol,
                  slippage: slippageValue,
                }),
              },
            );
            const newOrder = reQuote?.orders?.[0];
            if (!newOrder?.executionOrderId) {
              addSellLog(
                `${currentOrder.symbol}: no new order from re-quote, skipping.`,
              );
              break;
            }
            currentOrder = newOrder;
          } catch {
            addSellLog(`${currentOrder.symbol}: re-quote failed, skipping.`);
            break;
          }
        }

        if (orderConfirmed) confirmed += 1;
      }

      if (confirmed > 0) {
        await apiCall(`/portfolio/${sellTarget.portfolioId}/sell/complete`, {
          method: "POST",
        });
      }
      addSellLog(
        `Completed. ${confirmed}/${sellQuote.orders.length} order(s) confirmed.`,
      );
      setSellProgress({
        stage: "complete",
        current: confirmed,
        total: sellQuote.orders.length,
        label: `Completed ${confirmed}/${sellQuote.orders.length} orders.`,
      });
      if (confirmed > 0) {
        await onComplete?.(sellTarget.portfolioId);
        setTimeout(() => {
          resetSellState();
          onRequestClose?.();
        }, 900);
      }
    } catch (error) {
      if (error?.status === 401) {
        logout();
        return;
      }
      const message = error?.message || "Sell execution failed.";
      setSellExecutionError(message);
      addSellLog(`Sell flow stopped: ${message}`);
    } finally {
      setIsSellExecuting(false);
      setRetryPrompt(null);
      retryResolverRef.current = null;
    }
  }, [
    authUser?.authProvider,
    addSellLog,
    buildSellPermitBatchSignatures,
    ensureAuthenticated,
    executeRequiredErc20Approvals,
    executeSingleOrder,
    logout,
    onComplete,
    onRequestClose,
    privySendTransaction,
    resetSellState,
    sellQuote?.chain,
    sellQuote?.orders,
    sellSlippage,
    sellTarget,
    sessionSource,
    walletType,
    wallets,
  ]);

  const sellQuoteOrders = useMemo(
    () => (Array.isArray(sellQuote?.orders) ? sellQuote.orders : []),
    [sellQuote?.orders],
  );
  const sellFailedQuotes = useMemo(
    () => (Array.isArray(sellQuote?.failed) ? sellQuote.failed : []),
    [sellQuote?.failed],
  );
  const sellOutputToken = sellQuote?.toToken || "USDT";
  const sellEstimatedOutTotal = useMemo(
    () =>
      sellQuoteOrders.reduce(
        (sum, order) =>
          sum +
          Number(order?.estimatedToTokenOut ?? order?.estimatedUsdtOut ?? 0),
        0,
      ),
    [sellQuoteOrders],
  );
  const highPriceImpactOrders = useMemo(
    () =>
      sellQuoteOrders.filter(
        (order) => Number(order?.priceImpact || 0) >= 5,
      ),
    [sellQuoteOrders],
  );

  return {
    sellTarget,
    sellSlippage,
    setSellSlippage,
    isSellQuoteLoading,
    sellQuote,
    sellQuoteError,
    sellRequiredSlippage,
    isSellExecuting,
    sellExecutionError,
    sellExecutionLogs,
    sellProgress,
    orderStatusMap,
    retryPrompt,
    sellQuoteOrders,
    sellFailedQuotes,
    sellOutputToken,
    sellEstimatedOutTotal,
    highPriceImpactOrders,
    openSellTarget,
    quoteSell,
    confirmSell,
    closeSellModal,
    resetSellState,
    handleRetryDecision,
  };
}
