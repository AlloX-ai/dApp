import { watchConnectors } from "@wagmi/core";

/**
 * Wagmi v3 + WalletConnect + AppKit: `connect()` can hang while the WC session is
 * already live. Force wagmi to `connected` when the connector emits `connect`.
 * @see Metaverse App.jsx WalletSync
 */
export function subscribeWalletConnectForceConnect(wagmiClient) {
  const NativeMap = globalThis.Map;
  const subscriptions = new NativeMap();

  const subscribeConnector = (connector) => {
    if (subscriptions.has(connector.uid)) return;

    const handler = async (data) => {
      const state = wagmiClient.state;
      if (state.status === "connected" && state.current === connector.uid) {
        return;
      }

      wagmiClient.setState((x) => ({
        ...x,
        connections: new NativeMap(x.connections).set(connector.uid, {
          accounts: data.accounts,
          chainId: data.chainId,
          connector,
        }),
        current: connector.uid,
        status: "connected",
      }));

      if (
        !connector.emitter.listenerCount("change") &&
        wagmiClient._internal?.events?.change
      ) {
        connector.emitter.on("change", wagmiClient._internal.events.change);
      }
      if (
        !connector.emitter.listenerCount("disconnect") &&
        wagmiClient._internal?.events?.disconnect
      ) {
        connector.emitter.on(
          "disconnect",
          wagmiClient._internal.events.disconnect,
        );
      }

      try {
        if (typeof connector.getProvider === "function") {
          const provider = await connector.getProvider();
          if (provider && !provider.__alloxForcedListenersAttached) {
            provider.__alloxForcedListenersAttached = true;
            if (typeof connector.onAccountsChanged === "function") {
              provider.on("accountsChanged", (accounts) =>
                connector.onAccountsChanged(accounts),
              );
            }
            if (typeof connector.onChainChanged === "function") {
              provider.on("chainChanged", (chain) =>
                connector.onChainChanged(chain),
              );
            }
            if (typeof connector.onDisconnect === "function") {
              provider.on("disconnect", (err) => connector.onDisconnect(err));
            }
            if (typeof connector.onSessionDelete === "function") {
              provider.on("session_delete", () => connector.onSessionDelete());
            }
          }
        }
        if (typeof connector.setRequestedChainsIds === "function") {
          await connector.setRequestedChainsIds(
            wagmiClient.chains.map((c) => c.id),
          );
        }
        await wagmiClient.storage?.setItem("recentConnectorId", connector.id);
      } catch (err) {
        console.warn("WalletConnect force-connect finalize:", err);
      }
    };

    connector.emitter.on("connect", handler);
    subscriptions.set(connector.uid, { connector, handler });
  };

  wagmiClient.connectors.forEach(subscribeConnector);

  const unwatch = watchConnectors(wagmiClient, {
    onChange(connectors) {
      const currentUids = new Set(connectors.map((c) => c.uid));
      connectors.forEach(subscribeConnector);
      for (const [uid, { connector, handler }] of subscriptions) {
        if (!currentUids.has(uid)) {
          connector.emitter.off("connect", handler);
          subscriptions.delete(uid);
        }
      }
    },
  });

  return () => {
    unwatch();
    for (const { connector, handler } of subscriptions.values()) {
      connector.emitter.off("connect", handler);
    }
    subscriptions.clear();
  };
}
