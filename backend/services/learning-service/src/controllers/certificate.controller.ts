import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { CertificateService } from '../services/certificate.service';

const logger = createLogger('certificate-controller');

export class CertificateController {
  constructor(private certificateService: CertificateService) {}

  /**
   * Generate certificate for course completion
   */
  generateCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { enrollmentId } = req.body;

      const certificate = await this.certificateService.generateCertificate(enrollmentId, userId);

      logger.info('Certificate generated successfully', {
        certificateId: certificate.id,
        enrollmentId,
        userId,
      });

      res.status(201).json({
        success: true,
        certificate,
        message: 'Certificate generated successfully',
      });
    } catch (error) {
      logger.error('Failed to generate certificate', error as Error);
      res.status(500).json({
        error: 'Failed to generate certificate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get certificate by ID
   */
  getCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const certificate = await this.certificateService.getCertificate(id, userId);

      if (!certificate) {
        res.status(404).json({
          error: 'Certificate not found',
          message: 'The requested certificate was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        certificate,
      });
    } catch (error) {
      logger.error('Failed to get certificate', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve certificate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List user certificates
   */
  listUserCertificates = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { targetUserId } = req.params;
      const {
        courseId,
        isValid,
        page = 1,
        limit = 20,
        sortBy = 'completionDate',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        courseId: courseId as string,
        isValid: isValid ? isValid === 'true' : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.certificateService.listUserCertificates(targetUserId, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list user certificates', error as Error);
      res.status(500).json({
        error: 'Failed to list user certificates',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List all certificates (admin/instructor view)
   */
  listCertificates = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        courseId,
        userId: filterUserId,
        isValid,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'completionDate',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        courseId: courseId as string,
        userId: filterUserId as string,
        isValid: isValid ? isValid === 'true' : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.certificateService.listCertificates(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list certificates', error as Error);
      res.status(500).json({
        error: 'Failed to list certificates',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Verify certificate
   */
  verifyCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { verificationCode } = req.params;

      const certificate = await this.certificateService.verifyCertificate(verificationCode);

      if (!certificate) {
        res.status(404).json({
          error: 'Certificate not found',
          message: 'Invalid verification code or certificate not found',
        });
        return;
      }

      res.json({
        success: true,
        certificate,
        message: 'Certificate verified successfully',
      });
    } catch (error) {
      logger.error('Failed to verify certificate', error as Error);
      res.status(500).json({
        error: 'Failed to verify certificate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Download certificate
   */
  downloadCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { format = 'pdf' } = req.query;

      const result = await this.certificateService.downloadCertificate(id, format as string, userId);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      logger.error('Failed to download certificate', error as Error);
      res.status(500).json({
        error: 'Failed to download certificate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Revoke certificate
   */
  revokeCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { reason } = req.body;

      const certificate = await this.certificateService.revokeCertificate(id, reason, userId);

      logger.info('Certificate revoked', { certificateId: id, reason, userId });

      res.json({
        success: true,
        certificate,
        message: 'Certificate revoked successfully',
      });
    } catch (error) {
      logger.error('Failed to revoke certificate', error as Error);
      res.status(500).json({
        error: 'Failed to revoke certificate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Reactivate certificate
   */
  reactivateCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const certificate = await this.certificateService.reactivateCertificate(id, userId);

      logger.info('Certificate reactivated', { certificateId: id, userId });

      res.json({
        success: true,
        certificate,
        message: 'Certificate reactivated successfully',
      });
    } catch (error) {
      logger.error('Failed to reactivate certificate', error as Error);
      res.status(500).json({
        error: 'Failed to reactivate certificate',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get certificate analytics
   */
  getCertificateAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { courseId, startDate, endDate } = req.query;

      const options = {
        courseId: courseId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        requestingUserId: userId,
      };

      const analytics = await this.certificateService.getCertificateAnalytics(options);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error('Failed to get certificate analytics', error as Error);
      res.status(500).json({
        error: 'Failed to get certificate analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Bulk generate certificates
   */
  bulkGenerateCertificates = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { enrollmentIds } = req.body;

      const result = await this.certificateService.bulkGenerateCertificates(enrollmentIds, userId);

      logger.info('Bulk certificate generation completed', {
        totalRequested: enrollmentIds.length,
        successful: result.successful,
        failed: result.failed,
        userId,
      });

      res.json({
        success: true,
        result,
        message: `${result.successful} certificates generated successfully, ${result.failed} failed`,
      });
    } catch (error) {
      logger.error('Failed to bulk generate certificates', error as Error);
      res.status(500).json({
        error: 'Failed to bulk generate certificates',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get certificate templates
   */
  getCertificateTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;

      const templates = await this.certificateService.getCertificateTemplates(userId);

      res.json({
        success: true,
        templates,
      });
    } catch (error) {
      logger.error('Failed to get certificate templates', error as Error);
      res.status(500).json({
        error: 'Failed to get certificate templates',
        message: (error as Error).message,
      });
    }
  };
}
