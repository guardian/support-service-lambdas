package com.gu.sf_emails_to_s3_exporter

object GetEmailsQuery {
  val query: String = {
    s"""
       |SELECT
       | Id,
       | ParentId,
       | BccAddress,
       | CcAddress,
       | FirstOpenedDate,
       | ValidatedFromAddress,
       | FromAddress,
       | FromName,
       | Headers,
       | HtmlBody,
       | IsExternallyVisible,
       | Incoming,
       | LastOpenedDate,
       | MessageDate,
       | Parent.Id,
       | Parent.Casenumber,
       | Status,
       | Subject,
       | TextBody,
       | ToAddress,
       | Composite_Key__c,
       | Resolve_on_Send__c
       |FROM
       | emailmessage
       |WHERE
       | export_Status__c in ('Ready for export to s3')
       |ORDER BY
       | ParentId
       |LIMIT
       | 1000
    """.stripMargin
  }
}
