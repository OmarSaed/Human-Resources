import vault from 'node-vault';
import { createLogger } from '../utils/logger';

const logger = createLogger('vault-secrets');

export interface VaultConfig {
  endpoint: string;
  token?: string;
  roleId?: string;
  secretId?: string;
  namespace?: string;
  timeout?: number;
}

export interface SecretData {
  [key: string]: any;
}

export class SecretsManager {
  private vaultClient: any;
  private isInitialized = false;
  private config: VaultConfig;

  constructor(config: VaultConfig) {
    this.config = config;
    // Don't await initialization in constructor to avoid unhandled rejections
    this.initializeVault().catch(error => {
      logger.error('Failed to initialize Vault secrets manager', {
        error: error.message,
        endpoint: this.config.endpoint,
      });
      // Don't re-throw to avoid unhandled rejection
    });
  }

  private async initializeVault(): Promise<void> {
    try {
      const vaultOptions: any = {
        endpoint: this.config.endpoint,
        requestOptions: {
          timeout: this.config.timeout || 5000,
        },
      };

      if (this.config.namespace) {
        vaultOptions.namespace = this.config.namespace;
      }

      this.vaultClient = vault(vaultOptions);

      // Authenticate with Vault
      if (this.config.token) {
        this.vaultClient.token = this.config.token;
      } else if (this.config.roleId && this.config.secretId) {
        await this.authenticateWithAppRole();
      } else {
        throw new Error('Either token or roleId/secretId must be provided');
      }

      // Test the connection
      await this.vaultClient.read('sys/health');
      this.isInitialized = true;

      logger.info('Vault secrets manager initialized successfully', {
        endpoint: this.config.endpoint,
        authMethod: this.config.token ? 'token' : 'approle',
      });
    } catch (error) {
      logger.error('Failed to initialize Vault secrets manager', {
        error: (error as Error).message,
        endpoint: this.config.endpoint,
      });
      // Don't throw error to prevent unhandled rejection
      this.isInitialized = false;
    }
  }

  private async authenticateWithAppRole(): Promise<void> {
    try {
      const result = await this.vaultClient.write('auth/approle/login', {
        role_id: this.config.roleId,
        secret_id: this.config.secretId,
      });

      this.vaultClient.token = result.auth.client_token;
      
      logger.info('Successfully authenticated with Vault using AppRole');
    } catch (error) {
      logger.error('Failed to authenticate with Vault using AppRole', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Read a secret from Vault
   */
  async getSecret(path: string): Promise<SecretData | null> {
    this.ensureInitialized();

    try {
      const result = await this.vaultClient.read(path);
      
      if (!result || !result.data) {
        logger.warn('Secret not found', { path });
        return null;
      }

      // Handle KV v2 format
      const secretData = result.data.data || result.data;
      
      logger.debug('Secret retrieved successfully', { path });
      return secretData;
    } catch (error) {
      if ((error as any).response?.statusCode === 404) {
        logger.warn('Secret not found', { path });
        return null;
      }

      logger.error('Failed to read secret from Vault', {
        path,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Write a secret to Vault
   */
  async setSecret(path: string, data: SecretData): Promise<void> {
    this.ensureInitialized();

    try {
      // For KV v2, wrap data in a data object
      const secretData = path.startsWith('secret/data/') ? { data } : data;
      
      await this.vaultClient.write(path, secretData);
      
      logger.info('Secret written successfully', { path });
    } catch (error) {
      logger.error('Failed to write secret to Vault', {
        path,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete a secret from Vault
   */
  async deleteSecret(path: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.vaultClient.delete(path);
      
      logger.info('Secret deleted successfully', { path });
    } catch (error) {
      logger.error('Failed to delete secret from Vault', {
        path,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List secrets at a given path
   */
  async listSecrets(path: string): Promise<string[]> {
    this.ensureInitialized();

    try {
      const result = await this.vaultClient.list(path);
      
      if (!result || !result.data || !result.data.keys) {
        return [];
      }

      return result.data.keys;
    } catch (error) {
      if ((error as any).response?.statusCode === 404) {
        return [];
      }

      logger.error('Failed to list secrets from Vault', {
        path,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate dynamic database credentials
   */
  async getDatabaseCredentials(role: string): Promise<{ username: string; password: string } | null> {
    this.ensureInitialized();

    try {
      const result = await this.vaultClient.read(`database/creds/${role}`);
      
      if (!result || !result.data) {
        return null;
      }

      return {
        username: result.data.username,
        password: result.data.password,
      };
    } catch (error) {
      logger.error('Failed to get database credentials from Vault', {
        role,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Encrypt data using Vault transit engine
   */
  async encrypt(keyName: string, plaintext: string): Promise<string> {
    this.ensureInitialized();

    try {
      const result = await this.vaultClient.write(`transit/encrypt/${keyName}`, {
        plaintext: Buffer.from(plaintext).toString('base64'),
      });

      return result.data.ciphertext;
    } catch (error) {
      logger.error('Failed to encrypt data with Vault', {
        keyName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Decrypt data using Vault transit engine
   */
  async decrypt(keyName: string, ciphertext: string): Promise<string> {
    this.ensureInitialized();

    try {
      const result = await this.vaultClient.write(`transit/decrypt/${keyName}`, {
        ciphertext,
      });

      return Buffer.from(result.data.plaintext, 'base64').toString();
    } catch (error) {
      logger.error('Failed to decrypt data with Vault', {
        keyName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Renew the Vault token
   */
  async renewToken(): Promise<void> {
    this.ensureInitialized();

    try {
      await this.vaultClient.write('auth/token/renew-self');
      logger.info('Vault token renewed successfully');
    } catch (error) {
      logger.error('Failed to renew Vault token', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check Vault health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.vaultClient.read('sys/health');
      return true;
    } catch (error) {
      logger.error('Vault health check failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Vault secrets manager is not initialized. Vault server may not be available.');
    }
  }
}

/**
 * Configuration helper for common secret types
 */
export class ConfigurationManager {
  constructor(private secretsManager: SecretsManager) {}

  /**
   * Get database configuration from Vault
   */
  async getDatabaseConfig(environment: string): Promise<any> {
    const secrets = await this.secretsManager.getSecret(`secret/data/database/${environment}`);
    return secrets;
  }

  /**
   * Get JWT configuration from Vault
   */
  async getJWTConfig(environment: string): Promise<any> {
    const secrets = await this.secretsManager.getSecret(`secret/data/jwt/${environment}`);
    return secrets;
  }

  /**
   * Get Redis configuration from Vault
   */
  async getRedisConfig(environment: string): Promise<any> {
    const secrets = await this.secretsManager.getSecret(`secret/data/redis/${environment}`);
    return secrets;
  }

  /**
   * Get Kafka configuration from Vault
   */
  async getKafkaConfig(environment: string): Promise<any> {
    const secrets = await this.secretsManager.getSecret(`secret/data/kafka/${environment}`);
    return secrets;
  }

  /**
   * Get external service API keys
   */
  async getAPIKeys(service: string, environment: string): Promise<any> {
    const secrets = await this.secretsManager.getSecret(`secret/data/api-keys/${service}/${environment}`);
    return secrets;
  }
}

// Singleton pattern for secrets manager
let secretsManagerInstance: SecretsManager | null = null;

export function initializeSecretsManager(config: VaultConfig): SecretsManager {
  if (secretsManagerInstance) {
    logger.warn('Secrets manager already initialized');
    return secretsManagerInstance;
  }

  secretsManagerInstance = new SecretsManager(config);
  return secretsManagerInstance;
}

export function getSecretsManager(): SecretsManager {
  if (!secretsManagerInstance) {
    throw new Error('Secrets manager not initialized. Call initializeSecretsManager() first.');
  }
  return secretsManagerInstance;
}
