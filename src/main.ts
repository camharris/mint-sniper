import * as ethers from "ethers";
import { Wallet } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import {WALLET_PRIVATE_KEY, PROVIDER_WSS, FLASHBOTS_ENDPOINT, PUBLIC_WALLET, NFTS, NETWORK } from "../constants";

const provider = new ethers.providers.WebSocketProvider(PROVIDER_WSS);
const mainWallet = new ethers.Wallet(WALLET_PRIVATE_KEY);
const walletSigner = mainWallet.connect(provider); 



function createTempWallets(num: number){
    var wallets: Wallet[] = [];
    for (let i = 0; i < num; i++){
        var wallet = ethers.Wallet.createRandom()
        console.log(`created wallet #${i+1}: ${wallet.address} : ${wallet.privateKey}`)
        wallets?.push(wallet)
    }
    return wallets
}




async function init() {
    const flashbotsProvider = await FlashbotsBundleProvider.create(provider, ethers.Wallet.createRandom(), FLASHBOTS_ENDPOINT)
    console.log(`RUNNING ON NETWORK: ${NETWORK}`) 
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
            var nonce = await provider.getTransactionCount(PUBLIC_WALLET, "latest"); 
            
            var tx = {
                from: PUBLIC_WALLET,
                to: wallet.address,
                value: fundAmt,
                nonce: nonce,
                gasLimit: ethers.utils.hexlify("0x100000"), // 100000,
                gasPrice: estGas
            }

            console.log(`Funding wallet: ${wallet.address}`);
            const txObj = await walletSigner.sendTransaction(tx);
            console.log(txObj.hash);

        }

        // Mint with temp wallets
        for (const k in tempWallets) {
            const wallet = tempWallets[k];
            const tempSigner = wallet.connect(provider);
            
            // const tempContract = await contract.connect(tempSigner);
            const nonce = await provider.getTransactionCount(wallet.address, "latest"); 

            const rawTx = {
                gasLimit: ethers.utils.hexlify("0x100000"),
                gasPrice: estGas,
            };
            // Populate a transaction with the call data of contract mint function 
            // https://docs.ethers.io/v5/api/signer/#Signer-populateTransaction
            const unsignedMintTx = await contract.populateTransaction.purchase(1, rawTx);
            var resp = await tempSigner.sendTransaction(unsignedMintTx);
            console.log(`Mint from ${wallet.address} hash: ${resp.hash}`);            
            // Todo validate results of resp/transaction 
            
            // If mints are successful transfer ownership 
            const unsignedTransferTx = await contract.populateTransaction.transferOwnership(PUBLIC_WALLET, rawTx);
            var resp = await tempSigner.sendTransaction(unsignedTransferTx);
            console.log(`TransferOwner from ${wallet.address} hash: ${resp.hash}`);            

            // Todo maybe bundle these two transactions and send them to flashbots..

            // check if there's remaining funds and return to bot's wallet
            const balance = await provider.getBalance(wallet.address);
            const balanceAfterGas = balance.sub(estGas);

            // if balance is greaterThanEqual zero converted to bignum
            if (balanceAfterGas.gte(ethers.BigNumber.from(0))) {
                const nonce = await provider.getTransactionCount(wallet.address, "latest");
                const tx = {
                    from: wallet.address,
                    to: PUBLIC_WALLET,
                    value: balanceAfterGas,
                    nonce: nonce,
                    gasLimit: ethers.utils.hexlify("0x100000"),
                    gasPrice: estGas
                }
                var resp = await tempSigner.sendTransaction(tx);
                console.log(`Return funds from ${wallet.address} hash: ${resp.hash}`)                
            }           
        }


            
        


    }
    
}

init()