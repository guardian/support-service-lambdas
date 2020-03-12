package com.gu.sf.move.subscriptions.api

import cats.Monad
import cats.data.EitherT
import cats.implicits._
import com.gu.zuora._
import com.gu.zuora.subscription._
import com.softwaremill.sttp._
import com.typesafe.scalalogging.LazyLogging

final case class MoveSubscriptionServiceSuccess(message: String)

final case class MoveSubscriptionServiceError(message: String)

class SFMoveSubscriptionsService[F[_]: Monad](
  apiCfg: MoveSubscriptionApiConfig,
  backend: SttpBackend[Id, Nothing]
) extends LazyLogging {

  private val ZuoraConfig = ZuoraRestOauthConfig(
    baseUrl = apiCfg.zuoraBaseUrl,
    oauth = Oauth(
      clientId = apiCfg.zuoraClientId,
      clientSecret = apiCfg.zuoraSecret
    )
  )

  def moveSubscription(moveSubscriptionData: MoveSubscriptionReqBody): EitherT[F, MoveSubscriptionServiceError, MoveSubscriptionServiceSuccess] = {
    import moveSubscriptionData._
    logger.info(s"attempt to move $zuoraSubscriptionId subscription to " +
      s"(Account Id=$sfAccountId ,Full contact Id=$sfFullContactId) SalesForce Contact")

    val moveSubCommand = ZuoraAccountMoveSubscriptionCommand(
      crmId = sfAccountId,
      sfContactId__c = sfFullContactId
    )
    import SFMoveSubscriptionsService.{fetchZuoraAccessTokenErrorMsg, fetchZuoraSubErrorMsg, updateZuoraAccountErrorMsg}
    import Zuora.{accessTokenGetResponseV2, subscriptionGetResponse, updateAccountByMovingSubscription}

    (for {
      accessToken <- accessTokenGetResponseV2(ZuoraConfig, backend)
        .leftMap(err => fetchZuoraAccessTokenErrorMsg(err.reason))
      subscription <- subscriptionGetResponse(ZuoraConfig, accessToken, backend)(SubscriptionName(zuoraSubscriptionId))
        .leftMap(err => fetchZuoraSubErrorMsg(err.reason))
      updateRes <- updateAccountByMovingSubscription(ZuoraConfig, accessToken, backend)(subscription, moveSubCommand)
        .leftMap(err => updateZuoraAccountErrorMsg(err.reason))
    } yield updateRes)
      .toEitherT[F]
      .bimap(MoveSubscriptionServiceError, MoveSubscriptionServiceSuccess)
  }
}

object SFMoveSubscriptionsService {
  def apply[F[_]: Monad](apiCfg: MoveSubscriptionApiConfig, backend: SttpBackend[Id, Nothing]): SFMoveSubscriptionsService[F] =
    new SFMoveSubscriptionsService(apiCfg, backend)

  def fetchZuoraAccessTokenErrorMsg(reason: String): String = s"fetch ZUORA accessToken failure: $reason"

  def fetchZuoraSubErrorMsg(reason: String): String = s"fetch ZUORA subscription failure: $reason"

  def updateZuoraAccountErrorMsg(reason: String): String = s"update ZUORA account failure: $reason"
}
