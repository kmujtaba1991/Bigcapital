// @ts-nocheck
import { AppToaster } from '@/components';
import { useImportFileUpload } from '@/hooks/query/import';
import { Intent } from '@blueprintjs/core';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useImportFileContext } from './ImportFileProvider';
import { ImportAlert, ImportStepperStep } from './_types';
import { useAlertsManager } from './AlertsManager';
import { transformToCamelCase } from '@/utils';

const initialValues = {
  file: null,
} as ImportFileUploadValues;

interface ImportFileUploadFormProps {
  children: React.ReactNode;
}

const validationSchema = Yup.object().shape({
  file: Yup.mixed().required('File is required'),
});

interface ImportFileUploadValues {
  file: File | null;
}

export function ImportFileUploadForm({
  children,
  formikProps,
  formProps,
}: ImportFileUploadFormProps) {
  const { showAlert, hideAlerts } = useAlertsManager();
  const { mutateAsync: uploadImportFile } = useImportFileUpload();
  const {
    resource,
    params,
    setStep,
    setSheetColumns,
    setEntityColumns,
    setImportId,
  } = useImportFileContext();

  const handleSubmit = async (
    values: ImportFileUploadValues,
    { setSubmitting }: FormikHelpers<ImportFileUploadValues>,
  ) => {
    hideAlerts();
    if (!values.file) return;

    setSubmitting(true);

    const fileText = await values.file.text();
    const lines = fileText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const inflowIndex = headers.findIndex(h => ['credit', 'deposit'].includes(h));
    const outflowIndex = headers.findIndex(h => ['debit', 'withdrawal'].includes(h));


    const parseCsvLine = (line: string): string[] => {
      const result = [];
      let current = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result.map(field => field.trim());
    };

    const cleanNumber = (str: string) =>
      parseFloat(str.replace(/,/g, '').trim()) || 0;

    let finalFile = values.file; // default to original

    const safeNumber = (str: string): number => {
      const cleaned = str?.replace(/,/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    if (inflowIndex !== -1 && outflowIndex !== -1) {
      const newHeaders = headers.filter((_, i) => i !== inflowIndex && i !== outflowIndex);
      newHeaders.push('Amount');

      const newRows = lines.slice(1).map((line, index) => {
        const values = parseCsvLine(line);
        if (!values || values.length <= Math.max(inflowIndex, outflowIndex)) return null;

        const inflowStr = values[inflowIndex] ?? '';
        const outflowStr = values[outflowIndex] ?? '';

        const inflow = cleanNumber(inflowStr);
        const outflow = cleanNumber(outflowStr);

        const hasInflow = !isNaN(inflow) && inflow !== 0;
        const hasOutflow = !isNaN(outflow) && outflow !== 0;

        let amount = 0;
        if (hasInflow) {
          amount = inflow;
        } else if (hasOutflow) {
          amount = -outflow;
        }

        const baseValues = values.filter((_, i) => i !== inflowIndex && i !== outflowIndex);
        baseValues.push(amount.toFixed(2));
        return baseValues.map(v => `"${v.replace(/"/g, '""')}"`).join(',');
      }).filter(Boolean);


      const newCsv = [newHeaders.join(','), ...newRows].join('\n');
      const blob = new Blob([newCsv], { type: 'text/csv' });
      finalFile = new File([blob], 'transformed.csv', { type: 'text/csv' });
    }

    const formData = new FormData();
    formData.append('file', finalFile);
    formData.append('resource', resource);
    formData.append('params', JSON.stringify(params));

    uploadImportFile(formData)
      .then(({ data }) => {
        const _data = transformToCamelCase(data);

        setImportId(_data.import.importId);
        setSheetColumns(_data.sheetColumns);
        setEntityColumns(_data.resourceColumns);
        setStep(ImportStepperStep.Mapping);
        setSubmitting(false);
      })
      .catch(({ response: { data } }) => {
        if (
          data.errors.find(
            (er) => er.type === 'IMPORTED_FILE_EXTENSION_INVALID',
          )
        ) {
          AppToaster.show({
            intent: Intent.DANGER,
            message: 'The extenstion of uploaded file is not supported.',
          });
        }
        if (data.errors.find((er) => er.type === 'IMPORTED_SHEET_EMPTY')) {
          showAlert(ImportAlert.IMPORTED_SHEET_EMPTY);
        }
        setSubmitting(false);
      });
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      {...formikProps}
    >
      <Form {...formProps}>{children}</Form>
    </Formik>
  );
}
