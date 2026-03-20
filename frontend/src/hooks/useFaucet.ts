import { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { MINT_ABI, EXPLORER_URL } from '../constants/faucet';

export const useFaucet = () => {
    const [loading, setLoading] = useState<string | null>(null);

    const mint = async (asset: any, recipientAddress: string) => {
        if (!recipientAddress) {
            toast.error("Please provide a recipient address");
            return;
        }

        let validatedAddress = "";
        try {
            validatedAddress = ethers.utils.getAddress(recipientAddress);
        } catch (e) {
            toast.error("Invalid Ethereum address format");
            return;
        }

        setLoading(asset.symbol);
        try {
            const provider = new ethers.providers.Web3Provider((window as any).ethereum);
            const signer = provider.getSigner();

            if (asset.symbol === 'PAS') {
                toast.info("PAS tokens can be requested from the Polkadot Hub Testnet Faucet");
                window.open("https://faucet.polkadot.io/", "_blank");
            } else {
                const contract = new ethers.Contract(asset.address, MINT_ABI, signer);
                const tx = await contract.mint(validatedAddress, ethers.utils.parseUnits("1000", 18));
                toast.info(`Minting 1000 ${asset.symbol}. Pending transaction...`);
                await tx.wait();
                toast.success(`Mint successful! 1000 ${asset.symbol} sent to ${validatedAddress.slice(0, 6)}. Hash: ${tx.hash.slice(0, 10)}...`, {
                    onClick: () => window.open(`${EXPLORER_URL}/tx/${tx.hash}`, '_blank')
                });
            }
        } catch (err: any) {
            console.error("Faucet error:", err);
            toast.error(err.reason || "Minting failed. Make sure you have PAS for gas.");
        } finally {
            setLoading(null);
        }
    };

    return { mint, loading };
};
