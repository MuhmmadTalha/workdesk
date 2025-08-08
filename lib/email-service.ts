// Email service for sending notifications to employees
// This would typically use a service like Resend, SendGrid, or Nodemailer

interface EmailData {
  to: string
  subject: string
  html: string
  from?: string
}

interface EmployeeNotificationData {
  name: string
  email: string
  companyName: string
  adminName: string
  setupUrl: string
}

interface VerificationNotificationData {
  name: string
  email: string
  companyName: string
  adminName: string
  dashboardUrl: string
}

class EmailService {
  private readonly FROM_EMAIL = 'admin@gen-t.com'
  private readonly COMPANY_NAME = 'Gen-T'

  // Mock email sending - replace with actual email service
  private async sendEmail(data: EmailData): Promise<boolean> {
    console.log('📧 Email would be sent:')
    console.log('From:', data.from || this.FROM_EMAIL)
    console.log('To:', data.to)
    console.log('Subject:', data.subject)
    console.log('HTML:', data.html)
    
    // In production, use an actual email service:
    // - Resend: https://resend.com
    // - SendGrid: https://sendgrid.com
    // - Nodemailer with SMTP
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return true // Simulate successful send
  }

  // Send welcome email to new employee with password setup link
  async sendEmployeeWelcomeEmail(data: EmployeeNotificationData): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to ${data.companyName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #3b82f6; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${data.companyName}!</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.name},</h2>
              <p>Welcome to ${data.companyName}! We're excited to have you join our team.</p>
              
              <p><strong>Your account has been created</strong> and is currently pending verification by our admin team.</p>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Your account will be reviewed and verified by ${data.adminName}</li>
                <li>Once verified, you'll receive another email with login instructions</li>
                <li>You'll be able to set up your password and access the employee dashboard</li>
              </ol>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>✅ Account verification (pending)</li>
                <li>📧 Password setup email (after verification)</li>
                <li>🚀 Access to employee dashboard</li>
              </ul>
              
              <p>If you have any questions, please don't hesitate to contact ${data.adminName} or the HR department.</p>
              
              <p>Best regards,<br>
              The ${data.companyName} Team</p>
            </div>
            <div class="footer">
              <p>This email was sent by ${data.companyName} Employee Management System.</p>
              <p>Email: ${data.email} | Admin: ${data.adminName}</p>
            </div>
          </div>
        </body>
      </html>
    `

    return await this.sendEmail({
      to: data.email,
      subject: `Welcome to ${data.companyName} - Account Created`,
      html: htmlContent,
      from: this.FROM_EMAIL
    })
  }

  // Send verification confirmation email with password setup
  async sendEmployeeVerificationEmail(data: VerificationNotificationData): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Account Verified - Set Up Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #22c55e; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .credentials { 
              background: #e5e7eb; 
              padding: 15px; 
              border-left: 4px solid #3b82f6; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Account Verified!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${data.name}!</h2>
              <p>Your ${data.companyName} employee account has been <strong>verified</strong> by ${data.adminName}.</p>
              
              <div class="credentials">
                <h3>📋 Your Login Credentials</h3>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Temporary Password:</strong> <code>12345678</code></p>
                <p><em>⚠️ You should change this password after your first login for security.</em></p>
              </div>
              
              <p><strong>🚀 Get Started:</strong></p>
              <ol>
                <li>Click the button below to access your dashboard</li>
                <li>Log in with the credentials above</li>
                <li>Update your password in your profile settings</li>
                <li>Complete your employee profile</li>
                <li>Start managing your tasks and attendance</li>
              </ol>
              
              <a href="${data.dashboardUrl}" class="button">Access Employee Dashboard</a>
              
              <p><strong>📱 Dashboard Features:</strong></p>
              <ul>
                <li>📋 View and manage assigned tasks</li>
                <li>📊 Track your performance metrics</li>
                <li>📅 Mark daily attendance</li>
                <li>📝 Access company resources</li>
              </ul>
              
              <p>Welcome to the team! If you need any assistance, please contact ${data.adminName} or the IT support team.</p>
              
              <p>Best regards,<br>
              ${data.adminName}<br>
              ${data.companyName} Administration</p>
            </div>
            <div class="footer">
              <p>This email was sent by ${data.companyName} Employee Management System.</p>
              <p>For support, contact: ${data.adminName}</p>
            </div>
          </div>
        </body>
      </html>
    `

    return await this.sendEmail({
      to: data.email,
      subject: `🎉 Account Verified - Welcome to ${data.companyName}!`,
      html: htmlContent,
      from: this.FROM_EMAIL
    })
  }

  // Generate a password reset token
  generateResetToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset Request</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #f59e0b; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>We received a request to reset your ${this.COMPANY_NAME} account password.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>For security, this link can only be used once</li>
              </ul>
              
              <p>If you have any issues, please contact your administrator.</p>
            </div>
            <div class="footer">
              <p>This email was sent by ${this.COMPANY_NAME} Employee Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return await this.sendEmail({
      to: email,
      subject: `Password Reset - ${this.COMPANY_NAME}`,
      html: htmlContent,
      from: this.FROM_EMAIL
    })
  }
}

export const emailService = new EmailService()
export type { EmployeeNotificationData, VerificationNotificationData }
