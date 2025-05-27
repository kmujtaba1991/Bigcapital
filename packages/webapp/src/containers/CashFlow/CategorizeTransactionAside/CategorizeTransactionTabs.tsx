// @ts-nocheck
import { Tab, Tabs } from '@blueprintjs/core';
import { useSelector } from 'react-redux';
import { getCategorizeIndividually } from '@/store/banking/banking.reducer';
import { MatchingBankTransaction } from './MatchingTransaction';
import { CategorizeTransactionContent } from '../CategorizeTransaction/drawers/CategorizeTransactionDrawer/CategorizeTransactionContent';
import styles from './CategorizeTransactionTabs.module.scss';

export function CategorizeTransactionTabs() {
  const defaultSelectedTabId = 'categorize';

  const categorizeIndividually = useSelector(getCategorizeIndividually);

  if (categorizeIndividually) {
    return <CategorizeTransactionContent onlyCategorize />;
  }

  return (
    <Tabs
      large
      renderActiveTabPanelOnly
      defaultSelectedTabId={defaultSelectedTabId}
      className={styles.tabs}
    >
      <Tab
        id="categorize"
        title="Categorize Transaction"
        panel={<CategorizeTransactionContent />}
      />
      <Tab
        id="matching"
        title="Matching Transaction"
        panel={<MatchingBankTransaction />}
      />
    </Tabs>
  );
}
