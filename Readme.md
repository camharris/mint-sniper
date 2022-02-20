# Mint Sniper Bot

This bot uses a primary wallet which it expects to contain the needed funds. It expects `./constants.ts` to have a configured target contract(s). When executed the bot will:
- Create # of temporarily wallets 
- fund the wallets based on the current mint price and gas price
- attempt to mint once with each wallet
- transfer the minted token to the primary wallet
- transfer remaining funds to primary wallet


### Development 
Node version `v16.13.2` is being managed with nvm. 
Initilize local dev environment: 
```
$ cd mint-sniper
$ npm ci
~~~
$ npx hardhat node 
# In another shell
$ npx hardhat compile
$ npx hardhat run --network localhost scripts/deploy.js # To deploy test contract
$ tsc-node src/main.ts
```

Getting a wallets balance locally:
```
$ npx hardhat balance --network localhost --account 0x83369c9e2DA6a0c81AB0914974ca183DE393FDc3 
0.100000001807702197 ETH
```


### Running
Before running export the private key for the primary wallet
```
export WALLET_PRIVATE_KEY=supersecretprivatekey 
```
