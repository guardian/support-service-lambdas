package com.gu.sf_emails_to_s3_exporter

import java.time.LocalDateTime

object ConfirmationWriteBackToSF {
  case class EmailMessageToUpdate(
    id: String,
    Most_Recent_Export__c: LocalDateTime = LocalDateTime.now(), //todo for some reason this is giving dodgy datetimes
    attributes: Attributes = Attributes(`type` = "EmailMessage")
  )

  case class EmailMessagesToUpdate(
    allOrNone: Boolean,
    records: Seq[EmailMessageToUpdate]
  )

  case class Attributes(`type`: String)
}
