package com.gu.salesforce

object SalesforceQueryConstants {

  def contactToWhereClausePart(contact: Contact) = contact match {
    case IdentityId(identityId) => s"Buyer__r.IdentityID__c = '${escapeString(identityId)}'"
    case SalesforceContactId(sfContactId) => s"Buyer__r.Id = '${escapeString(sfContactId)}'"
  }

  def escapeString(string: String) =
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

