import { useInterpret, useSelector } from '@xstate/react';
import { bn } from 'fuels';
import { useEffect, useMemo } from 'react';

import type { TransactionMachineState } from '../machines';
import { TRANSACTION_ERRORS, transactionMachine } from '../machines';
import type { TxInputs } from '../services';
import { getCoinInputsFromTx, getCoinOutputsFromTx } from '../utils';

const selectors = {
  isFetching: (state: TransactionMachineState) => state.matches('fetching'),
  isFetchingResult: (state: TransactionMachineState) =>
    state.matches('fetchingResult'),
  txResponse: (state: TransactionMachineState) => state.context?.txResponse,
  isInvalidTxId: (state: TransactionMachineState) =>
    state.context?.error === TRANSACTION_ERRORS.INVALID_ID,
  isTxNotFound: (state: TransactionMachineState) =>
    state.context?.error === TRANSACTION_ERRORS.NOT_FOUND,
  isTxReceiptsNotFound: (state: TransactionMachineState) =>
    state.context?.error === TRANSACTION_ERRORS.RECEIPTS_NOT_FOUND,
  txStatus: (state: TransactionMachineState) => state.context?.txStatus,
  tx: (state: TransactionMachineState) => state.context?.tx,
  txResult: (state: TransactionMachineState) => state.context?.txResult,
  fee: (state: TransactionMachineState) => state.context?.fee,
  txId: (state: TransactionMachineState) => state.context?.txId,
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
  const txResponse = useSelector(service, selectors.txResponse);
  const isInvalidTxId = useSelector(service, selectors.isInvalidTxId);
  const isTxNotFound = useSelector(service, selectors.isTxNotFound);
  const isTxReceiptsNotFound = useSelector(
    service,
    selectors.isTxReceiptsNotFound
  );
  const txStatus = useSelector(service, selectors.txStatus);
  const tx = useSelector(service, selectors.tx);
  const txResult = useSelector(service, selectors.txResult);
  const fee = useSelector(service, selectors.fee);
  const txId = useSelector(service, selectors.txId);

  const { coinInputs, coinOutputs, outputsToSend, outputAmount } =
    useMemo(() => {
      if (!tx)
        return { coinOutputs: [], outputsToSend: [], outputAmount: bn(0) };

      const coinInputs = getCoinInputsFromTx(tx);
      const coinOutputs = getCoinOutputsFromTx(tx);
      const inputPublicKey = coinInputs[0]?.owner;
      const outputsToSend = coinOutputs.filter(
        (value) => value.to !== inputPublicKey
      );
      const outputAmount = outputsToSend.reduce(
        (acc, value) => acc.add(value.amount),
        bn(0)
      );

      return { coinInputs, coinOutputs, outputsToSend, outputAmount };
    }, [tx]);

  function getTransaction(input: TxInputs['fetch']) {
    // TODO: remove providerUrl before finishing. this one is for testing
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
    isFetchingResult,
    txResponse,
    isInvalidTxId,
    isTxNotFound,
    isTxReceiptsNotFound,
    txStatus,
    tx,
    txResult,
    coinInputs,
    coinOutputs,
    outputsToSend,
    outputAmount,
    fee,
    txId,
  };
}
