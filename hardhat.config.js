const { task } = require('hardhat/config');
require("@nomiclabs/hardhat-web3");


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

task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs) => {
    const account = web3.utils.toChecksumAddress(taskArgs.account);
    const balance = await web3.eth.getBalance(account);

    console.log(web3.utils.fromWei(balance, "ether"), "ETH");
  });

  task("amount", "Get human readable eth amount from decimal")
    .addParam("amt", "amount in decimal")
    .setAction(async (taskArgs) => {
      const convertedAmt = web3.utils.fromWei(
      taskArgs.amt, "ether"
      );
    });

module.exports = {
  solidity: "0.8.9",
};
require("@nomiclabs/hardhat-etherscan");
etherscan: {
  apiKey: "VWV4R41KWGAVQUYZGR5Z1CE1X41XQ7KJRY"
}