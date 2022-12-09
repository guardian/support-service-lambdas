package com.gu.sf_emails_to_s3_exporter

object GetEmailsQuery {
  def apply(emailIds: Seq[String]): String = {

    val idsForQuery = emailIds.map(id => s"'$id'").mkString(",")

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
         | Id in ($idsForQuery) AND
         | export_Status__c = 'Ready for export to s3'
         |ORDER BY
         | Createddate
         |LIMIT
         | 200
    """.stripMargin
  }
}
