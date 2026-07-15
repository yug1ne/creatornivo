import assert from "node:assert/strict";
import test from "node:test";

import {
  getEmailDomain,
  isDisposableEmailDomain,
} from "../src/config/disposable-email-domains";
import {
  CredentialsRegistrationError,
  REGISTRATION_EMAIL_NOT_ALLOWED_MESSAGE,
  registerCredentialsUser,
} from "../src/lib/auth/credentials";
import { postAuthRegister } from "../src/app/api/auth/register/route";

test("getEmailDomain normalizes and extracts domain", () => {
  assert.equal(getEmailDomain("  User@Mailinator.COM  "), "mailinator.com");
  assert.equal(getEmailDomain("a@b.co"), "b.co");
  assert.equal(getEmailDomain("not-an-email"), null);
  assert.equal(getEmailDomain("@nodomain"), null);
  assert.equal(getEmailDomain("nodomain@"), null);
});

test("isDisposableEmailDomain blocks known disposable domains and subdomains", () => {
  assert.equal(isDisposableEmailDomain("user@mailinator.com"), true);
  assert.equal(isDisposableEmailDomain("  User@YOPMAIL.COM  "), true);
  assert.equal(isDisposableEmailDomain("a@guerrillamail.com"), true);
  assert.equal(isDisposableEmailDomain("x@10minutemail.com"), true);
  assert.equal(isDisposableEmailDomain("alias@temp-mail.org"), true);
  assert.equal(isDisposableEmailDomain("nested@sub.mailinator.com"), true);
  assert.equal(isDisposableEmailDomain("nested@deep.sub.yopmail.com"), true);
});

test("isDisposableEmailDomain allows major providers", () => {
  assert.equal(isDisposableEmailDomain("user@gmail.com"), false);
  assert.equal(isDisposableEmailDomain("user@googlemail.com"), false);
  assert.equal(isDisposableEmailDomain("user@outlook.com"), false);
  assert.equal(isDisposableEmailDomain("user@hotmail.com"), false);
  assert.equal(isDisposableEmailDomain("user@yahoo.com"), false);
  assert.equal(isDisposableEmailDomain("user@icloud.com"), false);
  assert.equal(isDisposableEmailDomain("user@proton.me"), false);
  assert.equal(isDisposableEmailDomain("user@protonmail.com"), false);
  assert.equal(isDisposableEmailDomain("user@example.com"), false);
  assert.equal(isDisposableEmailDomain("founder@creatornivo.com"), false);
});

test("registerCredentialsUser rejects disposable email before createUser", async () => {
  let createCalls = 0;

  await assert.rejects(
    registerCredentialsUser(
      {
        name: "Temp",
        email: "  Abuse@Mailinator.com  ",
        password: "password-12345",
      },
      {
        findUserByEmail: async () => null,
        hashPassword: async () => "hash",
        createUser: async (data) => {
          createCalls += 1;
          return data;
        },
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof CredentialsRegistrationError);
      assert.equal(error.code, "email_not_allowed");
      return true;
    },
  );

  assert.equal(createCalls, 0);
});

test("registerCredentialsUser allows normal email domains", async () => {
  const user = await registerCredentialsUser(
    {
      name: "Real",
      email: "person@gmail.com",
      password: "password-12345",
    },
    {
      findUserByEmail: async () => null,
      hashPassword: async (plain) => `hashed:${plain}`,
      createUser: async (data) => ({
        id: "u1",
        email: data.email,
        name: data.name,
        plan: "free" as const,
      }),
    },
  );

  assert.equal(user.email, "person@gmail.com");
});

test("register route returns generic 400 for disposable email", async () => {
  const response = await postAuthRegister(
    new Request("https://www.creatornivo.com/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.40",
      },
      body: JSON.stringify({
        name: "Temp",
        email: "throwaway@yopmail.com",
        password: "password-12345",
      }),
    }),
    {
      enforceRateLimit: async () => undefined,
    },
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, REGISTRATION_EMAIL_NOT_ALLOWED_MESSAGE);
  assert.doesNotMatch(String(payload.error), /disposable|temporary|yopmail/i);
});
