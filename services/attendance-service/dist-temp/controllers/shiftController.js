"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShift = exports.updateShift = exports.getShiftById = exports.getShifts = exports.createShift = void 0;
var express_validator_1 = require("express-validator");
var Shift_1 = require("../models/Shift");
// Create shift
var createShift = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var errors, tenantId, _a, name_1, code, startTime, endTime, breakDuration, graceMinutes, workingDays, isDefault, shift, error_1, mongoError;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({ success: false, errors: errors.array() });
                    return [2 /*return*/];
                }
                tenantId = req.headers['x-tenant-id'];
                _a = req.body, name_1 = _a.name, code = _a.code, startTime = _a.startTime, endTime = _a.endTime, breakDuration = _a.breakDuration, graceMinutes = _a.graceMinutes, workingDays = _a.workingDays, isDefault = _a.isDefault;
                if (!isDefault) return [3 /*break*/, 2];
                return [4 /*yield*/, Shift_1.default.updateMany({ tenantId: tenantId, isDefault: true }, { isDefault: false })];
            case 1:
                _b.sent();
                _b.label = 2;
            case 2:
                shift = new Shift_1.default({
                    tenantId: tenantId,
                    name: name_1,
                    code: code,
                    startTime: startTime,
                    endTime: endTime,
                    breakDuration: breakDuration,
                    graceMinutes: graceMinutes,
                    workingDays: workingDays,
                    isDefault: isDefault,
                });
                return [4 /*yield*/, shift.save()];
            case 3:
                _b.sent();
                res.status(201).json({
                    success: true,
                    message: 'Shift created successfully',
                    data: { shift: shift },
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _b.sent();
                console.error('[Attendance Service] Create shift error:', error_1);
                mongoError = error_1;
                if (mongoError.code === 11000) {
                    res.status(400).json({
                        success: false,
                        message: 'Shift with this code already exists',
                    });
                    return [2 /*return*/];
                }
                res.status(500).json({
                    success: false,
                    message: 'Failed to create shift',
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.createShift = createShift;
// Get all shifts
var getShifts = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tenantId, isActive, query, shifts, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                tenantId = req.headers['x-tenant-id'];
                isActive = req.query.isActive;
                query = { tenantId: tenantId };
                if (isActive !== undefined) {
                    query.isActive = isActive === 'true';
                }
                return [4 /*yield*/, Shift_1.default.find(query).lean()];
            case 1:
                shifts = _a.sent();
                shifts.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
                res.status(200).json({
                    success: true,
                    data: { shifts: shifts },
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('[Attendance Service] Get shifts error:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch shifts',
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getShifts = getShifts;
// Get shift by ID
var getShiftById = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tenantId, id, shift, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                tenantId = req.headers['x-tenant-id'];
                id = req.params.id;
                return [4 /*yield*/, Shift_1.default.findOne({ _id: id, tenantId: tenantId }).lean()];
            case 1:
                shift = _a.sent();
                if (!shift) {
                    res.status(404).json({
                        success: false,
                        message: 'Shift not found',
                    });
                    return [2 /*return*/];
                }
                res.status(200).json({
                    success: true,
                    data: { shift: shift },
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('[Attendance Service] Get shift error:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch shift',
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getShiftById = getShiftById;
// Update shift
var updateShift = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var errors, tenantId, id, updateData, shift, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({ success: false, errors: errors.array() });
                    return [2 /*return*/];
                }
                tenantId = req.headers['x-tenant-id'];
                id = req.params.id;
                updateData = req.body;
                if (!updateData.isDefault) return [3 /*break*/, 2];
                return [4 /*yield*/, Shift_1.default.updateMany({ tenantId: tenantId, isDefault: true, _id: { $ne: id } }, { isDefault: false })];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2: return [4 /*yield*/, Shift_1.default.findOneAndUpdate({ _id: id, tenantId: tenantId }, updateData, { new: true })];
            case 3:
                shift = _a.sent();
                if (!shift) {
                    res.status(404).json({
                        success: false,
                        message: 'Shift not found',
                    });
                    return [2 /*return*/];
                }
                res.status(200).json({
                    success: true,
                    message: 'Shift updated successfully',
                    data: { shift: shift },
                });
                return [3 /*break*/, 5];
            case 4:
                error_4 = _a.sent();
                console.error('[Attendance Service] Update shift error:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update shift',
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.updateShift = updateShift;
// Delete shift
var deleteShift = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tenantId, id, shift, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                tenantId = req.headers['x-tenant-id'];
                id = req.params.id;
                return [4 /*yield*/, Shift_1.default.findOneAndDelete({ _id: id, tenantId: tenantId })];
            case 1:
                shift = _a.sent();
                if (!shift) {
                    res.status(404).json({
                        success: false,
                        message: 'Shift not found',
                    });
                    return [2 /*return*/];
                }
                res.status(200).json({
                    success: true,
                    message: 'Shift deleted successfully',
                });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('[Attendance Service] Delete shift error:', error_5);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete shift',
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.deleteShift = deleteShift;
