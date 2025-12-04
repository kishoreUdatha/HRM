import { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Employee from '../models/Employee';
import Department from '../models/Department';

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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  department: string;
  designation: string;
  joiningDate: string;
  employmentType?: string;
  salary?: number;
  maritalStatus?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
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

  // Required fields
  if (!row.firstName?.trim()) {
    errors.push({ row: rowIndex, field: 'firstName', message: 'First name is required' });
  }
  if (!row.lastName?.trim()) {
    errors.push({ row: rowIndex, field: 'lastName', message: 'Last name is required' });
  }
  if (!row.email?.trim()) {
    errors.push({ row: rowIndex, field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push({ row: rowIndex, field: 'email', message: 'Invalid email format', value: row.email });
  }
  if (!row.phone?.trim()) {
    errors.push({ row: rowIndex, field: 'phone', message: 'Phone is required' });
  }
  if (!row.dateOfBirth?.trim()) {
    errors.push({ row: rowIndex, field: 'dateOfBirth', message: 'Date of birth is required' });
  } else if (isNaN(Date.parse(row.dateOfBirth))) {
    errors.push({ row: rowIndex, field: 'dateOfBirth', message: 'Invalid date format', value: row.dateOfBirth });
  }
  if (!row.gender?.trim()) {
    errors.push({ row: rowIndex, field: 'gender', message: 'Gender is required' });
  } else if (!['male', 'female', 'other'].includes(row.gender.toLowerCase())) {
    errors.push({ row: rowIndex, field: 'gender', message: 'Gender must be male, female, or other', value: row.gender });
  }
  if (!row.department?.trim()) {
    errors.push({ row: rowIndex, field: 'department', message: 'Department is required' });
  }
  if (!row.designation?.trim()) {
    errors.push({ row: rowIndex, field: 'designation', message: 'Designation is required' });
  }
  if (!row.joiningDate?.trim()) {
    errors.push({ row: rowIndex, field: 'joiningDate', message: 'Joining date is required' });
  } else if (isNaN(Date.parse(row.joiningDate))) {
    errors.push({ row: rowIndex, field: 'joiningDate', message: 'Invalid date format', value: row.joiningDate });
  }

  // Optional field validation
  if (row.employmentType && !['full-time', 'part-time', 'contract', 'intern'].includes(row.employmentType.toLowerCase())) {
    errors.push({ row: rowIndex, field: 'employmentType', message: 'Invalid employment type', value: row.employmentType });
  }
  if (row.maritalStatus && !['single', 'married', 'divorced', 'widowed'].includes(row.maritalStatus.toLowerCase())) {
    errors.push({ row: rowIndex, field: 'maritalStatus', message: 'Invalid marital status', value: row.maritalStatus });
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
      if (row.department && !departmentMap.has(row.department.toLowerCase())) {
        rowErrors.push({
          row: rowIndex,
          field: 'department',
          message: `Department "${row.department}" does not exist. Please create it first.`,
          value: row.department,
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
      if (row.email) {
        const email = row.email.toLowerCase();
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
    const emails = validRows.map(v => v.row.email.toLowerCase());
    const existingEmployees = await Employee.find({
      tenantId,
      email: { $in: emails },
    });

    const existingEmails = new Set(existingEmployees.map(e => e.email.toLowerCase()));
    validRows.forEach(({ row, index }) => {
      if (existingEmails.has(row.email.toLowerCase())) {
        allErrors.push({
          row: index,
          field: 'email',
          message: 'Employee with this email already exists',
          value: row.email,
        });
      }
    });

    // Filter out rows with errors
    const rowsToCreate = validRows.filter(({ row }) => !existingEmails.has(row.email.toLowerCase()));

    // Create employees
    const createdEmployees: string[] = [];
    const createErrors: ValidationError[] = [];

    for (const { row, index } of rowsToCreate) {
      try {
        const departmentId = departmentMap.get(row.department.toLowerCase());

        const employee = new Employee({
          tenantId,
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email.toLowerCase().trim(),
          phone: row.phone.trim(),
          dateOfBirth: new Date(row.dateOfBirth),
          gender: row.gender.toLowerCase(),
          departmentId,
          designation: row.designation.trim(),
          joiningDate: new Date(row.joiningDate),
          employmentType: (row.employmentType?.toLowerCase() as 'full-time' | 'part-time' | 'contract' | 'intern') || 'full-time',
          maritalStatus: (row.maritalStatus?.toLowerCase() as 'single' | 'married' | 'divorced' | 'widowed') || 'single',
          salary: {
            basic: row.salary || 0,
            hra: 0,
            allowances: 0,
            deductions: 0,
            netSalary: row.salary || 0,
            currency: 'USD',
          },
          address: {
            street: row.street || '',
            city: row.city || '',
            state: row.state || '',
            country: row.country || '',
            zipCode: row.zipCode || '',
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

    const errors: ValidationError[] = [];
    let validCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2;

      const rowErrors = validateRow(row, rowIndex);

      if (row.department && !departmentMap.has(row.department.toLowerCase())) {
        rowErrors.push({
          row: rowIndex,
          field: 'department',
          message: `Department "${row.department}" does not exist`,
          value: row.department,
        });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validCount++;
      }
    }

    // Check for existing emails
    const emails = data.map(row => row.email?.toLowerCase()).filter(Boolean);
    const existingEmployees = await Employee.find({
      tenantId,
      email: { $in: emails },
    });

    existingEmployees.forEach(emp => {
      const rowIndex = data.findIndex(row => row.email?.toLowerCase() === emp.email.toLowerCase()) + 2;
      errors.push({
        row: rowIndex,
        field: 'email',
        message: 'Employee with this email already exists',
        value: emp.email,
      });
    });

    res.json({
      success: errors.length === 0,
      message: errors.length === 0
        ? `All ${data.length} rows are valid and ready to upload`
        : `Found ${errors.length} validation errors`,
      data: {
        totalRows: data.length,
        validRows: validCount - existingEmployees.length,
        invalidRows: errors.length,
        errors,
        availableDepartments: departments.map(d => d.name),
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
