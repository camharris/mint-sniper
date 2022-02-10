const { ethers } = require("hardhat");

async function main() {
    const AdidasOriginalsFake = await ethers.getContractFactory("AdidasOriginals");
    const adidasOriginalsFake = await AdidasOriginalsFake.deploy("AdidasOriginals",
            "AOF","ipfs://QmPa7gm3RZSnPvw4L8wdMCLwgh2pATC1WJe43RinDNd74x",
            ["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"],[100]
            );
    console.log("AdidasOriginalFake deployed to: ", adidasOriginalsFake.address)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });