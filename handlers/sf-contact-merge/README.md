# sf-contact-merge

This lambda is used to merge together several contacts in SF.  It is initiated by running a report in SF to find out the
duplicate sets and which should be the "winner".  Then this is called with the zuora account ids and corrected salesforce
crmids and contact ids.  Then this will overwrite in zuora.

It is called manually as part of the ongoing process to get the data quality up.

See the notes doc below.  Please edit and add to it as appropriate.
https://docs.google.com/document/d/1hGLNSJujrs6b14pJCPM2ajyPTe8OZNUOfm-uO4SVXE8/edit?pli=1#
