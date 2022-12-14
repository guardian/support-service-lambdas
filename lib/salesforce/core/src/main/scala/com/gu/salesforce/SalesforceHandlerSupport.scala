package com.gu.salesforce

case class SalesforceHandlerSupportError(message: String)

sealed trait Contact
case class IdentityId(id: String) extends Contact
case class SalesforceContactId(id: String) extends Contact

object SalesforceHandlerSupport {
  val HEADER_IDENTITY_ID = "x-identity-id"
  val HEADER_SALESFORCE_CONTACT_ID = "x-salesforce-contact-id"

  def extractContactFromHeaders(headers: List[(String, String)]): Either[SalesforceHandlerSupportError, Contact] =
    headers
      .collectFirst {
        case (HEADER_SALESFORCE_CONTACT_ID, sfContactId) => SalesforceContactId(sfContactId)
        case (HEADER_IDENTITY_ID, identityId) => IdentityId(identityId)
      }
      .toRight(
        SalesforceHandlerSupportError(
          s"either '$HEADER_IDENTITY_ID' header OR '$HEADER_SALESFORCE_CONTACT_ID' (one is required)",
        ),
      )
}
