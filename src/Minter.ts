import { AccessList, Transaction } from "@ethersproject/transactions";
import { BigNumber } from "@ethersproject/bignumber";
import { WebSocketProvider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import * as ETHERSCAN from "etherscan-api";
import { Wallet } from "ethers";

const MAINNET_NODE_IP = process.env.MAINNET_NODE_IP;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const api = ETHERSCAN.init(ETHERSCAN_API_KEY);

const getAbiFromEtherscan = async (address: string) => {
  const res = await api.contract.getabi(address);
  const abi = JSON.parse(res.result);
  console.log("Retrieved abi from etherscan.");
  return abi;
};

export class Minter {
  private _provider: WebSocketProvider;
  private _contractAddress: string;
  private _abi: Array<Object>;
  private _wallet;
  public contractInstance;
  private _signer: any;
  private _currentGasPrice: BigNumber = BigNumber.from(10);
  private _mintPrice: number;
  constructor(
    contractAddress: string,
    provider: WebSocketProvider,
    wallet: any,
    abi?: any
  ) {
    this._provider = provider;
    this._contractAddress = contractAddress;
    this._wallet = wallet;
    this._abi = abi;
  }

  public async setup() {
    if (this._abi == null) {
      this._abi = await getAbiFromEtherscan(this._contractAddress);
    }
    this._signer = this._wallet.connect(this._provider);
    this.contractInstance = new Contract(
      this._contractAddress,
      this._abi,
      this._signer
    );
    this._mintPrice = await this.contractInstance.mintPrice();
  }

  public getContractName() {
    const name = this.contractInstance.name();
    return name;
  }

  public mint721(contract: string, amount: number): void {
    // 0x80ac58cd
    return;
  }

  public mint1155(num: number): any {
    // 0xd9b67a26
    const mintTx = this.contractInstance.purchase(num, {
      value: this._mintPrice,
    });
    return mintTx;
  }

  private txHasEnoughGas(txn: Transaction): boolean {
    const currentGasPrice: BigNumber = this._currentGasPrice;
    /**
     * 100% Threshold Set for now - Just to filter all the txs that can't be included in currrent block.
     * Change this to 80-90% for txs that are highly likely to go into future block.
     *
     * NOTE: Will need to come up with a better way to to figure out which tx are likely to go into a block.
     */
    const expectedGasPrice: BigNumber = currentGasPrice.mul(10).div(10);
    if (txn["gasPrice"].lt(expectedGasPrice)) {
      return false;
    }
    return true;
  }
  /**
   * Call this function to continuously sync gas price on the TxIngestor upon new block being mined.
   * Without calling this function the gas price will default to a constant 10 Gwei.
   */
  public syncGasPrice(): void {
    this._provider.on("block", () => {
      this._provider.getGasPrice().then((gasPrice) => {
        this._currentGasPrice = gasPrice;
        console.log(`New Block Mined, Updating Gas Price: ${gasPrice}`);
      });
    });
  }
}

// getAbiFromEtherescan("0x28472a58a490c5e09a238847f66a68a47cc76f0f").then(
//   console.log
// );

// const wsProvider = new WebSocketProvider(`http://${MAINNET_NODE_IP}:8546`);
// const minter = new Minter(
//   "0x28472a58a490c5e09a238847f66a68a47cc76f0f",
//   wsProvider
// );
// minter.setup().then(() => {
//   minter.getContractName().then(console.log);
// });
