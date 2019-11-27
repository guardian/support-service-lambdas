package com.gu.salesforce

object SalesforceQueryConstants {
  type BuyerIdentityId = String
  type BuyerContactId = String
  type Contact = Either[BuyerIdentityId, BuyerContactId]

  def contactToWhereClausePart(contact: Contact) = contact match {
    case Left(identityId) => s"Buyer__r.IdentityID__c = '$identityId'"
    case Right(sfContactId) => s"Buyer__r.Id = '$sfContactId'"
  }
}
