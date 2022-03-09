package com.gu.sf_emails_to_s3_exporter

object QueueItemsFromSfResponse {
  case class Response(
     done: Boolean,
     records: Seq[QueueItem],
     nextRecordsUrl: Option[String] = None
  )

  case class QueueItem(
    Id: String,
    Record_Id__c: String
  )
}
