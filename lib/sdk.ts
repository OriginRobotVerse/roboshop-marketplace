import { createBaseAccountSDK } from '@base-org/account';

type SDK = ReturnType<typeof createBaseAccountSDK>;
type SDKProvider = ReturnType<SDK['getProvider']>;

let _sdk: SDK | null = null;
let _activeProvider: SDKProvider | null = null;

function getSDK(): SDK {
  if (!_sdk) {
    _sdk = createBaseAccountSDK({
      appName: 'Origin Skill Marketplace',
      appChainIds: [84532], // Base Sepolia for demo
    });
  }
  return _sdk;
}

export function setActiveProvider(provider: unknown) {
  _activeProvider = provider as SDKProvider;
}

export function getProvider(): SDKProvider {
  return _activeProvider ?? getSDK().getProvider();
}
