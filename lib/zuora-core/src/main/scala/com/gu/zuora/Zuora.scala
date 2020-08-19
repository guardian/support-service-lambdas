package com.gu.zuora

import com.gu.zuora.subscription._
import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import scala.annotation.tailrec

case class ZuoraAccountMoveSubscriptionCommand(
  crmId: String,
  sfContactId__c: String,
  IdentityId__c: String
)

case class MoveSubscriptionAtZuoraAccountResponse(message: String)

object Zuora {

  /**
   * for legacy calls when Oauth is hardcoded to holidayStopProcessor
   * and read from S3 file where holidayStopProcessor is a field in json config
   * *
   */
  def accessTokenGetResponse(
    config: HolidayStopProcessorZuoraConfig,
    backend: SttpBackend[Id, Nothing]
  ): ZuoraApiResponse[AccessToken] = {
    val genericConfig = ZuoraRestOauthConfig(
      baseUrl = config.baseUrl,
      oauth = config.holidayStopProcessor.oauth
    )
    accessTokenGetResponseV2(genericConfig, backend)
  }

  def accessTokenGetResponseV2(
    config: ZuoraRestOauthConfig,
    backend: SttpBackend[Id, Nothing]
  ): ZuoraApiResponse[AccessToken] = {
    implicit val b: SttpBackend[Id, Nothing] = backend
    sttp.post(uri"${config.baseUrl.stripSuffix("/v1")}/oauth/token")
      .body(
        "grant_type" -> "client_credentials",
        "client_id" -> s"${config.oauth.clientId}",
        "client_secret" -> s"${config.oauth.clientSecret}"
      )
      .response(asJson[AccessToken])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.message)))
      .send()
      .body.left.map(e => ZuoraApiFailure(e))
      .joinRight
  }

  def subscriptionGetResponse(config: ZuoraConfig, accessToken: AccessToken, backend: SttpBackend[Id, Nothing])(subscriptionName: SubscriptionName): ZuoraApiResponse[Subscription] = {
    implicit val b: SttpBackend[Id, Nothing] = backend
    sttp.get(uri"${config.baseUrl}/subscriptions/${subscriptionName.value}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[Subscription])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.message)))
      .send()
      .body.left.map(ZuoraApiFailure)
      .joinRight
  }

  def subscriptionUpdateResponse(config: ZuoraConfig, accessToken: AccessToken, backend: SttpBackend[Id, Nothing])(subscription: Subscription, update: SubscriptionUpdate): ZuoraApiResponse[Unit] = {
    implicit val b: SttpBackend[Id, Nothing] = backend
    val errMsg = (reason: String) => s"Failed to update subscription '${subscription.subscriptionNumber}' with $update. Reason: $reason"
    sttp.put(uri"${config.baseUrl}/subscriptions/${subscription.subscriptionNumber}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(update)
      .response(asJson[ZuoraStatusResponse])
      .mapResponse {
        case Left(e) => Left(ZuoraApiFailure(errMsg(e.message)))
        case Right(status) =>
          import ZuoraLockingContention._
          if (status.success) Right(())
          else if (isLockingContentionError(status)) Left(ZuoraApiFailure(LockingContentionCode.toString))
          else Left(ZuoraApiFailure(errMsg(status.reasons.map(_.mkString).getOrElse(""))))
      }
      .send()
      .body.left.map(reason => ZuoraApiFailure(errMsg(reason)))
      .joinRight
  }

  def accountGetResponse(
    config: ZuoraConfig,
    accessToken: AccessToken,
    backend: SttpBackend[Id, Nothing]
  )(
    accountNumber: String
  ): ZuoraApiResponse[ZuoraAccount] = {
    implicit val b = backend
    sttp.get(uri"${config.baseUrl}/accounts/$accountNumber")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[ZuoraAccount])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.message)))
      .send()
      .body.left.map(ZuoraApiFailure)
      .joinRight
  }

  def updateAccountByMovingSubscription(
    config: ZuoraConfig,
    accessToken: AccessToken,
    backend: SttpBackend[Id, Nothing]
  )(
    subscription: Subscription,
    updateCommandData: ZuoraAccountMoveSubscriptionCommand
  ): ZuoraApiResponse[MoveSubscriptionAtZuoraAccountResponse] = {
    implicit val b: SttpBackend[Id, Nothing] = backend
    val errMsg = (reason: String) => s"Failed to update subscription '${subscription.subscriptionNumber}' " +
      s"with $updateCommandData. Reason: $reason"
    sttp.put(uri"${config.baseUrl}/accounts/${subscription.accountNumber}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(updateCommandData)
      .response(asJson[ZuoraStatusResponse])
      .mapResponse {
        case Left(e) => Left(ZuoraApiFailure(errMsg(e.message)))
        case Right(status) =>
          if (status.success) {
            Right(MoveSubscriptionAtZuoraAccountResponse("SUCCESS"))
          } else Left(ZuoraApiFailure(errMsg(status.reasons.map(_.mkString).getOrElse(""))))
      }
      .send()
      .body
      .left.map(ZuoraApiFailure)
      .joinRight
  }
}

object ZuoraLockingContention extends LazyLogging {
  /**
   * Failed to update subscription object due to locking contention
   * https://community.zuora.com/t5/Zuora-CPQ/Large-Renewal-Quote-preview-failed-with-optimistic-locking-error/td-p/28721
   *
   *   535000 - resource code of update operation on subscription object
   *   50     - Locking contention
   */
  val LockingContentionCode: Long = 53500050L // StaleObjectStateException

  // this retry is only intended for 535000, namely subscription update object
  @tailrec def retryLockingContention(
    n: Int,
    subName: String /* FIXME: temporary to follow up if retry was safe */
  )(call: => ZuoraApiResponse[Unit]): ZuoraApiResponse[Unit] = {
    val LockingContentionCodeStr = LockingContentionCode.toString
    call match {
      case e @ Left(ZuoraApiFailure(LockingContentionCodeStr)) if (n <= 1) => e

      case Left(ZuoraApiFailure(LockingContentionCodeStr)) =>
        logger.warn(s"Retrying $subName due to locking contention $LockingContentionCode... Follow up if all is OK.")
        retryLockingContention(n - 1, subName)(call)

      case v => v
    }
  }

  def isLockingContentionError(status: ZuoraStatusResponse): Boolean = {
    status.reasons match {
      case Some(reasons) => reasons.map(_.code).contains(LockingContentionCode)
      case _ => false
    }
  }
}
