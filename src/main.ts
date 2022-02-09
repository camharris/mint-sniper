import * as ethers from "ethers";
import { Wallet } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import {WALLET_PRIVATE_KEY, PROVIDER_WSS, FLASHBOTS_ENDPOINT, PUBLIC_WALLET, NFTS } from "../constants";

const provider = new ethers.providers.WebSocketProvider(PROVIDER_WSS);
const mainWallet = new ethers.Wallet(WALLET_PRIVATE_KEY);
const walletSigner = mainWallet.connect(provider); 



function createTempWallets(num: number){
    var wallets: Wallet[] = [];
    for (let i = 0; i < num; i++){
        var wallet = ethers.Wallet.createRandom()
        console.log(`created wallet #${i+1}: ${wallet.address}`)
        wallets?.push(wallet)
    }
    return wallets
}


async function init() {
    const flashbotsProvider = await FlashbotsBundleProvider.create(provider, ethers.Wallet.createRandom(), FLASHBOTS_ENDPOINT)
    
    for (var nft in NFTS) {

        console.log(`Starting batch mint of ${NFTS[nft]['numToMint']} for NFT ${NFTS[nft]['slug']}`);
        var contract = new ethers.Contract(nft, NFTS[nft]['abi'], provider);
        var price = await contract.mintPrice();

        // Calculate what the estimated network gas fees + plush nft price
        // TODO: Should probably add a little more than needed in case gas fees change
        var estGas = await provider.getGasPrice();
        var fundAmt = estGas.add(ethers.BigNumber.from(price));


        // Generate wallets
        const tempWallets = createTempWallets(NFTS[nft]['numToMint']);
        
        // Fund wallets
        for (const k in tempWallets) {
            const wallet = tempWallets[k];
            var tx = {
                from: PUBLIC_WALLET,
                to: wallet.address,
                value: fundAmt,
                nonce: provider.getTransactionCount(PUBLIC_WALLET, "latest"),
                gasLimit: ethers.utils.hexlify("0x100000"), // 100000,
                gasPrice: estGas
            }

            console.log(`Funding wallet: ${wallet.address}`)
            walletSigner.sendTransaction(tx).then((txObj) => {
                console.log(txObj)
            })

        }


    }
    
}

init()