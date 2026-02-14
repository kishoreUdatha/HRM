import { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Attendance from '../models/Attendance';
import mongoose from 'mongoose';

// IST timezone offset: UTC+5:30
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;

// Convert Excel serial date to JS Date
const excelDateToJSDate = (excelDate: number): Date => {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + excelDate * msPerDay);
};

// Normalize date value from Excel
const normalizeDateValue = (value: any): string => {
  if (!value) return '';

  if (typeof value === 'number') {
    const date = excelDateToJSDate(value);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(value).trim();
};

// Normalize string value
const normalizeStringValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

// Parse date string as IST and convert to UTC for storage
const parseISTDate = (dateValue: any): Date => {
  const dateStr = normalizeDateValue(dateValue);
  if (!dateStr) return new Date();

  let year: number, month: number, day: number;

  if (dateStr.includes('-')) {
    [year, month, day] = dateStr.split('-').map(Number);
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(Number);
    if (parts[2] > 31) {
      [day, month, year] = parts;
    } else {
      [day, month, year] = parts;
    }
  } else {
    return new Date(dateStr);
  }

  const istMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  istMidnight.setUTCHours(istMidnight.getUTCHours() - IST_OFFSET_HOURS);
  istMidnight.setUTCMinutes(istMidnight.getUTCMinutes() - IST_OFFSET_MINUTES);

  return istMidnight;
};

// Parse time string (HH:MM) and combine with date
const parseTimeWithDate = (dateValue: any, timeValue: any): Date | null => {
  if (!timeValue) return null;

  const timeStr = normalizeStringValue(timeValue);
  if (!timeStr) return null;

  const date = parseISTDate(dateValue);
  const timeParts = timeStr.split(':');
  if (timeParts.length < 2) return null;

  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;

  // Set time in IST, then convert to UTC
  const dateTime = new Date(date);
  dateTime.setUTCHours(hours - IST_OFFSET_HOURS);
  dateTime.setUTCMinutes(minutes - IST_OFFSET_MINUTES);

  return dateTime;
};

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

interface AttendanceRow {
  [key: string]: any;
}

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

const VALID_STATUSES = ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'weekend'];

// Download template
export const downloadTemplate = async (_req: Request, res: Response): Promise<void> => {
  try {
    const wb = XLSX.utils.book_new();

    // Sample data
    const sampleData = [
      {
        'Employee Code': 'EMP001',
        'Date': '2024-01-15',
        'Status': 'present',
        'Check In Time': '09:00',
        'Check Out Time': '18:00',
        'Notes': 'Regular day',
      },
      {
        'Employee Code': 'EMP002',
        'Date': '2024-01-15',
        'Status': 'late',
        'Check In Time': '10:30',
        'Check Out Time': '18:00',
        'Notes': 'Traffic delay',
      },
      {
        'Employee Code': 'EMP003',
        'Date': '2024-01-15',
        'Status': 'absent',
        'Check In Time': '',
        'Check Out Time': '',
        'Notes': 'Sick',
      },
      {
        'Employee Code': 'EMP001',
        'Date': '2024-01-16',
        'Status': 'on_leave',
        'Check In Time': '',
        'Check Out Time': '',
        'Notes': 'Planned leave',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Employee Code
      { wch: 12 }, // Date
      { wch: 12 }, // Status
      { wch: 15 }, // Check In Time
      { wch: 15 }, // Check Out Time
      { wch: 30 }, // Notes
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    // Create instructions sheet
    const instructionsData = [
      { 'Instructions': 'Attendance Bulk Upload Template' },
      { 'Instructions': '' },
      { 'Instructions': 'Required Fields:' },
      { 'Instructions': '1. Employee Code - The unique employee code (e.g., EMP001)' },
      { 'Instructions': '2. Date - Date in YYYY-MM-DD format (e.g., 2024-01-15)' },
      { 'Instructions': '3. Status - One of: present, absent, late, half_day, on_leave, holiday, weekend' },
      { 'Instructions': '' },
      { 'Instructions': 'Optional Fields:' },
      { 'Instructions': '1. Check In Time - Time in HH:MM format (e.g., 09:00)' },
      { 'Instructions': '2. Check Out Time - Time in HH:MM format (e.g., 18:00)' },
      { 'Instructions': '3. Notes - Any additional notes' },
      { 'Instructions': '' },
      { 'Instructions': 'Notes:' },
      { 'Instructions': '- You can add attendance for past dates' },
      { 'Instructions': '- Check In/Out times are optional but recommended for present, late, and half_day status' },
      { 'Instructions': '- Each row represents one attendance record for one employee on one day' },
      { 'Instructions': '- Duplicate entries (same employee + same date) will update existing records' },
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_upload_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
    });
  }
};

// Validate uploaded file
export const validateUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    // Parse the Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: AttendanceRow[] = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No data found in the file',
      });
      return;
    }

    const errors: ValidationError[] = [];
    let validRows = 0;

    // Get employee database connection for validation
    const employeeDbUri = process.env.EMPLOYEE_DB_URI || process.env.MONGODB_URI;
    const employeeConnection = mongoose.createConnection(employeeDbUri as string);

    const employeeSchema = new mongoose.Schema({
      employeeCode: String,
      tenantId: mongoose.Schema.Types.ObjectId,
    });
    const EmployeeModel = employeeConnection.model('Employee', employeeSchema);

    // Fetch all employees for the tenant
    const employees = await EmployeeModel.find({ tenantId }).select('employeeCode').lean();
    const employeeCodes = new Set(employees.map((e: any) => e.employeeCode?.toUpperCase()));

    await employeeConnection.close();

    // Validate each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed
      let rowValid = true;

      // Map column names (handle variations)
      const employeeCode = normalizeStringValue(
        row['Employee Code'] || row['employeeCode'] || row['EmployeeCode'] || row['employee_code']
      );
      const date = row['Date'] || row['date'];
      const status = normalizeStringValue(
        row['Status'] || row['status']
      ).toLowerCase();
      const checkInTime = row['Check In Time'] || row['checkInTime'] || row['CheckInTime'] || row['check_in_time'];
      const checkOutTime = row['Check Out Time'] || row['checkOutTime'] || row['CheckOutTime'] || row['check_out_time'];

      // Validate Employee Code
      if (!employeeCode) {
        errors.push({ row: rowNum, field: 'Employee Code', message: 'Employee Code is required' });
        rowValid = false;
      } else if (!employeeCodes.has(employeeCode.toUpperCase())) {
        errors.push({ row: rowNum, field: 'Employee Code', message: `Employee with code '${employeeCode}' not found`, value: employeeCode });
        rowValid = false;
      }

      // Validate Date
      if (!date) {
        errors.push({ row: rowNum, field: 'Date', message: 'Date is required' });
        rowValid = false;
      } else {
        const dateStr = normalizeDateValue(date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          errors.push({ row: rowNum, field: 'Date', message: 'Invalid date format. Use YYYY-MM-DD', value: dateStr });
          rowValid = false;
        }
      }

      // Validate Status
      if (!status) {
        errors.push({ row: rowNum, field: 'Status', message: 'Status is required' });
        rowValid = false;
      } else if (!VALID_STATUSES.includes(status)) {
        errors.push({
          row: rowNum,
          field: 'Status',
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          value: status,
        });
        rowValid = false;
      }

      // Validate time format if provided
      if (checkInTime) {
        const timeStr = normalizeStringValue(checkInTime);
        if (timeStr && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
          errors.push({ row: rowNum, field: 'Check In Time', message: 'Invalid time format. Use HH:MM', value: timeStr });
          rowValid = false;
        }
      }

      if (checkOutTime) {
        const timeStr = normalizeStringValue(checkOutTime);
        if (timeStr && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
          errors.push({ row: rowNum, field: 'Check Out Time', message: 'Invalid time format. Use HH:MM', value: timeStr });
          rowValid = false;
        }
      }

      if (rowValid) {
        validRows++;
      }
    }

    res.json({
      success: errors.length === 0,
      data: {
        totalRows: data.length,
        validRows,
        errors,
      },
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate file',
    });
  }
};

// Process bulk upload
export const bulkUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    // Parse the Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: AttendanceRow[] = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No data found in the file',
      });
      return;
    }

    const errors: ValidationError[] = [];
    let successCount = 0;

    // Get employee database connection
    const employeeDbUri = process.env.EMPLOYEE_DB_URI || process.env.MONGODB_URI;
    const employeeConnection = mongoose.createConnection(employeeDbUri as string);

    const employeeSchema = new mongoose.Schema({
      employeeCode: String,
      tenantId: mongoose.Schema.Types.ObjectId,
    });
    const EmployeeModel = employeeConnection.model('Employee', employeeSchema);

    // Fetch all employees for the tenant
    const employees = await EmployeeModel.find({ tenantId }).select('_id employeeCode').lean();
    const employeeMap = new Map<string, string>();
    employees.forEach((e: any) => {
      if (e.employeeCode) {
        employeeMap.set(e.employeeCode.toUpperCase(), e._id.toString());
      }
    });

    await employeeConnection.close();

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      try {
        // Map column names
        const employeeCode = normalizeStringValue(
          row['Employee Code'] || row['employeeCode'] || row['EmployeeCode'] || row['employee_code']
        );
        const date = row['Date'] || row['date'];
        const status = normalizeStringValue(
          row['Status'] || row['status']
        ).toLowerCase();
        const checkInTime = row['Check In Time'] || row['checkInTime'] || row['CheckInTime'] || row['check_in_time'];
        const checkOutTime = row['Check Out Time'] || row['checkOutTime'] || row['CheckOutTime'] || row['check_out_time'];
        const notes = normalizeStringValue(row['Notes'] || row['notes'] || '');

        // Get employee ID
        const employeeId = employeeMap.get(employeeCode.toUpperCase());
        if (!employeeId) {
          errors.push({ row: rowNum, field: 'Employee Code', message: `Employee '${employeeCode}' not found` });
          continue;
        }

        // Validate status
        if (!VALID_STATUSES.includes(status)) {
          errors.push({ row: rowNum, field: 'Status', message: `Invalid status: ${status}` });
          continue;
        }

        // Parse date
        const attendanceDate = parseISTDate(date);
        attendanceDate.setHours(0, 0, 0, 0);

        // Build attendance record
        const attendanceData: any = {
          tenantId,
          employeeId,
          date: attendanceDate,
          status,
          approvedBy: userId,
        };

        // Add check-in/check-out times if provided
        if (checkInTime && (status === 'present' || status === 'late' || status === 'half_day')) {
          const checkIn = parseTimeWithDate(date, checkInTime);
          if (checkIn) {
            attendanceData.checkIn = checkIn;
          }
        }

        if (checkOutTime && (status === 'present' || status === 'late' || status === 'half_day')) {
          const checkOut = parseTimeWithDate(date, checkOutTime);
          if (checkOut) {
            attendanceData.checkOut = checkOut;
          }
        }

        // Calculate work hours if both check-in and check-out are present
        if (attendanceData.checkIn && attendanceData.checkOut) {
          const workHours = (attendanceData.checkOut.getTime() - attendanceData.checkIn.getTime()) / (1000 * 60 * 60);
          attendanceData.workHours = Math.max(0, workHours);
        }

        if (notes) {
          attendanceData.notes = notes;
        }

        // Upsert attendance record (update if exists, insert if not)
        await Attendance.findOneAndUpdate(
          { tenantId, employeeId, date: attendanceDate },
          attendanceData,
          { upsert: true, new: true }
        );

        successCount++;
      } catch (error: any) {
        console.error(`Error processing row ${rowNum}:`, error);
        errors.push({ row: rowNum, field: 'General', message: error.message || 'Failed to process row' });
      }
    }

    const result: UploadResult = {
      success: successCount > 0,
      totalRows: data.length,
      successCount,
      failedCount: data.length - successCount,
      errors,
    };

    res.json({
      success: true,
      message: `${successCount} of ${data.length} attendance records processed`,
      data: result,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
    });
  }
};
