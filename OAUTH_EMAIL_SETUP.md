# Email backup setup

This project no longer requires Gmail/Outlook OAuth setup for the simple email-backup flow.

The app creates an encrypted `.agbackup` file locally and opens the email UI installed on the phone. No Google Cloud, Microsoft Entra, OAuth client ID, or email password is required.

The user enters:
1. The destination email address.
2. A backup protection code created by the user (not the email password).

The user then presses the send-backup button and completes the final Send action in the email app.
