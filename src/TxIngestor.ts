import { AccessList, Transaction } from '@ethersproject/transactions';
import { BigNumber } from '@ethersproject/bignumber';
import { WebSocketProvider } from '@ethersproject/providers';

/**
 * Transaction Definitions: https://github.com/ethers-io/ethers.js/blob/master/packages/transactions/lib/index.d.ts#L26
 * AccessList Definition:   https://github.com/ethers-io/ethers.js/blob/master/packages/transactions/lib/index.d.ts#L3
 */
interface TxInner extends Transaction {
    hash: string;
    type: number;
    accessList: AccessList;
    blockHash: string;
    blockNumber: number;
    transactionIndex?: number;
    confirmations: number;
    from: string;
    gasPrice: BigNumber;
    gasLimit: BigNumber;
    to: string;
    value: BigNumber;
    nonce: number;
    data: string;
    r: string;
    s: string;
    v: number;
    creates?: string;
    chainId: number;
}

const TX_NULL: TxInner = {
    hash: null,
    type: null,
    accessList: null,
    blockHash: null,
    blockNumber: null,
    confirmations: null,
    from: null,
    gasPrice: null,
    gasLimit: null,
    to: null,
    value: null,
    nonce: null,
    data: null,
    r: null,
    s: null,
    v: null,
    chainId: null,
};

/**
 * Possibly add more tx types here; CONTRACT_INTERACTION, UNISWAP, NFT_MINT, etc..
 */
enum TxType {
    NULL = 'NULL',
    UNKNOWN = 'UNKNOWN',
    REGULAR = 'REGULAR', // Wallet to Wallet
    CONTRACT_DEPLOYMENT = 'CONTRACT_DEPLOYMENT',
}

export interface TxOutter {
    txInner: TxInner;
    txType: TxType;
    txIsValid: boolean;
    txMeetsGas: () => boolean;
    timeIngested: number;
    estimateGas: () => Promise<BigNumber>;
}

const getTxType = (txn: TxInner): TxType => {
    if (txn['creates'] != null && txn['to'] == null) return TxType.CONTRACT_DEPLOYMENT;
    return TxType.REGULAR;
};

const txIsValid = (txn: TxInner): boolean => {
    if (txn == null) return false;
    if ('type' in txn) {
        switch (txn.type) {
            case 0:
                if (txn['gasPrice'] == null) {
                    return false;
                }
                break;
            case 1:
                if (txn['accessList'] == null) {
                    return false;
                }
                break;
            case 2:
                if (txn['maxFeePerGas'] == null || txn['maxPriorityFeePerGas'] == null) {
                    return false;
                }
                break;
            default:
                break;
        }
    }
    /**
     * If 'to' is null here, we will mark it as invalid.
     * However, this transaction may be valid contrat creation We can tell this if the 'creates' field is set.
     * Example: 0xbb863256a210692a0d30d1adbd824b2a0317aac21bcf5601b3ab296915e8e849
     */
    if (
        txn['nonce'] == null ||
        txn['gasLimit'] == null ||
        txn['from'] == null ||
        txn['data'] == null ||
        txn['value'] == null
    ) {
        return false;
    } else if (txn['to'] == null && txn['creates'] == null) {
        return false;
    }
    return true;
};

type OnPendingHandler = (arg0: TxOutter) => void;

export class TxIngestor {
    private _provider: WebSocketProvider;
    private _currentGasPrice: BigNumber = BigNumber.from(10);
    constructor(provider: WebSocketProvider) {
        this._provider = provider;
    }

    private txHasEnoughGas(txn: TxInner): boolean {
        const currentGasPrice: BigNumber = this._currentGasPrice;
        /**
         * 100% Threshold Set for now - Just to filter all the txs that can't be included in currrent block.
         * Change this to 80-90% for txs that are highly likely to go into future block.
         *
         * NOTE: Will need to come up with a better way to to figure out which tx are likely to go into a block.
         */
        const expectedGasPrice: BigNumber = currentGasPrice.mul(10).div(10);
        if (txn['gasPrice'].lt(expectedGasPrice)) {
            return false;
        }
        return true;
    }

    private buildTxOutter(txn: TxInner): TxOutter {
        const time: number = Date.now();

        /** Unless you have a better way to handle null txs... */
        if (txn == null) {
            return {
                txInner: TX_NULL,
                txType: null,
                txIsValid: null,
                txMeetsGas: null,
                timeIngested: time,
                estimateGas: null,
            };
        }
        const isValid: boolean = txIsValid(txn);
        const txType: TxType = isValid ? getTxType(txn) : TxType.UNKNOWN;
        const meetsGas: () => boolean = isValid
            ? () => {
                  return this.txHasEnoughGas(txn);
              }
            : null;
        const estimateGasFunction = async (): Promise<BigNumber> => {
            if (!isValid || !meetsGas()) {
                return null;
            }
            let executableTx;
            if (txn.type == 2) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { gasPrice, ...remainingTx } = txn;
                executableTx = remainingTx;
            } else {
                executableTx = txn;
            }
            try {
                return await this._provider.estimateGas(executableTx);
            } catch (err) {
                // console.error(err);
                return null;
            }
        };

        const txOutter: TxOutter = {
            txInner: txn,
            txType: txType,
            txIsValid: isValid,
            /** Maybe we should have some sort of transaction handler class that will
             * maintain gas price and decide this on ingestion instead of awaiting everytime. */
            txMeetsGas: isValid ? meetsGas : null,
            timeIngested: time,
            estimateGas: estimateGasFunction,
        };
        return txOutter;
    }

    /**
     * Call this function to continuously sync gas price on the TxIngestor upon new block being mined.
     * Without calling this function the gas price will default to a constant 10 Gwei.
     */
    public syncGasPrice(): void {
        this._provider.on('block', () => {
            this._provider.getGasPrice().then((gasPrice) => {
                this._currentGasPrice = gasPrice;
                console.log(`New Block Mined, Updating Gas Price: ${gasPrice}`);
            });
        });
    }

    public onPending(handler: OnPendingHandler): void {
        this._provider.on('pending', (txHash) => {
            this._provider.getTransaction(txHash).then((tx) => {
                const txOutter: TxOutter = this.buildTxOutter(tx as TxInner);
                handler(txOutter);
            });
        });
    }
}
