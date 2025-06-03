// @ts-nocheck
import styled from 'styled-components';
import * as R from 'ramda';
import { CategorizeTransactionBoot } from './CategorizeTransactionBoot';
import { CategorizeTransactionForm } from './CategorizeTransactionForm';
import { withBanking } from '@/containers/CashFlow/withBanking';

function CategorizeTransactionContentRoot({
  transactionsToCategorizeIdsSelected,
  onlyCategorize, 
}) {
  return (
    <CategorizeTransactionBoot
      uncategorizedTransactionsIds={transactionsToCategorizeIdsSelected}
    >
      <CategorizeTransactionDrawerBody>
        <CategorizeTransactionForm onlyCategorize={onlyCategorize} /> 
      </CategorizeTransactionDrawerBody>
    </CategorizeTransactionBoot>
  );
}

export const CategorizeTransactionContent = R.compose(
  withBanking(({ transactionsToCategorizeIdsSelected }) => ({
    transactionsToCategorizeIdsSelected,
  }))
)(CategorizeTransactionContentRoot);

const CategorizeTransactionDrawerBody = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;
