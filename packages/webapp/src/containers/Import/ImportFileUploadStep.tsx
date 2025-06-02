// @ts-nocheck
import { Callout, Classes, Intent, Switch } from '@blueprintjs/core';
import { Stack } from '@/components';
import { ImportDropzone } from './ImportDropzone';
import { ImportSampleDownload } from './ImportSampleDownload';
import { ImportFileUploadForm } from './ImportFileUploadForm';
import { ImportFileUploadFooterActions } from './ImportFileFooterActions';
import { ImportFileContainer } from './ImportFileContainer';
import { useImportFileContext } from './ImportFileProvider';
import { AlertsManager, useAlertsManager } from './AlertsManager';
import { ImportAlert } from './_types';

function ImportFileUploadCallouts() {
  const { isAlertActive } = useAlertsManager();
  return (
    <>
      {isAlertActive(ImportAlert.IMPORTED_SHEET_EMPTY) && (
        <Callout intent={Intent.DANGER} icon={null}>
          The imported sheet is empty.
        </Callout>
      )}
    </>
  );
}

export function ImportFileUploadStep() {
  const {
    exampleDownload,
    sheetColumns,
    sheetData,
    negateAmounts,
    setNegateAmounts,
    setSheetData,
  } = useImportFileContext();


  const amountColumnIndex = sheetColumns.findIndex((col) =>
    col.toLowerCase().includes('amount'),
  );

  const descriptionColumnIndex = sheetColumns.findIndex((col) =>
    col.toLowerCase().includes('description')
  );

  const handleToggleChange = (e) => {
    const isNegate = e.currentTarget.checked;
    setNegateAmounts(isNegate);

    if (amountColumnIndex !== -1) {
      const updatedData = sheetData.map((row) => {
        const newRow = [...row];
        const val = parseFloat(row[amountColumnIndex]);
        if (!isNaN(val)) {
          newRow[amountColumnIndex] = val * -1;
        }
        return newRow;
      });
      setSheetData(updatedData);
    }
  };



  return (
    <AlertsManager>
      <ImportFileUploadForm>
        <ImportFileContainer>
          <p
            className={Classes.TEXT_MUTED}
            style={{ marginBottom: 18, lineHeight: 1.6 }}
          >
            Download a sample file and compare it with your import file to
            ensure it is properly formatted. It's not necessary for the columns
            to be in the same order, you can map them later.
          </p>

          {sheetData.length > 0 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label>
                  Reverse Amount values:
                </label>
                <Switch
                  checked={negateAmounts}
                  onChange={handleToggleChange}
                />
              </div>

              <div>
                <h4>Preview Transactions:</h4>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e1e1e1', borderRadius: 6 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f5f5f5' }}>
                      <tr>
                        <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>#</th>
                        {descriptionColumnIndex !== -1 && <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Description</th>}
                        {amountColumnIndex !== -1 && <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Amount</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetData.slice(0, 10).map((row, index) => {
                        const amount = parseFloat(row[amountColumnIndex]);
                        const description = row[descriptionColumnIndex];

                        return (
                          <tr key={index}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{index + 1}</td>
                            {descriptionColumnIndex !== -1 && <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{description}</td>}
                            {amountColumnIndex !== -1 && <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{!isNaN(amount) ? amount : '-'}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {sheetData.length > 10 && (
                  <p style={{ fontSize: 12, marginTop: 8, color: '#888' }}>
                    Showing first 10 of {sheetData.length} entries...
                  </p>
                )}
              </div>
            </>
          )}

          <Stack>
            <ImportFileUploadCallouts />

            <Stack spacing={40}>
              <ImportDropzone />
              {exampleDownload && <ImportSampleDownload />}
            </Stack>
          </Stack>
        </ImportFileContainer>

        <ImportFileUploadFooterActions />
      </ImportFileUploadForm>
    </AlertsManager>
  );
}
