import type { Coin } from '@fuel-wallet/types';
import { AddressType } from '@fuel-wallet/types';
import { useInterpret, useSelector } from '@xstate/react';
import {
  bn,
  calculatePriceWithFactor,
  GAS_PRICE_FACTOR,
  TransactionCoder,
  TransactionType,
} from 'fuels';
import { useEffect, useMemo } from 'react';

import type { TransactionMachineState } from '../machines';
import { TRANSACTION_ERRORS, transactionMachine } from '../machines';
import type { TxInputs } from '../services';
import type { TxOutputCoin } from '../types';
import { TxStatus } from '../types';
import {
  getChangeOutputFromTx,
  getCoinInputsFromTx,
  getCoinOutputsFromTx,
  getContractInputFromIndex,
  getContractOutputsFromTx,
} from '../utils';

const selectors = {
  isFetching: (state: TransactionMachineState) => state.matches('fetching'),
  isFetchingResult: (state: TransactionMachineState) =>
    state.matches('fetchingResult'),
  context: (state: TransactionMachineState) => state.context,
};

type UseTransactionProps = {
  txId?: string;
  providerUrl?: string;
  waitProviderUrl?: boolean;
};

export function useTransaction({
  txId: txIdInput,
  providerUrl,
  waitProviderUrl,
}: UseTransactionProps) {
  const service = useInterpret(() => transactionMachine);
  const { send } = service;
  const isFetching = useSelector(service, selectors.isFetching);
  const isFetchingResult = useSelector(service, selectors.isFetchingResult);
  const context = useSelector(service, selectors.context);

  const { txResponse, error, txStatus, tx, txResult, receiptsFee, txId } =
    context;

  const {
    coinInputs,
    coinOutputs,
    contractOutputs,
    changeOutput,
    contractInput,
  } = useMemo(() => {
    if (!tx) return { coinInputs: [], coinOutputs: [], contractOutputs: [] };

    const coinInputs = getCoinInputsFromTx(tx);
    const coinOutputs = getCoinOutputsFromTx(tx);
    const contractOutputs = getContractOutputsFromTx(tx);
    const changeOutput = getChangeOutputFromTx(tx);
    const contractInput = getContractInputFromIndex({
      tx,
      inputIndex: contractOutputs?.[0]?.inputIndex,
    });

    return {
      coinInputs,
      coinOutputs,
      contractOutputs,
      changeOutput,
      contractInput,
    };
  }, [tx]);

  const {
    outputsToSend,
    outputAmount,
    txFrom,
    txTo,
    forwardedAmount,
    toAssetAmounts,
    amountSent,
  } = useMemo(() => {
    const inputPublicKey = coinInputs[0]?.owner;
    const outputsToSend = coinOutputs.filter(
      (value) => value.to !== inputPublicKey
    );
    const outputAmount = outputsToSend.reduce(
      (acc, value) => acc.add(value.amount),
      bn(0)
    );
    const forwardedAmount = bn(coinInputs[0]?.amount)
      .sub(bn(receiptsFee))
      .sub(bn(changeOutput?.amount).sub(outputsToSend[0]?.amount));
    const amountSent = contractInput ? forwardedAmount : outputAmount;

    const toAssetAmounts: Coin[] | TxOutputCoin[] = contractInput
      ? [
          {
            amount: forwardedAmount,
            assetId: coinInputs[0].assetId.toString(),
          },
        ]
      : outputsToSend;

    const txFrom = inputPublicKey?.toString()
      ? {
          type: AddressType.account,
          address: inputPublicKey?.toString(),
        }
      : undefined;
    let txTo;
    if (contractInput) {
      txTo = {
        type: AddressType.contract,
        address: contractInput.contractID,
      };
    } else if (outputsToSend[0]?.to.toString()) {
      txTo = {
        type: AddressType.account,
        address: outputsToSend[0]?.to.toString(),
      };
    }

    // if (tx?.type === TransactionType.Create) {
    // }

    return {
      outputsToSend,
      outputAmount,
      contractInput,
      txFrom,
      txTo,
      forwardedAmount,
      toAssetAmounts,
      amountSent,
    };
  }, [
    coinInputs,
    coinOutputs,
    contractOutputs,
    receiptsFee,
    changeOutput,
    contractInput,
  ]);

  const isTxTypeMint = tx?.type === TransactionType.Mint;
  const isTxTypeCreate = tx?.type === TransactionType.Create;
  const isTxPending = txStatus === TxStatus.pending;
  const isTxFailed = txStatus === TxStatus.error;
  const isInvalidTxId = error === TRANSACTION_ERRORS.INVALID_ID;
  const isTxNotFound = error === TRANSACTION_ERRORS.NOT_FOUND;
  const isTxReceiptsNotFound = error === TRANSACTION_ERRORS.RECEIPTS_NOT_FOUND;
  const shouldShowAlert =
    isTxNotFound || isInvalidTxId || isTxPending || isTxFailed;
  const shouldShowTx = tx && !isFetching && !isInvalidTxId && !isTxNotFound;
  const shouldShowTxDetails =
    shouldShowTx && !isFetchingResult && !isTxTypeMint;
  const isFetchingDetails = isFetching || isFetchingResult;

  const transactionBytes = tx ? new TransactionCoder().encode(tx) : [];
  const witnessSize =
    tx?.witnesses?.reduce((total, w) => total + w.dataLength, 0) || 0;
  const txChargeableBytes = bn(transactionBytes.length - witnessSize);

  const contractGasUsed = calculatePriceWithFactor(
    txChargeableBytes,
    bn(4),
    // gasPerByte,
    GAS_PRICE_FACTOR
  );

  const txFee = isTxTypeCreate
    ? calculatePriceWithFactor(
        contractGasUsed,
        bn(tx?.gasPrice),
        GAS_PRICE_FACTOR
      )
    : receiptsFee;

  function getTransaction(input: TxInputs['fetch']) {
    send('GET_TRANSACTION', { input });
  }

  useEffect(() => {
    if (txIdInput && (providerUrl || !waitProviderUrl)) {
      getTransaction({ txId: txIdInput, providerUrl });
    }
  }, [txIdInput, providerUrl, waitProviderUrl]);

  return {
    handlers: {
      getTransaction,
    },
    isFetching,
    isFetchingDetails,
    isFetchingResult,
    txResponse,
    isInvalidTxId,
    isTxNotFound,
    isTxReceiptsNotFound,
    txStatus,
    tx,
    txResult,
    contractInput,
    coinInputs,
    coinOutputs,
    outputsToSend,
    outputAmount,
    receiptsFee,
    txId,
    error,
    shouldShowAlert,
    shouldShowTx,
    shouldShowTxDetails,
    txFrom,
    txTo,
    txFee,
    forwardedAmount,
    toAssetAmounts,
    amountSent,
  };
}
