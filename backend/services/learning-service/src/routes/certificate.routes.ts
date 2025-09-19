import express from 'express';
import { CertificateController } from '../controllers/certificate.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createCertificateRoutes(certificateController: CertificateController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Certificate generation
  router.post(
    '/generate',
    certificateController.generateCertificate
  );

  router.post(
    '/bulk-generate',
    requirePermission('certificate.bulk_generate'),
    certificateController.bulkGenerateCertificates
  );

  // Certificate management
  router.get(
    '/templates',
    requirePermission('certificate.view_templates'),
    certificateController.getCertificateTemplates
  );

  router.get(
    '/analytics',
    requirePermission('certificate.analytics'),
    certificateController.getCertificateAnalytics
  );

  router.get(
    '/',
    requirePermission('certificate.list_all'),
    certificateController.listCertificates
  );

  router.get(
    '/user/:targetUserId',
    certificateController.listUserCertificates
  );

  router.get(
    '/:id',
    certificateController.getCertificate
  );

  router.get(
    '/:id/download',
    certificateController.downloadCertificate
  );

  // Certificate verification (public endpoint)
  router.get(
    '/verify/:verificationCode',
    certificateController.verifyCertificate
  );

  // Certificate status management
  router.post(
    '/:id/revoke',
    requirePermission('certificate.revoke'),
    certificateController.revokeCertificate
  );

  router.post(
    '/:id/reactivate',
    requirePermission('certificate.reactivate'),
    certificateController.reactivateCertificate
  );

  return router;
}
