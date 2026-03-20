import { ethers } from "ethers";
import intentExecutorAbi from "../constants/IntentExecutor.json";
import erc20Abi from "../constants/MockERC20.json";

const FULL_ABI = intentExecutorAbi;

export const getPublicProvider = () => {
  return new ethers.providers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
};

export const getWeb3Provider = (walletProvider: any) => {
  return new ethers.providers.Web3Provider(walletProvider);
};

export const ensureCorrectNetwork = async (walletProvider: any) => {
  const targetChainId = Number(import.meta.env.VITE_CHAIN_ID || 1002);
  const targetChainIdHex = `0x${targetChainId.toString(16)}`;

  try {
    const provider = getWeb3Provider(walletProvider);
    const { chainId } = await provider.getNetwork();

    if (chainId !== targetChainId) {
      console.log(`Network mismatch: ${chainId} != ${targetChainId}. Switching...`);
      
      try {
        await walletProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          await walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetChainIdHex,
                chainName: "Polkadot Hub Testnet",
                rpcUrls: [import.meta.env.VITE_RPC_URL],
                nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
                blockExplorerUrls: ["https://blockscout-testnet.polkadot.io"],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    }
  } catch (error) {
    console.error("Failed to ensure correct network:", error);
    throw new Error("Please switch your wallet to the Polkadot Hub Testnet (Chain 1002)");
  }
};

export const getTokenBalance = async (
  tokenAddress: string,
  account: string,
) => {
  const provider = getPublicProvider();

  if (
    tokenAddress === "0x0000000000000000000000000000000000000000" ||
    tokenAddress === ethers.constants.AddressZero
  ) {
    const balance = await provider.getBalance(account);
    return ethers.utils.formatEther(balance);
  }

  const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
  const balance = await token.balanceOf(account);
  const decimals = await token.decimals();
  return ethers.utils.formatUnits(balance, decimals);
};

export const listenForSettlement = (
  onSettled: (intentHash: string) => void,
) => {
  const provider = getPublicProvider();

  const vaultAddress = import.meta.env.VITE_VAULT_ADDRESS;
  const vault = new ethers.Contract(vaultAddress, FULL_ABI, provider);

  const filter = vault.filters.IntentSettled();
  vault.on(filter, (intentHash: string) => {
    onSettled(intentHash);
  });

  return () => {
    vault.off(filter, onSettled);
  };
};

export const signAndLockIntent = async (
  params: {
    amount: string;
    sourceAsset: string;
    destChainId: number;
    destAsset: string;
    minDestAmount: string;
  },
  account: string,
  walletProvider: any,
  onStatusChange: (status: any) => void,
) => {
  const provider = getWeb3Provider(walletProvider);

  const signer = provider.getSigner();
  const vaultAddress = import.meta.env.VITE_VAULT_ADDRESS;
  const chainId = Number(import.meta.env.VITE_CHAIN_ID);

  const vault = new ethers.Contract(vaultAddress, FULL_ABI, signer);


  const intent = {
    user: account,
    sourceAsset: params.sourceAsset,
    amount: ethers.utils.parseUnits(params.amount, 18),
    destChainId: params.destChainId,
    destRecipient: account,
    destAsset: params.destAsset,
    minDestAmount: ethers.utils.parseUnits(params.minDestAmount, 18),
    nonce: (await vault.nonces(account)).toNumber(),
    deadline: Math.floor(Date.now() / 1000) + 3600,
    extraData: "0x",
  };

  const domain = {
    name: "PolkadotIntentProtocol",
    version: "1.0.0",
    chainId: chainId,
    verifyingContract: vaultAddress,
  };

  const types = {
    Intent: [
      { name: "user", type: "address" },
      { name: "sourceAsset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "destChainId", type: "uint256" },
      { name: "destRecipient", type: "address" },
      { name: "destAsset", type: "address" },
      { name: "minDestAmount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "extraData", type: "bytes" },
    ],
  };

  const userAddress = await signer.getAddress();

  // 1. Check Allowance for ERC20 assets
  if (intent.sourceAsset !== ethers.constants.AddressZero) {
    onStatusChange("approving");
    const token = new ethers.Contract(intent.sourceAsset, erc20Abi, signer);
    const allowance = await token.allowance(userAddress, vaultAddress);
    
    if (allowance.lt(intent.amount)) {
      console.log("Insufficient allowance. Requesting approval...");
      const approveTx = await token.approve(vaultAddress, ethers.constants.MaxUint256);
      await approveTx.wait();
      console.log("Approval confirmed.");
    }
  }

  onStatusChange("signing");
  try {
    const signature = await (signer as any)._signTypedData(
      domain,
      types,
      intent,
    );

    onStatusChange("verifying");
    const txOptions: any = {};
    if (intent.sourceAsset === ethers.constants.AddressZero) {
      txOptions.value = intent.amount;
    }
    const tx = await vault.lockIntent(intent, signature, txOptions);
    await tx.wait();

    return tx.hash;
  } catch (error: any) {
    if (error.code === 4001) throw new Error("User denied signature");
    throw error;
  }
};

import { PRICE_MAP } from "../constants/config";

export const getLivePrice = async (fromSymbol: string, toSymbol: string) => {
  try {
    const symbolMap: Record<string, string> = {
      PAS: "polkadot",
      USDT: "tether",
      USDC: "usd-coin",
    };

    const fromId = symbolMap[fromSymbol.toUpperCase()];
    const toId = symbolMap[toSymbol.toUpperCase()];

    if (!fromId || !toId) return 1.0;

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${fromId},${toId}&vs_currencies=usd`,
    );
    const data = await response.json();

    const fromPrice = data[fromId]?.usd || 1;
    const toPrice = data[toId]?.usd || 1;

    return fromPrice / toPrice;
  } catch (err) {
    console.error("Price fetch error, using fallback MAP:", err);
    return PRICE_MAP[`${fromSymbol.toUpperCase()}-${toSymbol.toUpperCase()}`] || 1.0;
  }
};
