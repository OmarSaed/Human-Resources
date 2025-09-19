import { getServiceConfig } from '@hrms/shared';

// Get service-specific configuration
export const config = getServiceConfig('time-attendance-service');

// Export for backward compatibility with existing imports
export const timeAttendanceConfig = config;

// Export default configuration
export default config;
