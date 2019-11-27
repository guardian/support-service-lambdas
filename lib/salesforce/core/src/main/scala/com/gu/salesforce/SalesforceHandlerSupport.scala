package com.gu.salesforce

import com.gu.salesforce.SalesforceQueryConstants.Contact

object SalesforceHandlerSupport {
  val HEADER_IDENTITY_ID = "x-identity-id"
  val HEADER_SALESFORCE_CONTACT_ID = "x-salesforce-contact-id"

  def extractContactFromHeaders(headers: List[(String, String)]): Either[String, Contact] =
    headers.collectFirst {
      case (HEADER_SALESFORCE_CONTACT_ID, sfContactId) => Right(sfContactId)
      case (HEADER_IDENTITY_ID, identityId) => Left(identityId)
    }.toRight(s"either '$HEADER_IDENTITY_ID' header OR '$HEADER_SALESFORCE_CONTACT_ID' (one is required)")
}
