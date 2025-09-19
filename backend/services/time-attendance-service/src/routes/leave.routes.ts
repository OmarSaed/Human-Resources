import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { LeaveController } from '../controllers/leave.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

export function createLeaveRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const leaveController = new LeaveController(prisma);

  // Apply authentication middleware to all routes
  router.use(authenticateToken);

  /**
   * @openapi
   * /api/v1/leave/requests:
   *   get:
   *     summary: Get leave requests
   *     tags: [Leave Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: employeeId
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: leaveTypeId
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
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
   *         description: Leave requests retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get('/requests', leaveController.getLeaveRequests);

  /**
   * @openapi
   * /api/v1/leave/requests:
   *   post:
   *     summary: Create leave request
   *     tags: [Leave Management]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - leaveTypeId
   *               - startDate
   *               - endDate
   *               - reason
   *             properties:
   *               leaveTypeId:
   *                 type: string
   *                 format: uuid
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               reason:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 500
   *               description:
   *                 type: string
   *                 maxLength: 1000
   *               emergencyContact:
   *                 type: string
   *               isEmergency:
   *                 type: boolean
   *                 default: false
   *               handoverNotes:
   *                 type: string
   *               backupPersonId:
   *                 type: string
   *                 format: uuid
   *     responses:
   *       201:
   *         description: Leave request created successfully
   *       400:
   *         description: Validation error or insufficient balance
   *       401:
   *         description: Unauthorized
   */
  router.post('/requests', leaveController.createLeaveRequest);

  /**
   * @openapi
   * /api/v1/leave/requests/{requestId}:
   *   get:
   *     summary: Get leave request by ID
   *     tags: [Leave Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: requestId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Leave request retrieved successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Leave request not found
   */
  router.get('/requests/:requestId', leaveController.getLeaveRequest);

  /**
   * @openapi
   * /api/v1/leave/requests/{requestId}:
   *   put:
   *     summary: Update leave request
   *     tags: [Leave Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: requestId
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
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               reason:
   *                 type: string
   *               description:
   *                 type: string
   *               emergencyContact:
   *                 type: string
   *               handoverNotes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Leave request updated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Leave request not found
   */
  router.put('/requests/:requestId', leaveController.updateLeaveRequest);

  /**
   * @openapi
   * /api/v1/leave/requests/{requestId}/approve:
   *   post:
   *     summary: Approve leave request
   *     tags: [Leave Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: requestId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               notes:
   *                 type: string
   *                 description: Approval notes
   *     responses:
   *       200:
   *         description: Leave request approved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Leave request not found
   */
  router.post('/requests/:requestId/approve', 
    requirePermission(['leave.approve']),
    leaveController.approveLeaveRequest
  );

  /**
   * @openapi
   * /api/v1/leave/requests/{requestId}/reject:
   *   post:
   *     summary: Reject leave request
   *     tags: [Leave Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: requestId
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
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *                 minLength: 10
   *                 description: Rejection reason
   *     responses:
   *       200:
   *         description: Leave request rejected successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Leave request not found
   */
  router.post('/requests/:requestId/reject', 
    requirePermission(['leave.approve']),
    leaveController.rejectLeaveRequest
  );

  /**
   * @openapi
   * /api/v1/leave/requests/{requestId}/cancel:
   *   post:
   *     summary: Cancel leave request
   *     tags: [Leave Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: requestId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Cancellation reason
   *     responses:
   *       200:
   *         description: Leave request cancelled successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Leave request not found
   */
  router.post('/requests/:requestId/cancel', leaveController.cancelLeaveRequest);

  /**
   * @openapi
   * /api/v1/leave/types:
   *   get:
   *     summary: Get leave types
   *     tags: [Leave Management]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Leave types retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get('/types', leaveController.getLeaveTypes);

  /**
   * @openapi
   * /api/v1/leave/types:
   *   post:
   *     summary: Create leave type
   *     tags: [Leave Management]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - allowance
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               allowance:
   *                 type: number
   *                 minimum: 0
   *               carryForward:
   *                 type: number
   *                 minimum: 0
   *               maxConsecutive:
   *                 type: number
   *               minAdvanceNotice:
   *                 type: number
   *               requiresApproval:
   *                 type: boolean
   *                 default: true
   *               isPaid:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       201:
   *         description: Leave type created successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.post('/types', 
    requirePermission(['leave.manage_types']),
    leaveController.createLeaveType
  );

  /**
   * @openapi
   * /api/v1/leave/balance/{employeeId}:
   *   get:
   *     summary: Get employee leave balance
   *     tags: [Leave Management]
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
   *         name: year
   *         schema:
   *           type: integer
   *           minimum: 2020
   *         description: Year for leave balance (defaults to current year)
   *     responses:
   *       200:
   *         description: Leave balance retrieved successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Employee not found
   */
  router.get('/balance/:employeeId', leaveController.getLeaveBalance);

  /**
   * @openapi
   * /api/v1/leave/calendar:
   *   get:
   *     summary: Get leave calendar
   *     tags: [Leave Management]
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
   *         name: departmentId
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Leave calendar retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  router.get('/calendar', 
    requirePermission(['leave.view_calendar']),
    leaveController.getLeaveCalendar
  );

  return router;
}
