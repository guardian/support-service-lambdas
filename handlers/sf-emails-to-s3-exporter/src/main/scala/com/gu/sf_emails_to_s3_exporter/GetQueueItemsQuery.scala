package com.gu.sf_emails_to_s3_exporter

object GetQueueItemsQuery {
  val query: String = {
    """
       |SELECT
       | Id,
       | Record_Id__c
       |FROM
       | Async_Process_Record__c
       |WHERE
       | Object_Name__c = 'EmailMessage' AND
       | Description__c = 'Ready for export to S3'
       |ORDER BY
       | Createddate
       |LIMIT
       | 2000
  """.stripMargin
  }
}
