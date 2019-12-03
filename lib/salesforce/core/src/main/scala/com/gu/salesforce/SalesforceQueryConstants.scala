package com.gu.salesforce

import java.time.LocalDate

object SalesforceQueryConstants {

  def contactToWhereClausePart(contact: Contact) = contact match {
    case IdentityId(identityId) => s"Buyer__r.IdentityID__c = '${escapeString(identityId)}'"
    case SalesforceContactId(sfContactId) => s"Buyer__r.Id = '${escapeString(sfContactId)}'"
  }

  def deliveryRecordsQuery(
    contact: Contact,
    subscriptionNumber: String,
    optionalStartDate: Option[LocalDate],
    optionalEndDate: Option[LocalDate]
  ) =
    s"""SELECT (
    |    SELECT Delivery_Date__c, Delivery_Address__c, Delivery_Instructions__c, Has_Holiday_Stop__c
    |    FROM Delivery_Records__r
    |    ${deliveryDateFilter(optionalStartDate, optionalEndDate)}
    |)
    |FROM SF_Subscription__c WHERE Name = '${escapeString(subscriptionNumber)}'
    |                         AND ${contactToWhereClausePart(contact)}""".stripMargin

  def deliveryDateFilter(optionalStartDate: Option[LocalDate], optionalEndDate: Option[LocalDate]) = {
    List(
      optionalStartDate.map(startDate => s"Delivery_Date__c >= $startDate "),
      optionalEndDate.map(endDate => s"Delivery_Date__c <= $endDate")
    ).flatten match {
        case Nil => ""
        case nonEmpty => s" WHERE ${nonEmpty.mkString(" AND ")}"
      }
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
