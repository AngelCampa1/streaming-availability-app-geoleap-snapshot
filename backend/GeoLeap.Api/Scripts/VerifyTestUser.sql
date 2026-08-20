-- Emergency SQL script to verify test user for Session 2 E2E testing
-- This script updates the EmailConfirmed flag for testuser@example.com

-- First, check if user exists
SELECT
    "Id",
    "Email",
    "EmailConfirmed",
    "EmailVerificationToken",
    "EmailVerificationTokenExpires"
FROM "AspNetUsers"
WHERE "Email" = 'testuser@example.com';

-- Update the user to be verified
UPDATE "AspNetUsers"
SET
    "EmailConfirmed" = TRUE,
    "EmailVerificationToken" = NULL,
    "EmailVerificationTokenExpires" = NULL
WHERE "Email" = 'testuser@example.com';

-- Verify the update
SELECT
    "Id",
    "Email",
    "EmailConfirmed",
    "EmailVerificationToken",
    "EmailVerificationTokenExpires"
FROM "AspNetUsers"
WHERE "Email" = 'testuser@example.com';
