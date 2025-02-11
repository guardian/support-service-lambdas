package com.gu.cas

import com.gu.cas.util.{BitReader, BitWriter, ByteArrayToAlphaStringEncoder}
import org.apache.commons.io.IOUtils
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{Days, LocalDate, Weeks}

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object TokenPayload {
  val epoch = ISODateTimeFormat.dateTimeNoMillis.parseDateTime("2012-09-20T00:00:00Z")

  val windowWrapSize = 2048

  def apply(today: LocalDate)(period: Weeks, subscriptionCode: SubscriptionCode): TokenPayload = {
    val creationDateOffset = Days.days(Days.daysBetween(epoch.toLocalDate, today).getDays % windowWrapSize)
    TokenPayload(creationDateOffset, period, subscriptionCode)
  }
}

case class TokenPayload(creationDateOffset: Days, period: Weeks, subscriptionCode: SubscriptionCode) {

  import TokenPayload.windowWrapSize

  def expiryDate(today: LocalDate): LocalDate = {
    val daysSinceOriginalEpoch = Days.daysBetween(TokenPayload.epoch.toLocalDate, today).getDays
    val codeStartIndexInWindow = creationDateOffset.getDays
    val completeErasSinceFirstPossibleStart = (daysSinceOriginalEpoch - codeStartIndexInWindow) / windowWrapSize
    val daysOfWrapAroundsNeeded = windowWrapSize * completeErasSinceFirstPossibleStart
    val mostOptimisticExpiryDaysSinceEpoch =
      Days.days(codeStartIndexInWindow + period.toStandardDays.getDays + daysOfWrapAroundsNeeded)

    TokenPayload.epoch.toLocalDate.plus(mostOptimisticExpiryDaysSinceEpoch).plusDays(1)
  }

}

object SubscriptionCode {
  val all = List(SevenDay, Guardian)
}
sealed trait SubscriptionCode
case object SevenDay extends SubscriptionCode
case object Guardian extends SubscriptionCode

sealed abstract class PayloadResult
case class Valid(payload: TokenPayload) extends PayloadResult
case class Invalid(payload: Option[TokenPayload]) extends PayloadResult

case class PrefixedTokens(secretKey: String, emergencySubscriberAuthPrefix: String = "G99") {
  val rawEncoder = RawTokenEncoder(secretKey)

  def encode(tokenPayload: TokenPayload): String = {
    emergencySubscriberAuthPrefix + rawEncoder.encode(tokenPayload)
  }

  def decode(prefixedToken: String): PayloadResult = {
    rawEncoder.decode(prefixedToken.substring(emergencySubscriberAuthPrefix.length))
  }
}

case class RawTokenEncoder(secretKey: String) {

  val keySpec = new SecretKeySpec(secretKey.getBytes(), "HmacSHA1")

  def encode(tokenPayload: TokenPayload): String = {
    val subscriptionCodeNumber = SubscriptionCode.all.indexOf(tokenPayload.subscriptionCode)

    val bw = new BitWriter()
    bw.add(tokenPayload.creationDateOffset.getDays, 11) // 11 bits gives 2048 days - over 5 years
    bw.add(tokenPayload.period.getWeeks, 6) // 6 bits gives 64 weeks
    bw.add(subscriptionCodeNumber, 3) // 3 bits gives 8 possible subscription types
    bw.add(
      scala.util.Random.nextInt(4096),
      12,
    ) // 12 bits gives 4096 random vals - won't have more than 60 or so new codes a day

    val payloadBytes = bw.v.toByteArray

    val stream = new ByteArrayOutputStream()
    stream.write(macFor(payloadBytes))
    stream.write(payloadBytes)
    stream.close()

    ByteArrayToAlphaStringEncoder.byteArrayToAlphaString(stream.toByteArray)
  }

  def decode(token: String): PayloadResult = {
    val messageBytes = ByteArrayToAlphaStringEncoder.alphaStringToByteArray(token.toUpperCase)
    val s = new ByteArrayInputStream(messageBytes)
    val mac: Byte = s.read().toByte
    val payloadBytes = IOUtils.toByteArray(s)
    s.close()

    val expectedMac = macFor(payloadBytes)

    val br = new BitReader(BigInt(payloadBytes))

    val creationDateOffset = Days.days(br.read(11))
    val period = Weeks.weeks(br.read(6))
    val subscriptionCode = SubscriptionCode.all(br.read(3))

    val payload = TokenPayload(creationDateOffset, period, subscriptionCode)
    if (mac == expectedMac) {
      Valid(payload)
    } else {
      Invalid(Option(payload))
    }
  }

  def macFor(payloadBytes: Array[Byte]): Byte = {
    val m = Mac.getInstance("HmacSHA1")
    m.init(keySpec)
    m.update(payloadBytes)
    m.doFinal()(0) // only use the first 1 bytes of the mac - 256 variations is enough for us
  }
}
