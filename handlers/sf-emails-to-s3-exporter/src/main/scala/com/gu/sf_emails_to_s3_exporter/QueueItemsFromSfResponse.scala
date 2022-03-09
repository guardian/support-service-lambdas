package com.gu.sf_emails_to_s3_exporter

object QueueItemsFromSfResponse {
  case class Response(
    done: Boolean,
    records: Seq[Records],
    nextRecordsUrl: Option[String] = None
  )

  case class Records(
    Id: String,
    Record_Id__c: String
  )
}
