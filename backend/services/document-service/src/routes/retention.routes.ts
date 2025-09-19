import { Router } from 'express';

export function createRetentionRoutes(services: any): Router {
  const router = Router();
  
  // TODO: Implement retention routes
  router.get('/', (req, res) => {
    res.json({ message: 'Retention routes not implemented yet' });
  });
  
  return router;
}
