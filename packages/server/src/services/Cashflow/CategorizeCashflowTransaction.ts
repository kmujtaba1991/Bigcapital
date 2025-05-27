import { Inject, Service } from 'typedi';
import { castArray } from 'lodash';
import { Knex } from 'knex';
import HasTenancyService from '../Tenancy/TenancyService';
import events from '@/subscribers/events';
import { EventPublisher } from '@/lib/EventPublisher/EventPublisher';
import UnitOfWork from '../UnitOfWork';
import {
  ICashflowTransactionCategorizedPayload,
  ICashflowTransactionUncategorizingPayload,
  ICategorizeCashflowTransactioDTO,
} from '@/interfaces';
import {
  transformCategorizeTransToCashflow,
  validateUncategorizedTransactionsNotExcluded,
  transformCategorizeSingleTransToCashflow,
} from './utils';
import { CommandCashflowValidator } from './CommandCasflowValidator';
import NewCashflowTransactionService from './NewCashflowTransactionService';

@Service()
export class CategorizeCashflowTransaction {
  @Inject()
  private tenancy: HasTenancyService;

  @Inject()
  private eventPublisher: EventPublisher;

  @Inject()
  private uow: UnitOfWork;

  @Inject()
  private commandValidators: CommandCashflowValidator;

  @Inject()
  private createCashflow: NewCashflowTransactionService;

  public async categorize(
    tenantId: number,
    uncategorizedTransactionId: number | Array<number>,
    categorizeDTO: ICategorizeCashflowTransactioDTO
  ) {
    const { UncategorizedCashflowTransaction } = this.tenancy.models(tenantId);
    const uncategorizedTransactionIds = castArray(uncategorizedTransactionId);

    // Retrieves the uncategorized transaction or throw an error.
    const oldUncategorizedTransactions =
      await UncategorizedCashflowTransaction.query()
        .whereIn('id', uncategorizedTransactionIds)
        .throwIfNotFound();

    // Validate cannot categorize excluded transaction.
    validateUncategorizedTransactionsNotExcluded(oldUncategorizedTransactions);

    // Validates the transaction shouldn't be categorized before.
    this.commandValidators.validateTransactionsShouldNotCategorized(
      oldUncategorizedTransactions
    );
    // Validate the uncateogirzed transaction if it's deposit the transaction direction
    // should `IN` and the same thing if it's withdrawal the direction should be OUT.
    this.commandValidators.validateUncategorizeTransactionType(
      oldUncategorizedTransactions,
      categorizeDTO.transactionType
    );

    // If categorizing individually, run one DB transaction per record
    if (categorizeDTO.categorizeIndividually) {
      

      for (const transaction of oldUncategorizedTransactions) {
        try {
          await this.uow.withTransaction(tenantId, async (trx: Knex.Transaction) => {
            

            const dto = transformCategorizeSingleTransToCashflow(transaction, categorizeDTO);
            

            const cashflowTransaction = await this.createCashflow.newCashflowTransaction(tenantId, dto, trx);
            

            await UncategorizedCashflowTransaction.query(trx)
              .where('id', transaction.id)
              .patch({
                categorized: true,
                categorizeRefType: 'CashflowTransaction',
                categorizeRefId: cashflowTransaction.id,
              });

            

            await this.eventPublisher.emitAsync(events.cashflow.onTransactionCategorized, {
              tenantId,
              cashflowTransaction,
              uncategorizedTransactions: [transaction],
              oldUncategorizedTransactions: [transaction],
              categorizeDTO,
              trx,
            });

            
          });
        } catch (err) {
          
          throw err; // Or log and continue to next one if partial success is acceptable
        }
      }
    } else {
      // Bulk categorization (single transaction)
      return this.uow.withTransaction(tenantId, async (trx: Knex.Transaction) => {
        

        await this.eventPublisher.emitAsync(events.cashflow.onTransactionCategorizing, {
          tenantId,
          oldUncategorizedTransactions,
          trx,
        } as ICashflowTransactionUncategorizingPayload);

        const dto = transformCategorizeTransToCashflow(oldUncategorizedTransactions, categorizeDTO);
        const cashflowTransaction = await this.createCashflow.newCashflowTransaction(tenantId, dto, trx);

        await UncategorizedCashflowTransaction.query(trx)
          .whereIn('id', uncategorizedTransactionIds)
          .patch({
            categorized: true,
            categorizeRefType: 'CashflowTransaction',
            categorizeRefId: cashflowTransaction.id,
          });

        const uncategorizedTransactions = await UncategorizedCashflowTransaction.query(trx).whereIn(
          'id',
          uncategorizedTransactionIds
        );

        await this.eventPublisher.emitAsync(events.cashflow.onTransactionCategorized, {
          tenantId,
          cashflowTransaction,
          uncategorizedTransactions,
          oldUncategorizedTransactions,
          categorizeDTO,
          trx,
        });
      });
    }
  }
}
