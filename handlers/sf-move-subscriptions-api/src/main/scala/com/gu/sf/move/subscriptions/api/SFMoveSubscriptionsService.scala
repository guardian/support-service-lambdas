package com.gu.sf.move.subscriptions.api

import cats.Monad
import cats.data.EitherT
import cats.implicits._
import com.gu.zuora._
import com.gu.zuora.subscription._
import com.softwaremill.sttp._
import com.typesafe.scalalogging.LazyLogging

final case class MoveSubscriptionServiceSuccess(message: String)

final case class MoveSubscriptionServiceError(error: String)

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
    import Zuora.{accessTokenGetResponseV2, subscriptionGetResponse, updateAccountByMovingSubscription}
    val updateResponse = for {
      accessToken <- accessTokenGetResponseV2(ZuoraConfig, backend)
      subscription <- subscriptionGetResponse(ZuoraConfig, accessToken, backend)(SubscriptionName(zuoraSubscriptionId))
      updateRes <- updateAccountByMovingSubscription(ZuoraConfig, accessToken, backend)(subscription, moveSubCommand)
    } yield updateRes

    updateResponse.toEitherT[F].bimap(
      error => MoveSubscriptionServiceError(error.toString),
      status => MoveSubscriptionServiceSuccess(status)
    )
  }
}

object SFMoveSubscriptionsService {
  def apply[F[_]: Monad](apiCfg: MoveSubscriptionApiConfig, backend: SttpBackend[Id, Nothing]): SFMoveSubscriptionsService[F] =
    new SFMoveSubscriptionsService(apiCfg, backend)
}
