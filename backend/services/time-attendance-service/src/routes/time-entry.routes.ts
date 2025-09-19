import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { TimeEntryController } from '../controllers/time-entry.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { validateQueryParams } from '../middleware/validation.middleware';
import { validateTimeEntrySearch } from '../validation/time-entry.validation';

export function createTimeEntryRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const timeEntryController = new TimeEntryController(prisma);

  // Apply authentication middleware to all routes
  router.use(authenticateToken);

  /**
   * @openapi
   * /api/v1/time-entries/clock-in:
   *   post:
   *     summary: Clock in - Create new time entry
   *     tags: [Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               workLocation:
   *                 type: string
   *                 enum: [OFFICE, REMOTE, FIELD, CLIENT_SITE, HOME]
   *                 default: OFFICE
   *               gpsLocation:
   *                 type: object
   *                 properties:
   *                   latitude:
   *                     type: number
   *                   longitude:
   *                     type: number
   *                   accuracy:
   *                     type: number
   *               deviceInfo:
   *                 type: object
   *                 properties:
   *                   deviceId:
   *                     type: string
   *                   deviceType:
   *                     type: string
   *                   userAgent:
   *                     type: string
   *               notes:
   *                 type: string
   *                 maxLength: 500
   *     responses:
   *       201:
   *         description: Successfully clocked in
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/TimeEntry'
   *                 message:
   *                   type: string
   *       400:
   *         description: Validation error or employee already clocked in
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.post('/clock-in', timeEntryController.clockIn);

  /**
   * @openapi
   * /api/v1/time-entries/{timeEntryId}/clock-out:
   *   post:
   *     summary: Clock out - Update existing time entry
   *     tags: [Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: timeEntryId
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
   *                 maxLength: 500
   *               gpsLocation:
   *                 type: object
   *                 properties:
   *                   latitude:
   *                     type: number
   *                   longitude:
   *                     type: number
   *                   accuracy:
   *                     type: number
   *     responses:
   *       200:
   *         description: Successfully clocked out
   *       404:
   *         description: Time entry not found
   *       500:
   *         description: Internal server error
   */
  router.post('/:timeEntryId/clock-out', timeEntryController.clockOut);

  /**
   * @openapi
   * /api/v1/time-entries/{timeEntryId}/break/start:
   *   post:
   *     summary: Start break
   *     tags: [Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: timeEntryId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Break started successfully
   *       400:
   *         description: Break already started or invalid state
   *       404:
   *         description: Time entry not found
   *       500:
   *         description: Internal server error
   */
  router.post('/:timeEntryId/break/start', timeEntryController.startBreak);

  /**
   * @openapi
   * /api/v1/time-entries/{timeEntryId}/break/end:
   *   post:
   *     summary: End break
   *     tags: [Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: timeEntryId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Break ended successfully
   *       400:
   *         description: Break not started or already ended
   *       404:
   *         description: Time entry not found
   *       500:
   *         description: Internal server error
   */
  router.post('/:timeEntryId/break/end', timeEntryController.endBreak);

  /**
   * @openapi
   * /api/v1/time-entries:
   *   get:
   *     summary: Get time entries with filters
   *     tags: [Time Tracking]
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
   *           enum: [ACTIVE, COMPLETED, PENDING_APPROVAL, APPROVED, REJECTED]
   *       - in: query
   *         name: workLocation
   *         schema:
   *           type: string
   *           enum: [OFFICE, REMOTE, FIELD, CLIENT_SITE, HOME]
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
   *         description: Time entries retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/TimeEntry'
   *                 meta:
   *                   type: object
   *                   properties:
   *                     pagination:
   *                       $ref: '#/components/schemas/Pagination'
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.get('/', 
    validateQueryParams(validateTimeEntrySearch),
    timeEntryController.getTimeEntries
  );

  /**
   * @openapi
   * /api/v1/time-entries/active:
   *   get:
   *     summary: Get active time entry for current employee
   *     tags: [Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Active time entry retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   oneOf:
   *                     - $ref: '#/components/schemas/TimeEntry'
   *                     - type: 'null'
   *                 message:
   *                   type: string
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.get('/active', timeEntryController.getActiveTimeEntry);

  /**
   * @openapi
   * /api/v1/time-entries/{timeEntryId}:
   *   get:
   *     summary: Get single time entry
   *     tags: [Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: timeEntryId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Time entry retrieved successfully
   *       404:
   *         description: Time entry not found
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.get('/:timeEntryId', timeEntryController.getTimeEntry);

  /**
   * @openapi
   * /api/v1/time-entries/{timeEntryId}:
   *   put:
   *     summary: Update time entry
   *     tags: [Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: timeEntryId
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
   *               clockIn:
   *                 type: string
   *                 format: date-time
   *               clockOut:
   *                 type: string
   *                 format: date-time
   *               breakStart:
   *                 type: string
   *                 format: date-time
   *               breakEnd:
   *                 type: string
   *                 format: date-time
   *               workLocation:
   *                 type: string
   *                 enum: [OFFICE, REMOTE, FIELD, CLIENT_SITE, HOME]
   *               notes:
   *                 type: string
   *                 maxLength: 500
   *     responses:
   *       200:
   *         description: Time entry updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Time entry not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       500:
   *         description: Internal server error
   */
  router.put('/:timeEntryId', 
    requirePermission(['time_entries.update']),
    timeEntryController.updateTimeEntry
  );

  /**
   * @openapi
   * /api/v1/time-entries/{timeEntryId}/corrections:
   *   post:
   *     summary: Request time correction
   *     tags: [Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: timeEntryId
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
   *               newClockIn:
   *                 type: string
   *                 format: date-time
   *               newClockOut:
   *                 type: string
   *                 format: date-time
   *               reason:
   *                 type: string
   *                 minLength: 10
   *                 maxLength: 200
   *               justification:
   *                 type: string
   *                 maxLength: 1000
   *     responses:
   *       201:
   *         description: Correction request submitted successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Time entry not found
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  router.post('/:timeEntryId/corrections', timeEntryController.requestCorrection);

  /**
   * @openapi
   * /api/v1/time-entries/{timeEntryId}:
   *   delete:
   *     summary: Delete time entry
   *     tags: [Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: timeEntryId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Time entry deleted successfully
   *       404:
   *         description: Time entry not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       500:
   *         description: Internal server error
   */
  router.delete('/:timeEntryId', 
    requirePermission(['time_entries.delete']),
    timeEntryController.deleteTimeEntry
  );

  return router;
}
