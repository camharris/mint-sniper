const { task } = require('hardhat/config');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-waffle");

task("accounts", "Print the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  solidity: "0.8.9",
};
require("@nomiclabs/hardhat-etherscan");
etherscan: {
  apiKey: "VWV4R41KWGAVQUYZGR5Z1CE1X41XQ7KJRY"
}