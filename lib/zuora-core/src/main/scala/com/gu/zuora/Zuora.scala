package com.gu.zuora

import com.gu.zuora.subscription._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import sttp.client3._
import sttp.client3.circe._
import io.circe.syntax._

import scala.annotation.tailrec

case class ZuoraAccountMoveSubscriptionCommand(
  crmId: String,
  sfContactId__c: String,
  IdentityId__c: String
)

case class MoveSubscriptionAtZuoraAccountResponse(message: String)

object Zuora extends LazyLogging {

  /**
   * for legacy calls when Oauth is hardcoded to holidayStopProcessor
   * and read from S3 file where holidayStopProcessor is a field in json config
   * *
   */
  def accessTokenGetResponse(
    config: HolidayStopProcessorZuoraConfig,
    backend: SttpBackend[Identity, Any]
  ): ZuoraApiResponse[AccessToken] = {
    val genericConfig = ZuoraRestOauthConfig(
      baseUrl = config.baseUrl,
      oauth = config.holidayStopProcessor.oauth
    )
    accessTokenGetResponseV2(genericConfig, backend)
  }

  def accessTokenGetResponseV2(
    config: ZuoraRestOauthConfig,
    backend: SttpBackend[Identity, Any]
  ): ZuoraApiResponse[AccessToken] = {
    basicRequest.post(uri"${config.baseUrl.stripSuffix("/v1")}/oauth/token")
      .body(
        "grant_type" -> "client_credentials",
        "client_id" -> s"${config.oauth.clientId}",
        "client_secret" -> s"${config.oauth.clientSecret}"
      )
      .response(asJson[AccessToken])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.getMessage)))
      .send(backend)
      .body
  }

  def subscriptionGetResponse(config: ZuoraConfig, accessToken: AccessToken, backend: SttpBackend[Identity, Any])(subscriptionName: SubscriptionName): ZuoraApiResponse[Subscription] = {
    val response = basicRequest.get(uri"${config.baseUrl}/subscriptions/${subscriptionName.value}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[Subscription])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.getMessage)))
      .send(backend)

    logger.info(s"subscriptionGetResponse for sub ${subscriptionName.value} is ${response.body.asJson}")
    response.body
  }

  def subscriptionUpdateResponse(config: ZuoraConfig, accessToken: AccessToken, backend: SttpBackend[Identity, Any])(subscription: Subscription, update: SubscriptionUpdate): ZuoraApiResponse[Unit] = {
    logger.info(s"request body for subscriptionUpdateResponse is ${update.toString}")

    val errMsg = (reason: String) => s"Failed to update subscription '${subscription.subscriptionNumber}' with $update. Reason: $reason"
    val response = basicRequest.put(uri"${config.baseUrl}/subscriptions/${subscription.subscriptionNumber}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(update)
      .response(asJson[ZuoraStatusResponse])
      .mapResponse {
        case Left(e) => Left(ZuoraApiFailure(errMsg(e.getMessage)))
        case Right(status) =>
          import ZuoraLockingContention._
          if (status.success) Right(())
          else if (isLockingContentionError(status)) Left(ZuoraApiFailure(LockingContentionCode.toString))
          else Left(ZuoraApiFailure(errMsg(status.reasons.map(_.mkString).getOrElse(""))))
      }
      .send(backend)
    logger.info(s"subscriptionUpdateResponse for sub ${subscription.subscriptionNumber} is ${response.body.asJson}")

      response.body.left.map(failure => ZuoraApiFailure(errMsg(failure.reason)))
  }

  def accountGetResponse(
    config: ZuoraConfig,
    accessToken: AccessToken,
    backend: SttpBackend[Identity, Any]
  )(
    accountNumber: String
  ): ZuoraApiResponse[ZuoraAccount] = {
    basicRequest.get(uri"${config.baseUrl}/accounts/$accountNumber")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[ZuoraAccount])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.getMessage)))
      .send(backend)
      .body
  }

  def updateAccountByMovingSubscription(
    config: ZuoraConfig,
    accessToken: AccessToken,
    backend: SttpBackend[Identity, Any]
  )(
    subscription: Subscription,
    updateCommandData: ZuoraAccountMoveSubscriptionCommand
  ): ZuoraApiResponse[MoveSubscriptionAtZuoraAccountResponse] = {
    val errMsg = (reason: String) => s"Failed to update subscription '${subscription.subscriptionNumber}' " +
      s"with $updateCommandData. Reason: $reason"
    basicRequest.put(uri"${config.baseUrl}/accounts/${subscription.accountNumber}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(updateCommandData)
      .response(asJson[ZuoraStatusResponse])
      .mapResponse {
        case Left(e) => Left(ZuoraApiFailure(errMsg(e.getMessage)))
        case Right(status) =>
          if (status.success) {
            Right(MoveSubscriptionAtZuoraAccountResponse("SUCCESS"))
          } else Left(ZuoraApiFailure(errMsg(status.reasons.map(_.mkString).getOrElse(""))))
      }
      .send(backend)
      .body

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
