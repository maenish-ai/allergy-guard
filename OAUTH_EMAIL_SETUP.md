# Email OAuth setup — no longer required

Starting with Allergy Guard v0.7.3, email backup no longer uses Gmail or Microsoft OAuth.

The application creates an encrypted `.agbackup` file and opens the mail application already configured on the phone with the recipient, subject, body, and attachment prepared. The user only presses **Send**.

Therefore there is no Google Cloud project, Microsoft Entra app, OAuth client ID, email password, or paid server required for the current backup flow.
