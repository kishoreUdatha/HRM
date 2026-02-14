import { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Employee from '../models/Employee';
import Department from '../models/Department';

// IST timezone offset: UTC+5:30
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;

// Convert Excel serial date to JS Date
const excelDateToJSDate = (excelDate: number): Date => {
  // Excel dates start from Jan 1, 1900 (serial number 1)
  // But there's a bug in Excel where 1900 is treated as a leap year
  const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + excelDate * msPerDay);
};

// Normalize date value from Excel (can be string, number, or Date)
const normalizeDateValue = (value: any): string => {
  if (!value) return '';

  // If it's a number, it's an Excel serial date
  if (typeof value === 'number') {
    const date = excelDateToJSDate(value);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // If it's a Date object
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // If it's a string, return as-is
  return String(value).trim();
};

// Normalize string value (handle numbers, etc.)
const normalizeStringValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

// Parse date string as IST and convert to UTC for storage
// Input: "YYYY-MM-DD" or "DD/MM/YYYY" or "MM/DD/YYYY"
const parseISTDate = (dateValue: any): Date => {
  const dateStr = normalizeDateValue(dateValue);
  if (!dateStr) return new Date();

  let year: number, month: number, day: number;

  // Try to parse different date formats
  if (dateStr.includes('-')) {
    // YYYY-MM-DD format
    [year, month, day] = dateStr.split('-').map(Number);
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(Number);
    if (parts[2] > 31) {
      // DD/MM/YYYY or MM/DD/YYYY with 4-digit year
      // Assume DD/MM/YYYY (Indian format)
      [day, month, year] = parts;
    } else {
      // Ambiguous, default to DD/MM/YYYY
      [day, month, year] = parts;
    }
  } else {
    // Fallback to standard Date parsing
    return new Date(dateStr);
  }

  // Create date at midnight IST (00:00:00 IST)
  // IST is UTC+5:30, so we need to subtract 5:30 from IST to get UTC
  const istMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // Subtract IST offset to convert to UTC
  istMidnight.setUTCHours(istMidnight.getUTCHours() - IST_OFFSET_HOURS);
  istMidnight.setUTCMinutes(istMidnight.getUTCMinutes() - IST_OFFSET_MINUTES);

  return istMidnight;
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

interface EmployeeRow {
  firstName: any;  // Excel may return different types
  lastName: any;
  email: any;
  phone: any;
  dateOfBirth: any;  // Can be string, number (Excel serial), or Date
  gender: any;
  department: any;
  designation: any;
  joiningDate: any;  // Can be string, number (Excel serial), or Date
  employmentType?: any;
  salary?: any;
  maritalStatus?: any;
  street?: any;
  city?: any;
  state?: any;
  country?: any;
  zipCode?: any;
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
  createdEmployees: string[];
}

// Download template
export const downloadTemplate = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Create template workbook
    const wb = XLSX.utils.book_new();

    // Sample data with headers
    const templateData = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        dateOfBirth: '1990-01-15',
        gender: 'male',
        department: 'Engineering',
        designation: 'Software Engineer',
        joiningDate: '2024-01-01',
        employmentType: 'full-time',
        salary: 50000,
        maritalStatus: 'single',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001',
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '0987654321',
        dateOfBirth: '1992-05-20',
        gender: 'female',
        department: 'HR',
        designation: 'HR Manager',
        joiningDate: '2024-02-15',
        employmentType: 'full-time',
        salary: 60000,
        maritalStatus: 'married',
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        zipCode: '90001',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // firstName
      { wch: 15 }, // lastName
      { wch: 30 }, // email
      { wch: 15 }, // phone
      { wch: 12 }, // dateOfBirth
      { wch: 10 }, // gender
      { wch: 20 }, // department
      { wch: 25 }, // designation
      { wch: 12 }, // joiningDate
      { wch: 15 }, // employmentType
      { wch: 12 }, // salary
      { wch: 12 }, // maritalStatus
      { wch: 20 }, // street
      { wch: 15 }, // city
      { wch: 10 }, // state
      { wch: 15 }, // country
      { wch: 10 }, // zipCode
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Employees');

    // Add instructions sheet
    const instructionsData = [
      { Field: 'firstName', Required: 'Yes', Description: 'Employee first name' },
      { Field: 'lastName', Required: 'Yes', Description: 'Employee last name' },
      { Field: 'email', Required: 'Yes', Description: 'Unique email address' },
      { Field: 'phone', Required: 'Yes', Description: 'Phone number' },
      { Field: 'dateOfBirth', Required: 'Yes', Description: 'Format: YYYY-MM-DD' },
      { Field: 'gender', Required: 'Yes', Description: 'male, female, or other' },
      { Field: 'department', Required: 'Yes', Description: 'Department name (must exist)' },
      { Field: 'designation', Required: 'Yes', Description: 'Job title/designation' },
      { Field: 'joiningDate', Required: 'Yes', Description: 'Format: YYYY-MM-DD' },
      { Field: 'employmentType', Required: 'No', Description: 'full-time, part-time, contract, intern (default: full-time)' },
      { Field: 'salary', Required: 'No', Description: 'Basic salary amount' },
      { Field: 'maritalStatus', Required: 'No', Description: 'single, married, divorced, widowed (default: single)' },
      { Field: 'street', Required: 'No', Description: 'Street address' },
      { Field: 'city', Required: 'No', Description: 'City' },
      { Field: 'state', Required: 'No', Description: 'State/Province' },
      { Field: 'country', Required: 'No', Description: 'Country' },
      { Field: 'zipCode', Required: 'No', Description: 'ZIP/Postal code' },
    ];

    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_upload_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
    });
  }
};

// Validate a single row
const validateRow = (row: EmployeeRow, rowIndex: number): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Normalize values (handles Excel returning numbers, dates, etc.)
  const firstName = normalizeStringValue(row.firstName);
  const lastName = normalizeStringValue(row.lastName);
  const email = normalizeStringValue(row.email);
  const phone = normalizeStringValue(row.phone);
  const dateOfBirth = normalizeDateValue(row.dateOfBirth);
  const gender = normalizeStringValue(row.gender);
  const department = normalizeStringValue(row.department);
  const designation = normalizeStringValue(row.designation);
  const joiningDate = normalizeDateValue(row.joiningDate);
  const employmentType = normalizeStringValue(row.employmentType);
  const maritalStatus = normalizeStringValue(row.maritalStatus);

  // Required fields
  if (!firstName) {
    errors.push({ row: rowIndex, field: 'firstName', message: 'First name is required' });
  }
  if (!lastName) {
    errors.push({ row: rowIndex, field: 'lastName', message: 'Last name is required' });
  }
  if (!email) {
    errors.push({ row: rowIndex, field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ row: rowIndex, field: 'email', message: 'Invalid email format', value: email });
  }
  if (!phone) {
    errors.push({ row: rowIndex, field: 'phone', message: 'Phone is required' });
  }
  if (!dateOfBirth) {
    errors.push({ row: rowIndex, field: 'dateOfBirth', message: 'Date of birth is required' });
  } else if (isNaN(Date.parse(dateOfBirth))) {
    errors.push({ row: rowIndex, field: 'dateOfBirth', message: 'Invalid date format', value: dateOfBirth });
  }
  if (!gender) {
    errors.push({ row: rowIndex, field: 'gender', message: 'Gender is required' });
  } else if (!['male', 'female', 'other'].includes(gender.toLowerCase())) {
    errors.push({ row: rowIndex, field: 'gender', message: 'Gender must be male, female, or other', value: gender });
  }
  if (!department) {
    errors.push({ row: rowIndex, field: 'department', message: 'Department is required' });
  }
  if (!designation) {
    errors.push({ row: rowIndex, field: 'designation', message: 'Designation is required' });
  }
  if (!joiningDate) {
    errors.push({ row: rowIndex, field: 'joiningDate', message: 'Joining date is required' });
  } else if (isNaN(Date.parse(joiningDate))) {
    errors.push({ row: rowIndex, field: 'joiningDate', message: 'Invalid date format', value: joiningDate });
  }

  // Optional field validation
  if (employmentType && !['full-time', 'part-time', 'contract', 'intern'].includes(employmentType.toLowerCase())) {
    errors.push({ row: rowIndex, field: 'employmentType', message: 'Invalid employment type', value: employmentType });
  }
  if (maritalStatus && !['single', 'married', 'divorced', 'widowed'].includes(maritalStatus.toLowerCase())) {
    errors.push({ row: rowIndex, field: 'maritalStatus', message: 'Invalid marital status', value: maritalStatus });
  }

  return errors;
};

// Bulk upload employees
export const bulkUploadEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: EmployeeRow[] = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      res.status(400).json({ success: false, message: 'No data found in the file' });
      return;
    }

    // Get all departments for this tenant
    const departments = await Department.find({ tenantId });
    const departmentMap = new Map(departments.map(d => [d.name.toLowerCase(), d._id]));

    // Validate all rows first
    const allErrors: ValidationError[] = [];
    const validRows: { row: EmployeeRow; index: number }[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel row number (1-indexed, plus header row)

      const rowErrors = validateRow(row, rowIndex);

      // Check if department exists
      const deptName = normalizeStringValue(row.department);
      if (deptName && !departmentMap.has(deptName.toLowerCase())) {
        rowErrors.push({
          row: rowIndex,
          field: 'department',
          message: `Department "${deptName}" does not exist. Please create it first.`,
          value: deptName,
        });
      }

      if (rowErrors.length > 0) {
        allErrors.push(...rowErrors);
      } else {
        validRows.push({ row, index: rowIndex });
      }
    }

    // Check for duplicate emails in the file
    const emailCounts = new Map<string, number[]>();
    data.forEach((row, index) => {
      const email = normalizeStringValue(row.email).toLowerCase();
      if (email) {
        if (!emailCounts.has(email)) {
          emailCounts.set(email, []);
        }
        emailCounts.get(email)!.push(index + 2);
      }
    });

    emailCounts.forEach((rows, email) => {
      if (rows.length > 1) {
        rows.forEach(rowIndex => {
          allErrors.push({
            row: rowIndex,
            field: 'email',
            message: `Duplicate email found in rows: ${rows.join(', ')}`,
            value: email,
          });
        });
      }
    });

    // Check for existing emails in database
    const emails = validRows.map(v => normalizeStringValue(v.row.email).toLowerCase());
    const existingEmployees = await Employee.find({
      tenantId,
      email: { $in: emails },
    });

    const existingEmails = new Set(existingEmployees.map(e => e.email.toLowerCase()));
    validRows.forEach(({ row, index }) => {
      const email = normalizeStringValue(row.email).toLowerCase();
      if (existingEmails.has(email)) {
        allErrors.push({
          row: index,
          field: 'email',
          message: 'Employee with this email already exists',
          value: email,
        });
      }
    });

    // Filter out rows with errors
    const rowsToCreate = validRows.filter(({ row }) => !existingEmails.has(normalizeStringValue(row.email).toLowerCase()));

    // Create employees
    const createdEmployees: string[] = [];
    const createErrors: ValidationError[] = [];

    for (const { row, index } of rowsToCreate) {
      try {
        // Normalize all values from Excel
        const firstName = normalizeStringValue(row.firstName);
        const lastName = normalizeStringValue(row.lastName);
        const email = normalizeStringValue(row.email).toLowerCase();
        const phone = normalizeStringValue(row.phone);
        const gender = normalizeStringValue(row.gender).toLowerCase();
        const department = normalizeStringValue(row.department);
        const designation = normalizeStringValue(row.designation);
        const employmentType = normalizeStringValue(row.employmentType).toLowerCase() || 'full-time';
        const maritalStatus = normalizeStringValue(row.maritalStatus).toLowerCase() || 'single';
        const salary = typeof row.salary === 'number' ? row.salary : (parseFloat(row.salary) || 0);

        const departmentId = departmentMap.get(department.toLowerCase());

        const employee = new Employee({
          tenantId,
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth: parseISTDate(row.dateOfBirth),
          gender,
          departmentId,
          designation,
          joiningDate: parseISTDate(row.joiningDate),
          employmentType: employmentType as 'full-time' | 'part-time' | 'contract' | 'intern',
          maritalStatus: maritalStatus as 'single' | 'married' | 'divorced' | 'widowed',
          salary: {
            basic: salary,
            hra: 0,
            allowances: 0,
            deductions: 0,
            netSalary: salary,
            currency: 'INR',
          },
          address: {
            street: normalizeStringValue(row.street),
            city: normalizeStringValue(row.city),
            state: normalizeStringValue(row.state),
            country: normalizeStringValue(row.country),
            zipCode: normalizeStringValue(row.zipCode),
          },
          status: 'active',
        });

        await employee.save();
        createdEmployees.push(`${employee.employeeCode} - ${employee.firstName} ${employee.lastName}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        createErrors.push({
          row: index,
          field: 'general',
          message: `Failed to create employee: ${errorMessage}`,
        });
      }
    }

    const result: UploadResult = {
      success: createErrors.length === 0 && allErrors.length === 0,
      totalRows: data.length,
      successCount: createdEmployees.length,
      failedCount: data.length - createdEmployees.length,
      errors: [...allErrors, ...createErrors],
      createdEmployees,
    };

    res.status(result.success ? 200 : 207).json({
      success: result.successCount > 0,
      message: result.success
        ? `Successfully created ${result.successCount} employees`
        : `Created ${result.successCount} of ${result.totalRows} employees`,
      data: result,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process file',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Validate file without creating employees
export const validateUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID required. Please ensure you are logged in.',
        errorCode: 'TENANT_ID_MISSING'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an Excel or CSV file.',
        errorCode: 'NO_FILE_UPLOADED'
      });
      return;
    }

    // Parse Excel file
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (parseError) {
      console.error('File parse error:', parseError);
      res.status(400).json({
        success: false,
        message: 'Unable to read the uploaded file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV file.',
        errorCode: 'FILE_PARSE_ERROR',
        error: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      });
      return;
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      res.status(400).json({
        success: false,
        message: 'The uploaded file has no sheets. Please ensure the file contains data.',
        errorCode: 'NO_SHEETS_FOUND'
      });
      return;
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    let data: EmployeeRow[];
    try {
      data = XLSX.utils.sheet_to_json(worksheet);
    } catch (sheetError) {
      console.error('Sheet parse error:', sheetError);
      res.status(400).json({
        success: false,
        message: 'Unable to parse sheet data. Please check the file format.',
        errorCode: 'SHEET_PARSE_ERROR',
        error: sheetError instanceof Error ? sheetError.message : 'Unknown error'
      });
      return;
    }

    if (data.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No data found in the file. Please add employee records after the header row.',
        errorCode: 'NO_DATA_FOUND'
      });
      return;
    }

    // Validate required columns exist
    const requiredColumns = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'department', 'designation', 'joiningDate'];
    const fileColumns = Object.keys(data[0] || {});
    const missingColumns = requiredColumns.filter(col => !fileColumns.includes(col));

    if (missingColumns.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}. Please download the template and ensure all required columns are present.`,
        errorCode: 'MISSING_COLUMNS',
        data: {
          missingColumns,
          foundColumns: fileColumns,
          requiredColumns
        }
      });
      return;
    }

    // Get all departments for this tenant
    let departments;
    try {
      departments = await Department.find({ tenantId });
    } catch (dbError) {
      console.error('Database error fetching departments:', dbError);
      res.status(500).json({
        success: false,
        message: 'Unable to fetch departments. Please try again later.',
        errorCode: 'DATABASE_ERROR',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
      return;
    }

    const departmentMap = new Map(departments.map(d => [d.name.toLowerCase(), d._id]));

    const errors: ValidationError[] = [];
    let validCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2;

      const rowErrors = validateRow(row, rowIndex);

      const deptName = normalizeStringValue(row.department);
      if (deptName && !departmentMap.has(deptName.toLowerCase())) {
        rowErrors.push({
          row: rowIndex,
          field: 'department',
          message: `Department "${deptName}" does not exist. Available departments: ${departments.map(d => d.name).join(', ') || 'None (please create departments first)'}`,
          value: deptName,
        });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validCount++;
      }
    }

    // Check for duplicate emails in file
    const emailCounts = new Map<string, number[]>();
    data.forEach((row, index) => {
      const email = normalizeStringValue(row.email).toLowerCase();
      if (email) {
        if (!emailCounts.has(email)) {
          emailCounts.set(email, []);
        }
        emailCounts.get(email)!.push(index + 2);
      }
    });

    emailCounts.forEach((rows, email) => {
      if (rows.length > 1) {
        errors.push({
          row: rows[0],
          field: 'email',
          message: `Duplicate email "${email}" found in rows: ${rows.join(', ')}. Each employee must have a unique email.`,
          value: email,
        });
      }
    });

    // Check for existing emails in database
    const emails = data.map(row => normalizeStringValue(row.email).toLowerCase()).filter(Boolean);
    let existingEmployees: { email: string }[] = [];

    try {
      existingEmployees = await Employee.find({
        tenantId,
        email: { $in: emails },
      }).select('email');
    } catch (dbError) {
      console.error('Database error checking existing employees:', dbError);
      // Continue with validation, just warn about the issue
    }

    existingEmployees.forEach(emp => {
      const rowIndex = data.findIndex(row => normalizeStringValue(row.email).toLowerCase() === emp.email.toLowerCase()) + 2;
      errors.push({
        row: rowIndex,
        field: 'email',
        message: `Employee with email "${emp.email}" already exists in the system.`,
        value: emp.email,
      });
    });

    // Sort errors by row number for easier reading
    errors.sort((a, b) => a.row - b.row);

    res.json({
      success: errors.length === 0,
      message: errors.length === 0
        ? `All ${data.length} rows are valid and ready to upload`
        : `Found ${errors.length} validation error(s) in your file. Please correct the issues and re-upload.`,
      data: {
        totalRows: data.length,
        validRows: Math.max(0, validCount - existingEmployees.length),
        invalidRows: errors.length,
        errors: errors.slice(0, 100), // Limit to first 100 errors to avoid huge responses
        hasMoreErrors: errors.length > 100,
        totalErrors: errors.length,
        availableDepartments: departments.map(d => d.name),
        tips: errors.length > 0 ? [
          'Check that all required fields are filled in',
          'Ensure email addresses are valid and unique',
          'Verify that department names match exactly (case-insensitive)',
          'Date format should be YYYY-MM-DD (e.g., 2024-01-15)',
          'Gender should be: male, female, or other'
        ] : []
      },
    });
  } catch (error) {
    console.error('Validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    res.status(500).json({
      success: false,
      message: 'Failed to validate file. Please check the file format and try again.',
      errorCode: 'VALIDATION_FAILED',
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
};
