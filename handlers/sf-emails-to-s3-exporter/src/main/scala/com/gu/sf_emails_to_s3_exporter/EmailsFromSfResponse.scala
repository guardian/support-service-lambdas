package com.gu.sf_emails_to_s3_exporter

object EmailsFromSfResponse {
  case class Response(
    done: Boolean,
    records: Seq[Records],
    nextRecordsUrl: Option[String] = None
  )

  case class Records(
    Id: String,
    FromAddress: String,
    BccAddress: Option[String] = None,
    CcAddress: Option[String] = None,
    FirstOpenedDate: Option[String] = None,
    ValidatedFromAddress: Option[String] = None,
    FromName: Option[String] = None,
    Headers: Option[String] = None,
    HtmlBody: Option[String] = None,
    IsExternallyVisible: Boolean,
    Incoming: Boolean,
    LastOpenedDate: Option[String] = None,
    MessageDate: String,
    Parent: Parent,
    Status: String,
    Subject: Option[String] = None,
    TextBody: Option[String] = None,
    ToAddress: String,
    Composite_Key__c:String,
    Resolve_on_Send__c:Boolean
  )

  case class Parent(
    CaseNumber: String,
    Id: String
  )
}
