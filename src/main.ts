import * as ethers from "ethers";
import { Wallet } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import {WALLET_PRIVATE_KEY, PROVIDER_WSS, FLASHBOTS_ENDPOINT, PUBLIC_WALLET, NFTS, NETWORK } from "../constants";
import { adidasOriginalFakeAbi } from "./abi";

const provider = new ethers.providers.WebSocketProvider(PROVIDER_WSS);
const mainWallet = new ethers.Wallet(WALLET_PRIVATE_KEY);
const walletSigner = mainWallet.connect(provider); 



function createTempWallets(num: number){
    var wallets: Wallet[] = [];
    for (let i = 0; i < num; i++){
        var wallet = ethers.Wallet.createRandom()
        // console.log(`created wallet #${i+1}: ${wallet.address} : ${wallet.privateKey}`)
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
        var estGas = await provider.getGasPrice()
        var maxGas = estGas.mul(ethers.BigNumber.from(10))
        // var maxFeePerGas = await provider. 

        var feeData = await provider.getFeeData();
        // var combinedFees = feeData.gasPrice?.add(
        //     feeData.maxFeePerGas?.add(
        //         feeData.maxPriorityFeePerGas
        //     ));
        // Triple the combinedFees for 3 potential transactions
        // combinedFees = combinedFees.mul(ethers.BigNumber.from(3));

        // var fundAmt = estGas.add(ethers.BigNumber.from(price));
        var fundAmt = estGas.add(ethers.BigNumber.from(price));
        // throw in an extra 0.1 eth to account for gas fees
        fundAmt = fundAmt.mul(ethers.BigNumber.from(2))
 

    
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
            console.log(`Funding wallet: ${wallet.address} with ${ethers.utils.formatEther(fundAmt.toString())} ETH`);
            const txObj = await walletSigner.sendTransaction(tx);
            console.log(txObj.hash);

        }

        // Mint with temp wallets
        for (const k in tempWallets) {
            const wallet = tempWallets[k];
            const tempSigner = wallet.connect(provider);

            const tempContractInstance = new ethers.Contract(nft, adidasOriginalFakeAbi, tempSigner)

            const nonce = await provider.getTransactionCount(wallet.address, "latest"); 

            const mintTx = await tempContractInstance.purchase(1, {value: price});
            const receipt = await provider.getTransactionReceipt(mintTx.hash);
            // look up token ID
            // https://stackoverflow.com/questions/67803090/how-to-get-erc-721-tokenid
            // Convert hex str to int https://forum.moralis.io/t/convert-hex-string-to-integer-ethers-js-solved/8663/2
            const hexTokenId = Number(receipt.logs[0].topics[3]);
            const tokenId = parseInt(hexTokenId.toString());
            
            console.log(`Mint token: ${tokenId} from ${wallet.address} hash: ${mintTx.hash}`);            
            // Todo validate results of transaction 
            
            // If mints are successful transfer ownership 
            const transferTx = await tempContractInstance.safeTransferFrom(
                    wallet.address, //from    
                    PUBLIC_WALLET, //to
                    tokenId, //id
                    1,// amount
                    "0x0"// data
                    );
            console.log(`TransferOwner from ${wallet.address} hash: ${transferTx.hash}`);            

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