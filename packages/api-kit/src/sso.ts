import { jwtVerify, SignJWT } from "jose";
import type { SsoConnectClaims } from "@idportal/contracts";
import { BadRequestError } from "./errors";

const encoder = new TextEncoder();

export function getSsoSecrets(): Record<string, string> {
  const raw = process.env.JWT_SECRETS ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getSsoSecret(source: string): Uint8Array {
  const secrets = getSsoSecrets();
  const secret = secrets[source];
  if (!secret || secret.length < 16) {
    throw new BadRequestError(`SSO not configured for source: ${source}`);
  }
  return encoder.encode(secret);
}

export async function verifySsoToken(
  source: string,
  token: string,
): Promise<SsoConnectClaims> {
  const { payload } = await jwtVerify(token, getSsoSecret(source));
  return {
    source: source as SsoConnectClaims["source"],
    externalOrgId: String(payload.externalOrgId),
    userId: String(payload.userId),
    email: String(payload.email),
    name: String(payload.name),
    permissions: payload.permissions as SsoConnectClaims["permissions"],
    orgName: String(payload.orgName),
    apiBaseUrl: String(payload.apiBaseUrl),
  };
}

export async function signSsoToken(
  source: string,
  claims: Omit<SsoConnectClaims, "source">,
): Promise<string> {
  return new SignJWT({ ...claims, source })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getSsoSecret(source));
}
