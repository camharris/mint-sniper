const { ethers } = require("hardhat");

const launchTime=Date.now()-86400000; // current time - 24hr

async function main() {
    const TubbiesFake = await ethers.getContractFactory("Tubbies");
    const tubbiesFake = await TubbiesFake.deploy(
            // launchTime,
            "ipfs://QmPa7gm3RZSnPvw4L8wdMCLwgh2pATC1WJe43RinDNd74x",  // _BASEURI
            "ipfs://QmPa7gm3RZSnPvw4L8wdMCLwgh2pATC1WJe43RinDNd74x",  // _UNREVEALEDURI
            "0x0000000000000000000000000000000000000000", // _LINKTOKEN
            "0x0000000000000000000000000000000000000000", // _LINKCOORDINATOR

            );
    console.log("Tubbies deployed to: ", tubbiesFake.address)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });