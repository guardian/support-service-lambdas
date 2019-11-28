package com.gu.salesforce

object SalesforceQueryConstants {
  type BuyerIdentityId = String
  type BuyerContactId = String
  type Contact = Either[BuyerIdentityId, BuyerContactId]

  def contactToWhereClausePart(contact: Contact) = contact match {
    case Left(identityId) => s"Buyer__r.IdentityID__c = '${escapeString(identityId)}'"
    case Right(sfContactId) => s"Buyer__r.Id = '${escapeString(sfContactId)}'"
  }

  def deliveryRecordsQuery(contact: Contact, subscriptionNumber: String) =
    s"SELECT (" +
    s"   SELECT Delivery_Date__c, Delivery_Address__c, Delivery_Instructions__c, Has_Holiday_Stop__c" +
    s"   FROM Delivery_Records__r ) " +
    s"FROM SF_Subscription__c WHERE Name = '${escapeString(subscriptionNumber)}' " +
    s"                          AND ${contactToWhereClausePart(contact)}"

  def escapeString(string: String)=
    string
      .replace("\\", "\\\\")
      .replace("\n", "\\n")
      .replace("\r", "\\r")
      .replace("\t", "\\t")
      .replace("\b", "\\b")
      .replace("\f", "\\F")
      .replace("\"", "\\\"")
      .replace("\'", "\\'")
}
