# identity-retention

This lambda is used to look up an identity user's status to determine whether they have a recurring relationship with The Guardian. 

It is called by the following [Step Function](https://github.com/guardian/identity-account-deletion), and the response forms part of the decision
about whether a user's identity account can be deleted or not.