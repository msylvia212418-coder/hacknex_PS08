import type { Dataset } from '../../types';

export const DEMO_DATASET: Dataset = {
  id: 'ds-retail-001',
  name: 'veriproof_combined_retail.csv',
  projectId: 'proj-retail-001',
  status: 'READY',
  createdAt: '2026-10-05T09:14:22Z',
  profile: {
    rowCount: 1048575,
    columnCount: 13,
    fileSizeBytes: 147787920,
    sha256: 'a7f39b811e40c8225e01b7a4103fa790d984511d7bc281e28901fdf74a00192e',
    encoding: 'UTF-8',
    uploadedAt: '2026-10-05T09:14:22Z',
    qualityScore: 98.4,
    duplicateRowCount: 34335,
    columns: [
      {
        name: 'RowID',
        type: 'integer',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 1048575,
        min: 1,
        max: 1048575,
        sampleValues: [1, 2, 3, 4, 5]
      },
      {
        name: 'InvoiceNo',
        type: 'string',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 53628,
        sampleValues: ['536365', '536366', 'C536379', '536370', '536371']
      },
      {
        name: 'StockCode',
        type: 'string',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 5305,
        sampleValues: ['85123A', '71053', '84406B', '84029G', '22752']
      },
      {
        name: 'Description',
        type: 'string',
        nonNullCount: 1062988,
        nullCount: 4382,
        distinctCount: 5698,
        sampleValues: ['WHITE HANGING HEART T-LIGHT HOLDER', 'WHITE METAL LANTERN', 'CREAM CUPID HEARTS COAT HANGER', 'KNITTED UNION FLAG HOT WATER BOTTLE']
      },
      {
        name: 'Quantity',
        type: 'integer',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 512,
        min: -80995,
        max: 80995,
        mean: 9.55,
        stdDev: 218.08,
        sampleValues: [6, 8, 2, 32, -12]
      },
      {
        name: 'InvoiceDate',
        type: 'datetime',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 43650,
        min: '2009-12-01 07:45:00',
        max: '2011-12-09 12:50:00',
        sampleValues: ['2010-12-01 08:26:00', '2010-12-01 08:28:00', '2011-03-15 14:10:00']
      },
      {
        name: 'UnitPrice',
        type: 'numeric',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 1612,
        min: -38970.00,
        max: 38970.00,
        mean: 4.61,
        stdDev: 96.75,
        sampleValues: [2.55, 3.39, 2.75, 7.65, 4.25]
      },
      {
        name: 'CustomerID',
        type: 'integer',
        nonNullCount: 824363,
        nullCount: 243007,
        distinctCount: 5942,
        min: 12346,
        max: 18287,
        sampleValues: [17850, 13047, 12583, 13767, 15165]
      },
      {
        name: 'Country',
        type: 'string',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 43,
        sampleValues: ['United Kingdom', 'Germany', 'France', 'EIRE', 'Spain', 'Netherlands']
      },
      {
        name: 'Revenue',
        type: 'numeric',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 6890,
        min: -168469.60,
        max: 168469.60,
        mean: 18.25,
        stdDev: 378.40,
        sampleValues: [15.30, 20.34, 22.00, 15.30, -30.60]
      },
      {
        name: 'SourceDataset',
        type: 'string',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 2,
        sampleValues: ['online_retail_II_2009_2010', 'online_retail_II_2010_2011']
      },
      {
        name: 'SourcePeriod',
        type: 'string',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 2,
        sampleValues: ['2009-2010', '2010-2011']
      },
      {
        name: 'DuplicateFlag',
        type: 'boolean',
        nonNullCount: 1048575,
        nullCount: 0,
        distinctCount: 2,
        sampleValues: [0, 1]
      }
    ]
  },
  previewRows: [
    { RowID: 1, InvoiceNo: '536365', StockCode: '85123A', Description: 'WHITE HANGING HEART T-LIGHT HOLDER', Quantity: 6, InvoiceDate: '2010-12-01 08:26:00', UnitPrice: 2.55, CustomerID: 17850, Country: 'United Kingdom', Revenue: 15.30, SourceDataset: 'online_retail_II_2010_2011', SourcePeriod: '2010-2011', DuplicateFlag: 0 },
    { RowID: 2, InvoiceNo: '536365', StockCode: '71053', Description: 'WHITE METAL LANTERN', Quantity: 6, InvoiceDate: '2010-12-01 08:26:00', UnitPrice: 3.39, CustomerID: 17850, Country: 'United Kingdom', Revenue: 20.34, SourceDataset: 'online_retail_II_2010_2011', SourcePeriod: '2010-2011', DuplicateFlag: 0 },
    { RowID: 3, InvoiceNo: '536365', StockCode: '84406B', Description: 'CREAM CUPID HEARTS COAT HANGER', Quantity: 8, InvoiceDate: '2010-12-01 08:26:00', UnitPrice: 2.75, CustomerID: 17850, Country: 'United Kingdom', Revenue: 22.00, SourceDataset: 'online_retail_II_2010_2011', SourcePeriod: '2010-2011', DuplicateFlag: 0 },
    { RowID: 4, InvoiceNo: '536365', StockCode: '84029G', Description: 'KNITTED UNION FLAG HOT WATER BOTTLE', Quantity: 6, InvoiceDate: '2010-12-01 08:26:00', UnitPrice: 3.39, CustomerID: 17850, Country: 'United Kingdom', Revenue: 20.34, SourceDataset: 'online_retail_II_2010_2011', SourcePeriod: '2010-2011', DuplicateFlag: 0 },
    { RowID: 5, InvoiceNo: '536365', StockCode: '84029E', Description: 'RED WOOLLY HOTTIE WHITE HEART.', Quantity: 6, InvoiceDate: '2010-12-01 08:26:00', UnitPrice: 3.39, CustomerID: 17850, Country: 'United Kingdom', Revenue: 20.34, SourceDataset: 'online_retail_II_2010_2011', SourcePeriod: '2010-2011', DuplicateFlag: 0 }
  ]
};

export const SECONDARY_DEMO_DATASET: Dataset = {
  id: 'ds-tech-002',
  name: 'saas_arr_metrics_2025.csv',
  projectId: 'proj-tech-002',
  status: 'READY',
  createdAt: '2026-10-06T14:20:00Z',
  profile: {
    rowCount: 45200,
    columnCount: 8,
    fileSizeBytes: 6240000,
    sha256: 'f481c90a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
    encoding: 'UTF-8',
    uploadedAt: '2026-10-06T14:20:00Z',
    qualityScore: 99.1,
    duplicateRowCount: 0,
    columns: [
      { name: 'SubscriptionID', type: 'string', nonNullCount: 45200, nullCount: 0, distinctCount: 45200, sampleValues: ['SUB-1001', 'SUB-1002'] },
      { name: 'CustomerID', type: 'string', nonNullCount: 45200, nullCount: 0, distinctCount: 3890, sampleValues: ['CUST-801', 'CUST-802'] },
      { name: 'MRR', type: 'numeric', nonNullCount: 45200, nullCount: 0, distinctCount: 1420, min: 49.00, max: 12500.00, mean: 450.20, sampleValues: [299.00, 999.00] }
    ]
  },
  previewRows: [
    { SubscriptionID: 'SUB-1001', CustomerID: 'CUST-801', MRR: 299.00, PlanTier: 'Pro', ChurnRisk: 0.05 }
  ]
};

export const demoDatasetsList: Dataset[] = [
  DEMO_DATASET,
  SECONDARY_DEMO_DATASET
];
