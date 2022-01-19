package com.gu.sf_emails_to_s3_exporter

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

object ConfirmationWriteBackToSF {
  case class EmailMessageToUpdate(
    id: String,
    Most_Recent_Export__c: String = getCurrentDateTimeForWriteback(),
    attributes: Attributes = Attributes(`type` = "EmailMessage")
  )

  case class EmailMessagesToUpdate(
    allOrNone: Boolean,
    records: Seq[EmailMessageToUpdate]
  )

  case class Attributes(`type`: String)

  def getCurrentDateTimeForWriteback(): String = {
    DateTimeFormatter.ofPattern("YYYY-MM-DD'T'HH:mm:SS'Z'").format(LocalDateTime.now)
  }
}
