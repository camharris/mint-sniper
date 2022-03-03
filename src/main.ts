import * as ethers from "ethers";
import { Wallet, Contract } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import {
    WALLET_PRIVATE_KEY,
    PROVIDER_WSS,
    FLASHBOTS_ENDPOINT,
    PUBLIC_WALLET,
    NFTS,
    NETWORK,
} from "../constants";
import { adidasOriginalFakeAbi, tubbiesAbi } from "./abi";
import { tempWalletKeys } from "./secrets";
import { Minter } from "./Minter";

const provider = new ethers.providers.WebSocketProvider(PROVIDER_WSS);
const mainWallet = new ethers.Wallet(WALLET_PRIVATE_KEY);
const walletSigner = mainWallet.connect(provider);

function createTempWallets(num: number) {
    var wallets: Wallet[] = [];
    for (let i = 0; i < num; i++) {
        var wallet = ethers.Wallet.createRandom();
        console.log(
            `created wallet #${i + 1}: ${wallet.address} : ${wallet.privateKey}`
        );
        wallets?.push(wallet);
    }
    return wallets;
}

async function fundWallets(wallets, nonce, fundAmt, estGas) {
    // Fund wallets
    for (const k in wallets) {
        const wallet = wallets[k];

        var tx = {
            from: PUBLIC_WALLET,
            to: wallet.address,
            value: fundAmt,
            nonce: nonce,
            gasLimit: ethers.utils.hexlify("0x100000"), // 100000,
            gasPrice: estGas,
        };
        console.log(
            `Funding wallet: ${wallet.address} with ${ethers.utils.formatEther(
                fundAmt.toString()
            )} ETH`
        );
        const txObj = await walletSigner.sendTransaction(tx);
        console.log(txObj.hash);
        nonce++;
    }
}

async function transferNfts(fromWallets, nft, tokenId) {
    // I think some things are broken here due to the fact that testin is on ERC1155. The token ID will change for 721
    // We will need to do some "transfer all tokens this address owns for this contract" thing instead.
    for (const k in fromWallets) {
        const wallet = fromWallets[k];
        const tempSigner = wallet.connect(provider);
        const tempContractInstance = new ethers.Contract(
            nft,
            NFTS[nft]["abi"],
            tempSigner
        );

        // If mints are successful transfer ownership
        const transferTx = await tempContractInstance.safeTransferFrom(
            wallet.address, //from
            PUBLIC_WALLET, //to
            tokenId, //id
            1, // amount
            0x0 //empty data
        );
        console.log(
            `TransferOwner from ${wallet.address} hash: ${transferTx.hash}`
        );

        // Todo maybe bundle these two transactions and send them to flashbots..
    }
}

async function drainFunds(fromWallets, estGas) {
    for (const k in fromWallets) {
        const wallet = fromWallets[k];
        const tempSigner = wallet.connect(provider);

        // check if there's remaining funds and return to bot's wallet
        const balance = await provider.getBalance(wallet.address);

        // Estimate gas again
        estGas = await provider.getGasPrice();
        const gasLimit = 21000; // The exact cost (in gas) to send to an Externally Owned Account (EOA)
        // balance after estimated tx fees
        const balanceAfterGas = balance.sub(estGas.mul(gasLimit));

        // if balance is greaterThanEqual zero converted to bignum
        if (balanceAfterGas.gte(ethers.BigNumber.from(0))) {
            const nonce = await provider.getTransactionCount(
                wallet.address,
                "latest"
            );
            const tx = {
                from: wallet.address,
                to: PUBLIC_WALLET,
                value: balanceAfterGas,
                nonce: nonce,
                gasLimit: gasLimit,
                gasPrice: estGas,
            };
            var resp = await tempSigner.sendTransaction(tx);
            console.log(
                `Return funds from ${wallet.address} hash: ${resp.hash}`
            );
        }
    }
}

async function getBalance(contract, tokenId) {
    return await contract.balanceOf(PUBLIC_WALLET, tokenId);
}

function loadTempWallets() {
    var wallets: Wallet[] = [];
    for (let i = 0; i < tempWalletKeys.length; i++) {
        var wallet = new ethers.Wallet(tempWalletKeys[i]);
        console.log(`loaded wallet ${wallet.address}`);
        wallets?.push(wallet);
    }
    return wallets;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
async function sleepTill(time) {
    let currentDate = Date.now();
    console.log(`Sleeping until ${time}`);
    while (currentDate < time) {
        await sleep(1000);
        currentDate = Date.now();
    }
}

async function init() {
    console.log(`RUNNING ON NETWORK: ${NETWORK}`);
    for (var nft in NFTS) {
        console.log(
            `Starting batch mint of ${NFTS[nft]["numToMint"]} for NFT ${NFTS[nft]["slug"]}`
        );
        var contract = new ethers.Contract(nft, NFTS[nft]["abi"], provider);

        // Hard code price for Tubbie mint
        var price = ethers.utils.parseUnits("0.1", "ether");
        // var price = await contract.mintPrice();

        // Calculate what the estimated network gas fees + plush nft price
        // TODO: Should probably add a little more than needed in case gas fees change
        var estGas = await provider.getGasPrice();

        // Generate/Get wallets
        // const tempWallets = createTempWallets(NFTS[nft]['numToMint']); // only for testing?
        const tempWallets = loadTempWallets();

        // Sleep until mint start time
        const startTime = await contract.startSaleTimestamp();
        await sleepTill(startTime);

        // Mint with temp wallets
        for (const k in tempWallets) {
            var tokenId: number = 0; // Assign actual token Id in mint process
            const wallet = tempWallets[k];
            const tempSigner = wallet.connect(provider);

            const tempContractInstance = new ethers.Contract(
                nft,
                NFTS[nft]["abi"],
                tempSigner
            );

            const feeData = await provider.getFeeData();

            // *** THIDS SHOULD BE THE MODUKAR FUNCTION
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
                }
            );

            const minter = new Minter(
                nft,
                provider,
                wallet,
                adidasOriginalFakeAbi
            );
            await minter.setup();

            // THIS NEEDS TO BE IN PLACE, NOT THE ABOVE
            // const mintTx = await minter.mint1155(1);
            const receipt = await provider.getTransactionReceipt(mintTx.hash);

            // look up token ID
            // https://stackoverflow.com/questions/67803090/how-to-get-erc-721-tokenid
            // Convert hex str to int https://forum.moralis.io/t/convert-hex-string-to-integer-ethers-js-solved/8663/2
            const hexTokenId = Number(receipt.logs[0].topics[3]);
            tokenId = parseInt(hexTokenId.toString());
            // This ^ is hard to track. AdidasOriginals always mints tokenID 0
            // This is going to be specific of the contract in question. read mint()/purchase() in contract

            console.log(
                `Mint token: ${tokenId} from ${wallet.address} hash: ${mintTx.hash}`
            );
            // Todo validate results of transaction
        }

        // TODO: Transfer nft
        // TODO: Drain funds from temp wallets
        console.log(`Minting of ${NFTS[nft]["slug"]} has completed`);
        // TODO: Get main wallet balance
        console.log(`Bot's wallet balance of Token: = ${undefined}`);
    }
    provider.destroy();
}

init();
