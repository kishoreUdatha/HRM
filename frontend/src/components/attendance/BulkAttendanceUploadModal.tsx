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
}

interface BulkAttendanceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkAttendanceUploadModal: React.FC<BulkAttendanceUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    totalRows: number;
    validRows: number;
    errors: ValidationError[];
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
    if (
      droppedFile &&
      (droppedFile.name.endsWith('.xlsx') ||
        droppedFile.name.endsWith('.xls') ||
        droppedFile.name.endsWith('.csv'))
    ) {
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
      const response = await api.get('/attendance/bulk-upload/template', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'attendance_upload_template.xlsx');
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

      const response = await api.post('/attendance/bulk-upload/validate', formData);

      setValidationResult({
        valid: response.data.success && response.data.data.errors.length === 0,
        totalRows: response.data.data.totalRows,
        validRows: response.data.data.validRows,
        errors: response.data.data.errors || [],
      });
      setStep('validate');
    } catch (error: any) {
      console.error('Validation failed:', error);
      alert(error.response?.data?.message || 'Validation failed');
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

      const response = await api.post('/attendance/bulk-upload', formData);

      setUploadResult(response.data.data);
      setStep('result');

      if (response.data.data.successCount > 0) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.message || 'Upload failed');
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
          <h2 className="text-xl font-semibold text-secondary-900">
            Bulk Upload Attendance
          </h2>
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
              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <HiDocumentText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900">
                      Bulk Attendance Upload
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Upload an Excel file with attendance records. You can mark attendance for past dates.
                      Download the template to see the required format.
                    </p>
                    <div className="mt-3 text-sm text-blue-700">
                      <strong>Required columns:</strong>
                      <ul className="list-disc ml-5 mt-1">
                        <li>Employee Code (e.g., EMP001)</li>
                        <li>Date (YYYY-MM-DD format)</li>
                        <li>Status (present, absent, late, half_day, on_leave, holiday, weekend)</li>
                      </ul>
                      <strong className="block mt-2">Optional columns:</strong>
                      <ul className="list-disc ml-5 mt-1">
                        <li>Check In Time (HH:MM format, e.g., 09:00)</li>
                        <li>Check Out Time (HH:MM format, e.g., 18:00)</li>
                        <li>Notes</li>
                      </ul>
                    </div>
                    <button
                      onClick={downloadTemplate}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
              <div
                className={`p-4 rounded-lg mb-6 ${
                  validationResult.valid
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {validationResult.valid ? (
                    <HiCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <HiExclamationCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                  )}
                  <div>
                    <h3
                      className={`font-medium ${
                        validationResult.valid ? 'text-green-800' : 'text-yellow-800'
                      }`}
                    >
                      {validationResult.valid
                        ? 'All rows are valid!'
                        : `${validationResult.errors.length} validation errors found`}
                    </h3>
                    <p className="text-sm mt-1 text-secondary-600">
                      Total rows: {validationResult.totalRows} | Valid:{' '}
                      {validationResult.validRows}
                    </p>
                  </div>
                </div>
              </div>

              {/* Errors List */}
              {validationResult.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-secondary-700 mb-2">
                    Errors:
                  </h4>
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
                    : `Upload ${validationResult.validRows} Record${
                        validationResult.validRows !== 1 ? 's' : ''
                      }`}
                </button>
              </div>
            </>
          )}

          {step === 'result' && uploadResult && (
            <>
              {/* Result Summary */}
              <div
                className={`p-6 rounded-lg text-center mb-6 ${
                  uploadResult.successCount === uploadResult.totalRows
                    ? 'bg-green-50'
                    : uploadResult.successCount > 0
                    ? 'bg-yellow-50'
                    : 'bg-red-50'
                }`}
              >
                {uploadResult.successCount === uploadResult.totalRows ? (
                  <HiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                ) : (
                  <HiExclamationCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                )}
                <h3 className="text-xl font-semibold text-secondary-900">
                  {uploadResult.successCount === uploadResult.totalRows
                    ? 'All attendance records uploaded successfully!'
                    : `${uploadResult.successCount} of ${uploadResult.totalRows} records uploaded`}
                </h3>
                <p className="text-secondary-600 mt-2">
                  Success: {uploadResult.successCount} | Failed: {uploadResult.failedCount}
                </p>
              </div>

              {/* Errors */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-red-700 mb-2">
                    Failed Rows:
                  </h4>
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

export default BulkAttendanceUploadModal;
