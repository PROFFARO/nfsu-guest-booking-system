import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

console.log('Testing SMTP Connection with:', process.env.SMTP_USER);

transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP Connection FAILED:');
        console.error(error);
    } else {
        console.log('SMTP Connection SUCCESS! Server is ready to take our messages.');

        // try to send a test email
        transporter.sendMail({
            from: `NFSU Guest House <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // send to self
            subject: 'Test Email from Node Script',
            text: 'If you get this, Nodemailer is working.'
        }, (err, info) => {
            if (err) {
                console.error('Test Send FAILED:', err);
            } else {
                console.log('Test Send SUCCESS! Message ID:', info.messageId);
            }
        });
    }
});
