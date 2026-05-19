import { OptionsController } from "@reown/appkit-controllers";
import {
  WALLET_CONNECT_METADATA,
  WALLET_CONNECT_PROJECT_ID,
} from "../wagmiConnectors";

let configured = false;

/**
 * WalletConnect's EthereumProvider boots AppKit for the QR modal. AppKit controllers
 * default to projectId "" and sv "html-wagmi-undefined", which causes 403s on
 * api.web3modal.org and prevents the modal from opening.
 */
export function ensureReownAppKitConfigured() {
  if (configured) return;

  OptionsController.setProjectId(WALLET_CONNECT_PROJECT_ID);
  OptionsController.setMetadata(WALLET_CONNECT_METADATA);
  OptionsController.setSdkVersion("html-wagmi-3.6.15");
  OptionsController.setEnableWallets(true);

  configured = true;
}
