import { Router } from 'express';

export function createWorkflowRoutes(services: any): Router {
  const router = Router();
  
  // TODO: Implement workflow routes
  router.get('/', (req, res) => {
    res.json({ message: 'Workflow routes not implemented yet' });
  });
  
  return router;
}
