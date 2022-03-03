import { adidasOriginalFakeAbi, tubbiesAbi } from "./src/abi";


export const NETWORK = process.env.ETH_NETWORK || "localhost";

export const DRY_RUN = process.env.DRY_RUN?.toLowerCase() || "true";
//interface nft 

var constants = Object();
constants.NFTS = Object();
constants.WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || undefined




if (NETWORK == "localhost") {
    constants.PROVIDER_WSS = "ws://localhost:8545";
    constants.FLASHBOTS_ENDPOINT = "https://relay-goerli.flashbots.net";
    constants.PUBLIC_WALLET = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
    constants.WALLET_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    constants.NFTS = {
                    "0x5FbDB2315678afecb367f032d93F642f64180aa3": {
                        "slug": "Tubbies",
                        "mintFunc": "mintFromSale", // Normally "mintNFT",
                        "transferFunc": "safeTransferFrom", // Normally "safeTransferFrom",
                        // "priceFunc": "mintPrice", // Normally "mintPrice"
                        "numToMint": 3,
                        "abi": tubbiesAbi
                    }
        }
    
}


if (process.env.WALLET_PRIVATE_KEY === undefined && (NETWORK != "localhost")) {
    constants.WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
    console.error("Please provide WALLET_PRIVATE_KEY env")
    process.exit(1)
}


if (NETWORK == "mainnet") {
    constants.PROVIDER_WSS = "wss://mainnet.infura.io/ws/v3/4c975d4f46b74da09a345e92ddace875";
    constants.FLASHBOTS_ENDPOINT = "https://relay.flashbots.net";
    constants.PUBLIC_WALLET = "0xb1d9f6aa8cA5b5e37FdceA9a5891bc11Ad6B0322";
    //constants.WALLET_PRIVATE_KEY = ""
    constants.NFTS = {
                    "0xCa7cA7BcC765F77339bE2d648BA53ce9c8a262bD": {
                        "slug": "Tubbies",
                        "mintFunc": "mintFromSale", // Normally "mintNFT",
                        "transferFunc": "safeTransferFrom", // Normally "safeTransferFrom",
                        //"priceFunc": "mintPrice", // Normally "mintPrice"
                        "numToMint": 3,
                        "abi": tubbiesAbi
                    }
        }
}

if (NETWORK == "goerli") {
    constants.PROVIDER_WSS = "wss://goerli.infura.io/ws/v3/4c975d4f46b74da09a345e92ddace875";
    constants.FLASHBOTS_ENDPOINT = "https://relay-goerli.flashbots.net";
    constants.PUBLIC_WALLET = "0xb1d9f6aa8cA5b5e37FdceA9a5891bc11Ad6B0322";
    constants.NFTS = {
               "0x11dC8e0c15E43218546d63d1bE821001E1143bc4": {
                   "slug": "AdidasOriginalFake",
                   "mintFunc": "purchase", // Normally "mintNFT",
                   "transferFunc": "transferOwnership", // Normally "safeTransferFrom",
                   "priceFunc": "mintPrice", // Normally "mintPrice"
                   "numToMint": 10,
                   abi: adidasOriginalFakeAbi
               }
    }
}

if (NETWORK == "rinkeby") {
    constants.PROVIDER_WSS = "wss://rinkeby.infura.io/ws/v3/4c975d4f46b74da09a345e92ddace875";
    constants.FLASHBOTS_ENDPOINT = "https://relay-goerli.flashbots.net";
    constants.PUBLIC_WALLET = "0xb1d9f6aa8cA5b5e37FdceA9a5891bc11Ad6B0322";
    constants.CONTRACT_CONFIGS = {
               "0x39Ec448b891c476e166b3C3242A90830DB556661": {
                   "slug": "ArtSale",
                   "mintFunc": "mint" || "mintNFT",
                   "transferFunc": "" || "safeTransferFrom",
                   "priceFunc": "",
                   "numToMint": 10,
                   "abi": adidasOriginalFakeAbi, 
               }
    }
}


export const WALLET_PRIVATE_KEY = constants.WALLET_PRIVATE_KEY;
export const PROVIDER_WSS = constants.PROVIDER_WSS;
export const FLASHBOTS_ENDPOINT = constants.FLASHBOTS_ENDPOINT;
export const PUBLIC_WALLET = constants.PUBLIC_WALLET;
export const NFTS = constants.NFTS;
