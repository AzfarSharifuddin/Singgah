import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, REGISTRATION_PASSWORD_PATTERN, passwordRequirements, isValidRegistrationPassword } from "../src/lib/vendor-management/password.ts";

const valid = "LocalVendor1!";
test("registration requires length, uppercase, number and a genuine special character", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 12);
  assert.equal(PASSWORD_MAX_LENGTH, 128);
  assert.equal(isValidRegistrationPassword(valid), true);
  assert.equal(isValidRegistrationPassword("Aa1!" + "x".repeat(8)), true, "exactly 12 characters is permitted");
  assert.equal(isValidRegistrationPassword("Aa1!" + "x".repeat(7)), false, "11 characters is too short");
  assert.equal(isValidRegistrationPassword("LOCALVENDOR1!"), true, "lowercase letters are not an additional requirement");
  for (const password of ["", "Short1!", "localvendor1!", "LocalVendor!!", "LocalVendor12", "LocalVendor1 ", "LocalVendor1é", "Aa1!" + "x".repeat(125)]) {
    assert.equal(isValidRegistrationPassword(password), false, "reject invalid fixture");
  }
  assert.equal(isValidRegistrationPassword("Aa1!" + "x".repeat(124)), true);
  assert.equal(isValidRegistrationPassword("Élodievendor1!"), true);
  assert.equal(isValidRegistrationPassword("Local Vendor1!"), true, "spaces are permitted but are not special characters");
});

test("checklist updates each requirement independently and agrees with the native input pattern", () => {
  assert.deepEqual(passwordRequirements("").map((item) => item.met), [false, false, false, false]);
  assert.deepEqual(passwordRequirements("abcdefghijkl").map((item) => item.met), [true, false, false, false]);
  assert.deepEqual(passwordRequirements("abcdefghijklA").map((item) => item.met), [true, true, false, false]);
  assert.deepEqual(passwordRequirements("abcdefghijklA1").map((item) => item.met), [true, true, true, false]);
  assert.ok(passwordRequirements(valid).every((item) => item.met));
  const nativePattern = new RegExp(`^(?:${REGISTRATION_PASSWORD_PATTERN})$`, "v");
  for (const password of [valid, "localvendor1!", "LocalVendor!!", "LocalVendor12", "LocalVendor1é", "Élodievendor1!", "Local Vendor1!", "A1!", "Aa1!" + "x".repeat(125)]) {
    assert.equal(nativePattern.test(password) && password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH, isValidRegistrationPassword(password));
  }
});

test("the registration server action rejects weak passwords before auth and preserves CAPTCHA gating", async () => {
  let authCalls = 0;
  let signedUp;
  const modules = {
    "next/navigation": { redirect() { throw new Error("unexpected redirect"); } },
    "next/cache": {},
    "next/headers": { headers: async () => new Headers({ origin: "https://singgah.example" }) },
    "@/lib/supabase/vendor": { vendorClient: async () => { authCalls++; return { auth: { signUp: async (input) => { signedUp = input; return { data: { session: null, user: {} }, error: null }; } } }; } },
    "./validation": {}, "./media-actions": {}, "./password": { isValidRegistrationPassword },
  };
  const source = readFileSync(new URL("../src/lib/vendor-management/actions.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require(name) { assert.ok(name in modules, name); return modules[name]; }, console, FormData });
  const form = (password, captcha = "unit-test-only") => {
    const data = new FormData(); data.set("email", "vendor@example.test"); data.set("password", password); data.set("cf-turnstile-response", captcha); return data;
  };
  for (const password of ["short", "localvendor1!", "LocalVendor!!", "LocalVendor12", "x".repeat(129)]) {
    assert.match((await exports.register({ message: "" }, form(password))).message, /uppercase letter.*number.*special character/);
  }
  assert.equal(authCalls, 0, "invalid passwords never reach Supabase");
  assert.match((await exports.register({ message: "" }, form(valid, ""))).message, /Turnstile check/);
  assert.equal(authCalls, 0);
  const result = await exports.register({ message: "" }, form(valid));
  assert.equal(result.ok, true);
  assert.equal(authCalls, 1);
  assert.equal(signedUp.password, valid);
  assert.equal(signedUp.options.captchaToken, "unit-test-only");
  assert.equal(signedUp.options.emailRedirectTo, "https://singgah.example/auth/callback");
});
