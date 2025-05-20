import nodemailer from "nodemailer";
import logger from "../utils/logger.ts";
import config from "../config/env.ts";

interface MailOptions {
    from: string;
    to: string;
    subject: string;
    html: string;
}

/**
 * EmailService - Handles sending emails for authentication processes
 */
class EmailService {
    private transporter: nodemailer.Transporter;

    private constructor(transporter: nodemailer.Transporter) {
        this.transporter = transporter;
    }

    /**
     * Factory initializer to handle async setup
     */
    static async init(): Promise<EmailService> {
        let transporter: nodemailer.Transporter;

        if (config.server.environment === "production") {
            transporter = nodemailer.createTransport({
                host: config.email.host,
                port: config.email.port,
                secure: config.email.port === 465,
                auth: {
                    user: config.email.user,
                    pass: config.email.password,
                },
            });
        } else {
            // Development/testing email setup using Ethereal
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            logger.info(`Ethereal test account: ${testAccount.user}`);
        }

        return new EmailService(transporter);
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(
        email: string,
        resetLink: string
    ): Promise<void> {
        const mailOptions: MailOptions = {
            from: `${config.email.fromName} <${config.email.fromAddress}>`,
            to: email,
            subject: "Reset Your Password",
            html: `
        <div>
          <h1>Password Reset</h1>
          <p>You requested a password reset for your account.</p>
          <p><a href="${resetLink}" target="_blank">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, ignore this email.</p>
        </div>
      `,
        };

        await this.sendEmail(mailOptions);
    }

    /**
     * Send account verification email
     */
    async sendVerificationEmail(
        email: string,
        verificationLink: string
    ): Promise<void> {
        const mailOptions: MailOptions = {
            from: `${config.email.fromName} <${config.email.fromAddress}>`,
            to: email,
            subject: "Verify Your Email Address",
            html: `
        <div>
          <h1>Email Verification</h1>
          <p>Thanks for registering! Verify by clicking:</p>
          <a href="${verificationLink}" target="_blank">Verify Email</a>
          <p>Expires in 24 hours.</p>
        </div>
      `,
        };

        await this.sendEmail(mailOptions);
    }

    /**
     * Send welcome email after registration
     */
    async sendWelcomeEmail(email: string, name: string): Promise<void> {
        const mailOptions: MailOptions = {
            from: `${config.email.fromName} <${config.email.fromAddress}>`,
            to: email,
            subject: "Welcome to our Inventory Management System",
            html: `
        <div>
          <h1>Welcome, ${name}!</h1>
          <p>Thank you for joining our Inventory Management System.</p>
          <p>Questions? Contact us anytime.</p>
        </div>
      `,
        };

        await this.sendEmail(mailOptions);
    }

    /**
     * Generic method to send emails and handle logging
     */
    private async sendEmail(mailOptions: MailOptions): Promise<void> {
        try {
            const info = await this.transporter.sendMail(mailOptions);
            if (config.server.environment !== "production" && info.messageId) {
                logger.info(`Email sent: ${info.messageId}`);
                logger.info(
                    `Preview URL: ${nodemailer.getTestMessageUrl(info)}`
                );
            } else {
                logger.info(`Email sent to ${mailOptions.to}`);
            }
        } catch (error) {
            logger.error("Failed to send email", {
                error,
                recipient: mailOptions.to,
            });
            throw new Error("Email send failure");
        }
    }
}

const emailService = await EmailService.init();
export default emailService;
