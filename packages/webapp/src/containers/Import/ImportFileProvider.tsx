// @ts-nocheck
import React, {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from 'react';

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type EntityColumnField = {
  key: string;
  name: string;
  required?: boolean;
  hint?: string;
  group?: string;
};

export interface EntityColumn {
  groupKey: string;
  groupLabel: string;
  fields: EntityColumnField[];
}
export type SheetColumn = string;
export type SheetMap = { from: string; to: string };

interface ImportFileContextValue {
  sheetColumns: SheetColumn[];
  setSheetColumns: Dispatch<SetStateAction<SheetColumn[]>>;

  entityColumns: EntityColumn[];
  setEntityColumns: Dispatch<SetStateAction<EntityColumn[]>>;

  sheetMapping: SheetMap[];
  setSheetMapping: Dispatch<SetStateAction<SheetMap[]>>;

  step: number;
  setStep: Dispatch<SetStateAction<number>>;

  importId: string;
  setImportId: Dispatch<SetStateAction<string>>;

  resource: string;
  description?: string;
  params: Record<string, any>;
  onImportSuccess?: () => void;
  onImportFailed?: () => void;
  onCancelClick?: () => void;
  sampleFileName?: string;

  exampleDownload?: boolean;
  exampleTitle?: string;
  exampleDescription?: string;

  parseFile: (file: File) => Promise<void>;
}
interface ImportFileProviderProps {
  resource: string;
  description?: string;
  params: Record<string, any>;
  onImportSuccess?: () => void;
  onImportFailed?: () => void;
  onCancelClick?: () => void;
  children: React.ReactNode;
  sampleFileName?: string;

  exampleDownload?: boolean;
  exampleTitle?: string;
  exampleDescription?: string;
}

const ExampleDescription =
  'You can download the sample file to obtain detailed information about the data fields used during the import.';
const ExampleTitle = 'Table Example';

const ImportFileContext = createContext<ImportFileContextValue>(
  {} as ImportFileContextValue,
);

export const useImportFileContext = () => {
  const context = useContext<ImportFileContextValue>(ImportFileContext);

  if (!context) {
    throw new Error(
      'useImportFileContext must be used within an ImportFileProvider',
    );
  }
  return context;
};

export const ImportFileProvider = ({
  resource,
  children,
  description,
  params,
  onImportFailed,
  onImportSuccess,
  onCancelClick,
  sampleFileName,

  exampleDownload = true,
  exampleTitle = ExampleTitle,
  exampleDescription = ExampleDescription,
}: ImportFileProviderProps) => {
  const [sheetColumns, setSheetColumns] = useState<SheetColumn[]>([]);
  const [entityColumns, setEntityColumns] = useState<SheetColumn[]>([]);
  const [sheetMapping, setSheetMapping] = useState<SheetMap[]>([]);
  const [importId, setImportId] = useState<string>('');
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [negateAmounts, setNegateAmounts] = useState(false);
  
  const [step, setStep] = useState<number>(0);

  const parseFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let headers: string[] = [];
    let rows: string[][] = [];

    if (ext === 'csv') {
      const text = await file.text();
      const parsed = Papa.parse<string[]>(text, {
        skipEmptyLines: true,
        header: false,
        dynamicTyping: false,
      });

      headers = parsed.data[0].map((h) => h.trim());
      rows = parsed.data.slice(1).map((row) =>
        row.map((cell) =>
          typeof cell === 'string' ? cell.replace(/(?<=\d),(?=\d)/g, '') : cell
        )
      );
    } else if (ext === 'xlsx') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      headers = (data[0] ?? []).map((h) => String(h).trim());
      rows = (data.slice(1) as string[][]).map((row) =>
        row.map((cell) =>
          typeof cell === 'string' ? cell.replace(/(?<=\d),(?=\d)/g, '') : cell
        )
      );
    }

    
    const amountIndex = headers.findIndex((col) =>
      col.toLowerCase().includes('amount')
    );

    
    if (amountIndex !== -1 && negateAmounts) {
      rows = rows.map((row) => {
        const raw = parseFloat(row[amountIndex]);
        if (!isNaN(raw)) {
          row[amountIndex] = String(raw * -1); 
        }
        return row;
      });
    }

    setSheetColumns(headers);
    setSheetData(rows); 
  };

  const value = {
    sheetColumns,
    setSheetColumns,

    entityColumns,
    setEntityColumns,

    sheetMapping,
    setSheetMapping,

    step,
    setStep,

    importId,
    setImportId,

    resource,
    description,
    params,

    onImportSuccess,
    onImportFailed,
    onCancelClick,

    sampleFileName,

    exampleDownload,
    exampleTitle,
    exampleDescription,

    sheetData,
    setSheetData,

    negateAmounts,
    setNegateAmounts,

    parseFile,
  };

  return (
    <ImportFileContext.Provider value={value}>
      {children}
    </ImportFileContext.Provider>
  );
};
