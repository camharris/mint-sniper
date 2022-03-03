import * as ethers from "ethers";
import { Wallet, Contract } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import {WALLET_PRIVATE_KEY, PROVIDER_WSS, FLASHBOTS_ENDPOINT, PUBLIC_WALLET, NFTS, NETWORK } from "../constants";
import { adidasOriginalFakeAbi, tubbiesAbi } from "./abi";
import { tempWalletKeys } from "./secrets";
// import * as delay from "delay";

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

function loadTempWallets(){
    var wallets: Wallet[] = [];
    for (let i = 0; i < tempWalletKeys.length; i++ ){
        var wallet = new ethers.Wallet(tempWalletKeys[i]);
        console.log(`loaded wallet ${wallet.address}`);
        wallets?.push(wallet);
    }
    return wallets;
}


const delay2 = (ms: number) => new Promise(res => setTimeout(res, ms));

async function init() {
    const flashbotsProvider = await FlashbotsBundleProvider.create(provider, ethers.Wallet.createRandom(), FLASHBOTS_ENDPOINT)
    console.log(`RUNNING ON NETWORK: ${NETWORK}`) 
    for (var nft in NFTS) {

        console.log(`Starting batch mint of ${NFTS[nft]['numToMint']} for NFT ${NFTS[nft]['slug']}`);
        var contract = new ethers.Contract(nft, NFTS[nft]['abi'], provider);
       


        // Hard code price for Tubbie mint
        var price = ethers.utils.parseUnits('0.1', "ether")

        var tokenId = 0 // Assign actual token Id in mint process

        // Calculate what the estimated network gas fees + plush nft price
        // TODO: Should probably add a little more than needed in case gas fees change
        var estGas = await provider.getGasPrice()
        // estGas = estGas.mul(ethers.BigNumber.from(2)) // double to cover tansferFrom amount

        // The max gas we're willing to pay 0.2  which is twice the token price
        var maxGas = estGas.add(ethers.utils.parseUnits('0.2', 'ether'))


        var fundAmt = maxGas.add(price);
   
 

    
        // Generate wallets
        // const tempWallets = createTempWallets(NFTS[nft]['numToMint']);
        const tempWallets = loadTempWallets();
      
        
        var nonce = await provider.getTransactionCount(PUBLIC_WALLET, "latest"); 
        // Fund wallets
        // for (const k in tempWallets) {
        //     const wallet = tempWallets[k];
            
        //     var tx = {
        //         from: PUBLIC_WALLET,
        //         to: wallet.address,
        //         value: fundAmt,
        //         nonce: nonce,
        //         gasLimit: ethers.utils.hexlify("0x100000"), // 100000,
        //         gasPrice: estGas
        //     }
        //     console.log(`Funding wallet: ${wallet.address} with ${ethers.utils.formatEther(fundAmt.toString())} ETH`);
        //     const txObj = await walletSigner.sendTransaction(tx);
        //     console.log(txObj.hash);
        //     nonce++; 
        // }


        // Sleep until start tune 
        const startTime = await contract.startSaleTimestamp();
        let currentDate = Date.now();
        console.log(`Sleeping until ${startTime}`);
        while (currentDate < startTime) {
            await delay2(1000);
            // await delay(10000);
            currentDate = Date.now();
        } 

        // Mint with temp wallets
        for (const k in tempWallets) {
            const wallet = tempWallets[k];
            const tempSigner = wallet.connect(provider);
            const nonce = await provider.getTransactionCount(wallet.address, "latest"); 

            const tempContractInstance = new ethers.Contract(nft, NFTS[nft]['abi'], tempSigner)

            const feeData = await provider.getFeeData();

            // CHANGE THE MINT FUNCTION FOR TUBBIES !!!!
            // const mintTx = await tempContractInstance.purchase(1, {value: price});
            const mintTx = await tempContractInstance.mintFromSale(
                1, // number to mint 
                {
                    value: price,
                    maxFeePerGas: feeData["maxFeePerGas"]?.mul(2),
                    maxPriorityFeePerGas: feeData["maxPriorityFeePerGas"], //?.mul(2),
                    // gasPrice: feeData["gasPrice"]?.mul(2),
                    // gasLimit: feeData["gasPrice"], //?.mul(2)

                });


            const receipt = await provider.getTransactionReceipt(mintTx.hash);
            // look up token ID
            // https://stackoverflow.com/questions/67803090/how-to-get-erc-721-tokenid
            // Convert hex str to int https://forum.moralis.io/t/convert-hex-string-to-integer-ethers-js-solved/8663/2
            const hexTokenId = Number(receipt.logs[0].topics[3]);
            tokenId = parseInt(hexTokenId.toString());
            // This ^ is hard to track. AdidasOriginals always mints tokenID 0
            // This is going to be specific of the contract in question. read mint()/purchase() in contract 
            // if (NETWORK == "localhost") {
            //     tokenId = 0;
            // }
            

            console.log(`Mint token: ${tokenId} from ${wallet.address} hash: ${mintTx.hash}`);            
            // Todo validate results of transaction
        } 
            

        // Transfer nft
        for (const k in tempWallets) {
            const wallet = tempWallets[k];
            const tempSigner = wallet.connect(provider);
            const tempContractInstance = new ethers.Contract(nft, NFTS[nft]['abi'], tempSigner)

            // If mints are successful transfer ownership 
            const transferTx = await tempContractInstance.safeTransferFrom(
                    wallet.address, //from    
                    PUBLIC_WALLET, //to
                    tokenId, //id
                    1,// amount
                    0x0 //empty data
                    );
            console.log(`TransferOwner from ${wallet.address} hash: ${transferTx.hash}`);            

            // Todo maybe bundle these two transactions and send them to flashbots..
        }



        // Drain funds from temp wallets 
        for (const k in tempWallets) {
            const wallet = tempWallets[k];
            const tempSigner = wallet.connect(provider);

            var nonce = await provider.getTransactionCount(wallet.address, "latest"); 
            // check if there's remaining funds and return to bot's wallet
            const balance = await provider.getBalance(wallet.address);

            // Estimate gas again
            estGas = await provider.getGasPrice();
            const gasLimit = 21000;  // The exact cost (in gas) to send to an Externally Owned Account (EOA)
            // balance after estimated tx fees
            const balanceAfterGas = balance.sub(estGas.mul(gasLimit));

            // if balance is greaterThanEqual zero converted to bignum
            if (balanceAfterGas.gte(ethers.BigNumber.from(0))) {
                const nonce = await provider.getTransactionCount(wallet.address, "latest");
                const tx = {
                    from: wallet.address,
                    to: PUBLIC_WALLET,
                    value: balanceAfterGas,
                    nonce: nonce,
                    gasLimit: gasLimit,
                    gasPrice: estGas
                }
                var resp = await tempSigner.sendTransaction(tx);
                console.log(`Return funds from ${wallet.address} hash: ${resp.hash}`);               
            }           
        }


        console.log(`Minting of ${NFTS[nft]['slug']} has completed`);
        var walletTokenBalance = await contract.balanceOf(PUBLIC_WALLET, tokenId)
        console.log(`Bot's wallet balacne of TokenId: #${tokenId} = ${walletTokenBalance.toString()}`);
    }
    process.exit(0)
    
}

init()