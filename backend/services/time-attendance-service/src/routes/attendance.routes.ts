import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

export function createAttendanceRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const attendanceController = new AttendanceController(prisma);

  // Apply authentication middleware to all routes
  router.use(authenticateToken);

  /**
   * @openapi
   * /api/v1/attendance:
   *   get:
   *     summary: Get attendance records
   *     tags: [Attendance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: employeeId
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE, HOLIDAY]
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *     responses:
   *       200:
   *         description: Attendance records retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get('/', attendanceController.getAttendanceRecords);

  /**
   * @openapi
   * /api/v1/attendance/dashboard:
   *   get:
   *     summary: Get attendance dashboard
   *     tags: [Attendance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: date
   *         schema:
   *           type: string
   *           format: date
   *         description: Target date for dashboard (defaults to today)
   *       - in: query
   *         name: employeeId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Employee ID (defaults to current user)
   *     responses:
   *       200:
   *         description: Dashboard data retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get('/dashboard', attendanceController.getAttendanceDashboard);

  /**
   * @openapi
   * /api/v1/attendance/employee/{employeeId}:
   *   get:
   *     summary: Get employee attendance summary
   *     tags: [Attendance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: employeeId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Employee attendance summary retrieved
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Employee not found
   */
  router.get('/employee/:employeeId', 
    requirePermission(['attendance.read', 'attendance.read_all']),
    attendanceController.getEmployeeAttendance
  );

  /**
   * @openapi
   * /api/v1/attendance/analytics:
   *   get:
   *     summary: Get attendance analytics
   *     tags: [Attendance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: department
   *         schema:
   *           type: string
   *       - in: query
   *         name: granularity
   *         schema:
   *           type: string
   *           enum: [daily, weekly, monthly]
   *           default: daily
   *     responses:
   *       200:
   *         description: Analytics data retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.get('/analytics', 
    requirePermission(['attendance.analytics']),
    attendanceController.getAttendanceAnalytics
  );

  /**
   * @openapi
   * /api/v1/attendance/{recordId}:
   *   put:
   *     summary: Update attendance record
   *     tags: [Attendance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: recordId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE, HOLIDAY]
   *               clockIn:
   *                 type: string
   *                 format: date-time
   *               clockOut:
   *                 type: string
   *                 format: date-time
   *               notes:
   *                 type: string
   *                 maxLength: 500
   *     responses:
   *       200:
   *         description: Attendance record updated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Record not found
   */
  router.put('/:recordId', 
    requirePermission(['attendance.update']),
    attendanceController.updateAttendanceRecord
  );

  /**
   * @openapi
   * /api/v1/attendance/reports/generate:
   *   post:
   *     summary: Generate attendance report
   *     tags: [Attendance]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - startDate
   *               - endDate
   *             properties:
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               employeeIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: uuid
   *               departments:
   *                 type: array
   *                 items:
   *                   type: string
   *               format:
   *                 type: string
   *                 enum: [json, csv]
   *                 default: json
   *     responses:
   *       200:
   *         description: Report generated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.post('/reports/generate', 
    requirePermission(['attendance.reports']),
    attendanceController.generateAttendanceReport
  );

  return router;
}
