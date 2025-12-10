import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import db from "@/db";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        console.log("========================================");
        console.log("[Auth] sendVerificationOTP CALLED!");
        console.log("[Auth] Email:", email);
        console.log("[Auth] Type:", type);
        console.log("[Auth] OTP:", otp);
        console.log("========================================");

        const subject = {
          "sign-in": "Your sign-in code",
          "email-verification": "Verify your email",
          "forget-password": "Reset your password",
        }[type];

        const message = `Your verification code is: ${otp}\n\nThis code expires in 5 minutes.`;

        console.log("[Auth] Sending via Resend to:", email);

        const result = await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "GEO Analytics <onboarding@resend.dev>",
          to: email,
          subject: subject || "Your verification code",
          text: message,
        });

        console.log("[Auth] Resend result:", result);

        // Throw error if Resend failed so better-auth propagates it to the client
        if (result.error) {
          console.error("[Auth] Resend error:", result.error);
          throw new Error(
            result.error.message || "Failed to send verification email"
          );
        }
      },
    }),
  ],
});
