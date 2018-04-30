package com.gu.digitalSubscriptionExpiry.emergencyToken

import com.gu.cas.{Guardian, SevenDay, SubscriptionCode, TokenPayload}
import java.time.LocalDate
import org.joda.time.{LocalDate => JodaDate}

object TokenPayloadImplicits {

  implicit class TokenPayloadOps(payload: TokenPayload) {
    def jExpiryDate(today: LocalDate): LocalDate = {
      val jodaExpiryDate = payload.expiryDate(new JodaDate(today.getYear, today.getMonth.getValue, today.getDayOfMonth))
      LocalDate.of(jodaExpiryDate.getYear, jodaExpiryDate.getMonthOfYear, jodaExpiryDate.getDayOfMonth)
    }
  }

  implicit class SubscriptionCodeOps(subCode: SubscriptionCode) {
    def asString = subCode match {
      case SevenDay => "SevenDay"
      case Guardian => "Guardian"
    }
  }
}
