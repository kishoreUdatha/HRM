import React, { useState, useRef } from 'react';
import {
  HiX,
  HiCloudUpload,
  HiDownload,
  HiCheckCircle,
  HiExclamationCircle,
  HiDocumentText,
} from 'react-icons/hi';
import api from '../../services/api';

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface UploadResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: ValidationError[];
  createdEmployees: string[];
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    totalRows: number;
    validRows: number;
    errors: ValidationError[];
    availableDepartments: string[];
  } | null>(null);
  const [step, setStep] = useState<'upload' | 'validate' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResult(null);
      setUploadResult(null);
      setStep('upload');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      setValidationResult(null);
      setUploadResult(null);
      setStep('upload');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/employees/bulk-upload/template', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employee_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const validateFile = async () => {
    if (!file) return;

    setIsValidating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/employees/bulk-upload/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setValidationResult({
        valid: response.data.success,
        totalRows: response.data.data.totalRows,
        validRows: response.data.data.validRows,
        errors: response.data.data.errors,
        availableDepartments: response.data.data.availableDepartments,
      });
      setStep('validate');
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/employees/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data.data);
      setStep('result');

      if (response.data.data.successCount > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setValidationResult(null);
    setUploadResult(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">Bulk Upload Employees</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
          {step === 'upload' && (
            <>
              {/* Download Template */}
              <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
                <div className="flex items-start gap-3">
                  <HiDocumentText className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-primary-900">Download Template</h3>
                    <p className="text-sm text-primary-700 mt-1">
                      Download the Excel template with sample data and instructions for bulk upload.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                    >
                      <HiDownload className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-green-300 bg-green-50'
                    : 'border-secondary-300 hover:border-primary-400 hover:bg-primary-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <>
                    <HiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="font-medium text-green-700">{file.name}</p>
                    <p className="text-sm text-green-600 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetModal();
                      }}
                      className="mt-3 text-sm text-secondary-600 hover:text-secondary-800"
                    >
                      Choose a different file
                    </button>
                  </>
                ) : (
                  <>
                    <HiCloudUpload className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                    <p className="font-medium text-secondary-700">
                      Drag and drop your Excel file here
                    </p>
                    <p className="text-sm text-secondary-500 mt-1">
                      or click to browse (xlsx, xls, csv)
                    </p>
                  </>
                )}
              </div>

              {/* Validate Button */}
              {file && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={validateFile}
                    disabled={isValidating}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {isValidating ? 'Validating...' : 'Validate File'}
                  </button>
                </div>
              )}
            </>
          )}

          {step === 'validate' && validationResult && (
            <>
              {/* Validation Summary */}
              <div className={`p-4 rounded-lg mb-6 ${
                validationResult.valid
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-start gap-3">
                  {validationResult.valid ? (
                    <HiCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <HiExclamationCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                  )}
                  <div>
                    <h3 className={`font-medium ${validationResult.valid ? 'text-green-800' : 'text-yellow-800'}`}>
                      {validationResult.valid
                        ? 'All rows are valid!'
                        : `${validationResult.errors.length} validation errors found`}
                    </h3>
                    <p className="text-sm mt-1 text-secondary-600">
                      Total rows: {validationResult.totalRows} | Valid: {validationResult.validRows}
                    </p>
                  </div>
                </div>
              </div>

              {/* Available Departments */}
              {validationResult.availableDepartments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-secondary-700 mb-2">Available Departments:</h4>
                  <div className="flex flex-wrap gap-2">
                    {validationResult.availableDepartments.map((dept) => (
                      <span
                        key={dept}
                        className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm"
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors List */}
              {validationResult.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-secondary-700 mb-2">Errors:</h4>
                  <div className="max-h-60 overflow-y-auto border border-secondary-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Row</th>
                          <th className="px-4 py-2 text-left">Field</th>
                          <th className="px-4 py-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary-200">
                        {validationResult.errors.map((error, index) => (
                          <tr key={index} className="hover:bg-secondary-50">
                            <td className="px-4 py-2">{error.row}</td>
                            <td className="px-4 py-2 font-medium">{error.field}</td>
                            <td className="px-4 py-2 text-red-600">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={uploadFile}
                  disabled={isUploading || validationResult.validRows === 0}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isUploading
                    ? 'Uploading...'
                    : `Upload ${validationResult.validRows} Employee${validationResult.validRows !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}

          {step === 'result' && uploadResult && (
            <>
              {/* Result Summary */}
              <div className={`p-6 rounded-lg text-center mb-6 ${
                uploadResult.successCount === uploadResult.totalRows
                  ? 'bg-green-50'
                  : uploadResult.successCount > 0
                  ? 'bg-yellow-50'
                  : 'bg-red-50'
              }`}>
                {uploadResult.successCount === uploadResult.totalRows ? (
                  <HiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                ) : (
                  <HiExclamationCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                )}
                <h3 className="text-xl font-semibold text-secondary-900">
                  {uploadResult.successCount === uploadResult.totalRows
                    ? 'All employees created successfully!'
                    : `${uploadResult.successCount} of ${uploadResult.totalRows} employees created`}
                </h3>
                <p className="text-secondary-600 mt-2">
                  Success: {uploadResult.successCount} | Failed: {uploadResult.failedCount}
                </p>
              </div>

              {/* Created Employees */}
              {uploadResult.createdEmployees.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-secondary-700 mb-2">Created Employees:</h4>
                  <div className="max-h-40 overflow-y-auto bg-secondary-50 rounded-lg p-3">
                    {uploadResult.createdEmployees.map((emp, index) => (
                      <div key={index} className="py-1 text-sm text-secondary-700">
                        {emp}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {uploadResult.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-red-700 mb-2">Failed Rows:</h4>
                  <div className="max-h-40 overflow-y-auto border border-red-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Row</th>
                          <th className="px-4 py-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {uploadResult.errors.map((error, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2">{error.row}</td>
                            <td className="px-4 py-2 text-red-600">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
