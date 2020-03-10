package com.gu.sf.move.subscriptions.api

import cats.Monad
import cats.data.EitherT
import cats.implicits._
import com.gu.zuora.Zuora.ZuoraAccountMoveSubscriptionCommand
import com.gu.zuora._
import com.gu.zuora.subscription._
import com.softwaremill.sttp._
import com.typesafe.scalalogging.LazyLogging

class SFMoveSubscriptionsService[F[_]: Monad](apiCfg: MoveSubscriptionApiConfig, backend: SttpBackend[Id, Nothing]) extends LazyLogging {

  private val zuoraConfig = ZuoraRestOauthConfig(
    baseUrl = apiCfg.zuoraBaseUrl,
    oauth = Oauth(
      clientId = apiCfg.zuoraClientId,
      clientSecret = apiCfg.zuoraSecret
    )
  )

  def moveSubscription(moveSubscriptionData: MoveSubscriptionData): EitherT[F, MoveSubscriptionServiceError, MoveSubscriptionServiceSuccess] = {
    import moveSubscriptionData._
    logger.info(s"attempt to move $zuoraSubscriptionId subscription to $sfAccountId , $sfFullContactId SalesForce Contact")

    val moveSubCommand = ZuoraAccountMoveSubscriptionCommand(
      crmId = sfAccountId,
      sfContactId__c = sfFullContactId
    )
    import Zuora.{accessTokenGetResponseV2, subscriptionGetResponse, updateAccountByMovingSubscription}
    val updateResponse = for {
      token <- accessTokenGetResponseV2(zuoraConfig, backend)
      subscription <- subscriptionGetResponse(zuoraConfig, token, backend)(SubscriptionName(zuoraSubscriptionId))
      updateRes <- updateAccountByMovingSubscription(zuoraConfig, token, backend)(subscription, moveSubCommand)
    } yield updateRes

    updateResponse.toEitherT[F]
      .leftMap(err => MoveSubscriptionServiceError(err.toString))
      .map(status => MoveSubscriptionServiceSuccess(status))
  }
}

object SFMoveSubscriptionsService {
  def apply[F[_]: Monad](apiCfg: MoveSubscriptionApiConfig, backend: SttpBackend[Id, Nothing]): SFMoveSubscriptionsService[F] =
    new SFMoveSubscriptionsService(apiCfg, backend)
}

