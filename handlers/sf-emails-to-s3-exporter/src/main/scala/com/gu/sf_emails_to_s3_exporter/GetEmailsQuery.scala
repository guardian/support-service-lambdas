package com.gu.sf_emails_to_s3_exporter

object GetEmailsQuery {
  val query: String = {
    s"""
       |SELECT
       | Id,
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
       | ToAddress
       |FROM
       | emailmessage
       |WHERE
       | Export_Status__c in ('Ready for export to s3')
       |ORDER BY
       | ParentId
       |LIMIT
       | 1
    """.stripMargin
  }
}
