"""
shared/integrations/email/client.py
----------------------------------
Asynchronous SMTP client for sending transactional emails (e.g. M365, SendGrid).
"""
import logging
from email.message import EmailMessage
import aiosmtplib

logger = logging.getLogger(__name__)

class EmailClient:
    def __init__(
        self, 
        host: str, 
        port: int, 
        username: str, 
        password: str, 
        use_tls: bool = True,
        sender_email: str = None
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.sender_email = sender_email or username

    async def send_email(self, to: str, subject: str, body: str, is_html: bool = False):
        """
        Sends an email using the configured SMTP server.
        Supports STARTTLS (Port 587) or SSL/TLS (Port 465).
        """
        message = EmailMessage()
        message["From"] = self.sender_email
        message["To"] = to
        message["Subject"] = subject
        
        if is_html:
            message.set_content(body, subtype="html")
        else:
            message.set_content(body)

        try:
            # Use aiosmtplib to send the email
            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                start_tls=self.use_tls and self.port == 587,
                use_tls=self.use_tls and self.port == 465,
            )
            logger.info(f"Email successfully sent to {to} via {self.host}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to} via {self.host}: {str(e)}")
            raise e
