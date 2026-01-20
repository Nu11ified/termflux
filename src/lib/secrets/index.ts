import { db } from "@/lib/db";
import { secrets, workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { containerManager } from "@/lib/docker";

// Encryption key (should be loaded from secure environment)
const ENCRYPTION_KEY = process.env.SECRETS_ENCRYPTION_KEY || "";

// Types
export interface Secret {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecretValue extends Secret {
  value: string;
}

/**
 * Secrets Manager
 * Handles encrypted storage and secure injection of secrets
 */
export class SecretsManager {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  /**
   * Derive encryption key from master key
   */
  private async deriveKey(salt: BufferSource): Promise<CryptoKey> {
    if (!ENCRYPTION_KEY) {
      throw new Error("SECRETS_ENCRYPTION_KEY not configured");
    }

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      this.encoder.encode(ENCRYPTION_KEY) as BufferSource,
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as BufferSource,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypt a value
   */
  private async encrypt(value: string): Promise<{ encrypted: string; salt: string; iv: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(salt as BufferSource);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      this.encoder.encode(value) as BufferSource
    );

    return {
      encrypted: Buffer.from(encrypted).toString("base64"),
      salt: Buffer.from(salt).toString("base64"),
      iv: Buffer.from(iv).toString("base64"),
    };
  }

  /**
   * Decrypt a value
   */
  private async decrypt(encrypted: string, salt: string, iv: string): Promise<string> {
    const saltBuffer = new Uint8Array(Buffer.from(salt, "base64"));
    const ivBuffer = new Uint8Array(Buffer.from(iv, "base64"));
    const key = await this.deriveKey(saltBuffer as BufferSource);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer as BufferSource },
      key,
      Buffer.from(encrypted, "base64") as BufferSource
    );

    return this.decoder.decode(decrypted);
  }

  /**
   * Create or update a secret
   */
  async setSecret(
    workspaceId: string,
    name: string,
    value: string
  ): Promise<Secret> {
    // Validate secret name
    if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
      throw new Error("Secret name must be uppercase with underscores only (e.g., MY_SECRET)");
    }

    // Encrypt the value
    const { encrypted, salt, iv } = await this.encrypt(value);
    const encryptedValue = JSON.stringify({ encrypted, salt, iv });

    // Check if secret exists
    const existing = await db
      .select()
      .from(secrets)
      .where(and(eq(secrets.workspaceId, workspaceId), eq(secrets.name, name)));

    let secret: typeof secrets.$inferSelect | undefined;

    if (existing.length > 0) {
      // Update existing secret
      const updated = await db
        .update(secrets)
        .set({
          encryptedValue,
          updatedAt: new Date(),
        })
        .where(and(eq(secrets.workspaceId, workspaceId), eq(secrets.name, name)))
        .returning();
      secret = updated[0];
    } else {
      // Create new secret
      const inserted = await db
        .insert(secrets)
        .values({
          workspaceId,
          name,
          encryptedValue,
        })
        .returning();
      secret = inserted[0];
    }

    if (!secret) {
      throw new Error("Failed to save secret");
    }

    return {
      id: secret.id,
      workspaceId: secret.workspaceId,
      name: secret.name,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
    };
  }

  /**
   * Get a secret value (decrypted)
   */
  async getSecret(workspaceId: string, name: string): Promise<SecretValue | null> {
    const [secret] = await db
      .select()
      .from(secrets)
      .where(and(eq(secrets.workspaceId, workspaceId), eq(secrets.name, name)));

    if (!secret) {
      return null;
    }

    const { encrypted, salt, iv } = JSON.parse(secret.encryptedValue);
    const value = await this.decrypt(encrypted, salt, iv);

    return {
      id: secret.id,
      workspaceId: secret.workspaceId,
      name: secret.name,
      value,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
    };
  }

  /**
   * List secrets for a workspace (without values)
   */
  async listSecrets(workspaceId: string): Promise<Secret[]> {
    const results = await db
      .select({
        id: secrets.id,
        workspaceId: secrets.workspaceId,
        name: secrets.name,
        createdAt: secrets.createdAt,
        updatedAt: secrets.updatedAt,
      })
      .from(secrets)
      .where(eq(secrets.workspaceId, workspaceId));

    return results;
  }

  /**
   * Delete a secret
   */
  async deleteSecret(workspaceId: string, name: string): Promise<boolean> {
    const deleted = await db
      .delete(secrets)
      .where(and(eq(secrets.workspaceId, workspaceId), eq(secrets.name, name)))
      .returning({ id: secrets.id });

    return deleted.length > 0;
  }

  /**
   * Get all secrets as environment variables (decrypted)
   */
  async getSecretsAsEnv(workspaceId: string): Promise<Record<string, string>> {
    const secretList = await db
      .select()
      .from(secrets)
      .where(eq(secrets.workspaceId, workspaceId));

    const env: Record<string, string> = {};

    for (const secret of secretList) {
      const { encrypted, salt, iv } = JSON.parse(secret.encryptedValue);
      env[secret.name] = await this.decrypt(encrypted, salt, iv);
    }

    return env;
  }

  /**
   * Inject secrets into container as environment variables
   */
  async injectSecretsToContainer(workspaceId: string): Promise<void> {
    const env = await this.getSecretsAsEnv(workspaceId);

    if (Object.keys(env).length === 0) {
      return;
    }

    // Create a script that exports the secrets
    const exportScript = Object.entries(env)
      .map(([key, value]) => {
        // Escape single quotes in values
        const escapedValue = value.replace(/'/g, "'\\''");
        return `export ${key}='${escapedValue}'`;
      })
      .join("\n");

    // Write to a secrets file in the container (readable only by user)
    const secretsPath = "/home/dev/.termflux_secrets";
    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `cat > ${secretsPath} << 'TERMFLUX_SECRETS_EOF'\n${exportScript}\nTERMFLUX_SECRETS_EOF\nchmod 600 ${secretsPath}`,
    ]);

    // Add source command to bashrc if not already present
    const sourceCmd = `[ -f ${secretsPath} ] && source ${secretsPath}`;
    const bashrcPath = "/home/dev/.bashrc";

    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `grep -q "termflux_secrets" ${bashrcPath} || echo '\n# Load Termflux secrets\n${sourceCmd}' >> ${bashrcPath}`,
    ]);
  }

  /**
   * Remove secrets from container
   */
  async removeSecretsFromContainer(workspaceId: string): Promise<void> {
    const secretsPath = "/home/dev/.termflux_secrets";

    await containerManager.exec(workspaceId, ["rm", "-f", secretsPath]);
    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `sed -i '/termflux_secrets/d' /home/dev/.bashrc`,
    ]);
  }

  /**
   * Rotate all secrets (re-encrypt with new key derivation)
   */
  async rotateSecrets(workspaceId: string): Promise<void> {
    const secretList = await db
      .select()
      .from(secrets)
      .where(eq(secrets.workspaceId, workspaceId));

    for (const secret of secretList) {
      // Decrypt with current encryption
      const { encrypted, salt, iv } = JSON.parse(secret.encryptedValue);
      const value = await this.decrypt(encrypted, salt, iv);

      // Re-encrypt with new salt and IV
      const newEncrypted = await this.encrypt(value);

      await db
        .update(secrets)
        .set({
          encryptedValue: JSON.stringify(newEncrypted),
          updatedAt: new Date(),
        })
        .where(eq(secrets.id, secret.id));
    }
  }

  /**
   * Mask secrets in output (for logging)
   */
  async maskSecretsInOutput(workspaceId: string, output: string): Promise<string> {
    const env = await this.getSecretsAsEnv(workspaceId);
    let maskedOutput = output;

    for (const value of Object.values(env)) {
      if (value.length >= 4) {
        // Only mask values that are at least 4 characters
        maskedOutput = maskedOutput.replace(
          new RegExp(this.escapeRegExp(value), "g"),
          "********"
        );
      }
    }

    return maskedOutput;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Import secrets from .env format
   */
  async importFromEnv(workspaceId: string, envContent: string): Promise<Secret[]> {
    const results: Secret[] = [];
    const lines = envContent.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith("#") || trimmed === "") {
        continue;
      }

      // Parse key=value
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && match[1] && match[2] !== undefined) {
        const name = match[1];
        const value = match[2];
        // Remove surrounding quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, "");
        const secret = await this.setSecret(workspaceId, name, cleanValue);
        results.push(secret);
      }
    }

    return results;
  }

  /**
   * Export secrets to .env format (decrypted)
   */
  async exportToEnv(workspaceId: string): Promise<string> {
    const env = await this.getSecretsAsEnv(workspaceId);

    return Object.entries(env)
      .map(([key, value]) => {
        // Quote values that contain special characters
        if (/[\s"'$`\\]/.test(value)) {
          return `${key}="${value.replace(/"/g, '\\"')}"`;
        }
        return `${key}=${value}`;
      })
      .join("\n");
  }
}

// Export singleton
export const secretsManager = new SecretsManager();
