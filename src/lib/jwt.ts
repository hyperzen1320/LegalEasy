import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const secretRaw = process.env.AUTH_SECRET;
if (!secretRaw) {
  throw new Error("AUTH_SECRET is not set in environment");
}
const secret = new TextEncoder().encode(secretRaw);

export type MobileJWTPayload = {
  sub: string;
  email: string;
  userType: "global_admin" | "partner_admin" | "user";
  partnerId: string | null;
  firstName: string;
  lastName: string;
};

export async function signMobileJWT(
  payload: MobileJWTPayload
): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyMobileJWT(
  token: string
): Promise<MobileJWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return {
    sub: String(payload.sub),
    email: String(payload.email),
    userType: payload.userType as MobileJWTPayload["userType"],
    partnerId: (payload.partnerId as string | null) ?? null,
    firstName: String(payload.firstName ?? ""),
    lastName: String(payload.lastName ?? ""),
  };
}
