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
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
    sheetColumns,
    sheetData,
    resource,
    params,
    setStep,
    setSheetColumns,
    setEntityColumns,
    setImportId,
  } = useImportFileContext();

  const exportSheetDataAsFile = (
  sheetColumns: string[],
  sheetData: string[][],
  fileType: 'xlsx' | 'csv'
): File => {
  if (fileType === 'csv') {
    const csvData = Papa.unparse([sheetColumns, ...sheetData]);
    return new File([csvData], 'updated-import.csv', { type: 'text/csv' });
  }

  const worksheet = XLSX.utils.aoa_to_sheet([sheetColumns, ...sheetData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  const fileArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const fileBlob = new Blob([fileArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return new File([fileBlob], 'updated-import.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

  const handleSubmit = async (
    values: ImportFileUploadValues,
    { setSubmitting }: FormikHelpers<ImportFileUploadValues>,
  ) => {

    console.log('Handle submit invoked...')
    
    hideAlerts();
    if (!values.file) return;

    setSubmitting(true);

    const originalFileExtension = values.file.name.split('.').pop()?.toLowerCase();

    const updatedFile = exportSheetDataAsFile(sheetColumns, sheetData, originalFileExtension);

    const formData = new FormData();
    formData.append('file', updatedFile);
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
