import * as ethers from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import {WALLET_PRIVATE_KEY, PROVIDER_WSS, FLASHBOTS_ENDPOINT, PUBLIC_WALLET, CONTRACT_CONFIGS } from "../constants";

const provider = new ethers.providers.WebSocketProvider(PROVIDER_WSS);

function createTempWallets(num: number){
    var wallets = [];
    for (let i = 0; i < num; i++){
        var wallet = ethers.Wallet.createRandom()
        console.log(`created wallet #${i+1}: ${wallet.address}`)
        wallets.push(wallet)
    }
    return wallets
}

function fundTempWallets(amt: ethers.BigNumber ){

}

async function init() {
    const flashbotsProvider = await FlashbotsBundleProvider.create(provider, ethers.Wallet.createRandom(), FLASHBOTS_ENDPOINT)
    
    for (var config in CONTRACT_CONFIGS) {

        console.log(`Starting batch mint of ${CONTRACT_CONFIGS[config]['numToMint']} for NFT ${CONTRACT_CONFIGS[config]['slug']}`)
        var contract = new ethers.Contract(config, CONTRACT_CONFIGS[config]['abi'], provider)
        // var price = contract.getCost()

        // Generate wallets
        var tempWallets = createTempWallets(CONTRACT_CONFIGS[config]['numToMint']);

    }
    
}

init()