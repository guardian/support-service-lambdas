package com.gu.sf.move.subscriptions.api

import cats.Monad
import cats.data.EitherT
import cats.implicits._
import com.gu.zuora.Zuora.{accessTokenGetResponseV2, subscriptionGetResponse, updateAccountByMovingSubscription}
import com.gu.zuora._
import com.gu.zuora.subscription._
import com.softwaremill.sttp._

final case class MoveSubscriptionServiceSuccess(message: String)

sealed trait MoveSubscriptionServiceError {
  def message: String
}

case class FetchZuoraAccessTokenError(message: String) extends MoveSubscriptionServiceError

case class FetchZuoraSubscriptionError(message: String) extends MoveSubscriptionServiceError

case class UpdateZuoraAccountError(message: String) extends MoveSubscriptionServiceError

class SFMoveSubscriptionsService[F[_]: Monad](
  apiCfg: MoveSubscriptionApiConfig,
  backend: SttpBackend[Id, Nothing]
) {

  private val ZuoraConfig = ZuoraRestOauthConfig(
    baseUrl = apiCfg.zuoraBaseUrl,
    oauth = Oauth(
      clientId = apiCfg.zuoraClientId,
      clientSecret = apiCfg.zuoraSecret
    )
  )

  def moveSubscription(moveSubscriptionData: MoveSubscriptionReqBody): EitherT[F, MoveSubscriptionServiceError, MoveSubscriptionServiceSuccess] = {
    import moveSubscriptionData._

    val moveSubCommand = ZuoraAccountMoveSubscriptionCommand(
      crmId = sfAccountId,
      sfContactId__c = sfFullContactId,
      IdentityId__c = identityId
    )

    (for {
      accessToken <- accessTokenGetResponseV2(ZuoraConfig, backend)
        .leftMap[MoveSubscriptionServiceError](err => FetchZuoraAccessTokenError(err.reason))
      subscription <- subscriptionGetResponse(ZuoraConfig, accessToken, backend)(SubscriptionName(zuoraSubscriptionId))
        .leftMap(err => FetchZuoraSubscriptionError(err.reason))
      updateRes <- updateAccountByMovingSubscription(ZuoraConfig, accessToken, backend)(subscription, moveSubCommand)
        .leftMap(err => UpdateZuoraAccountError(err.reason))
    } yield updateRes)
      .toEitherT[F]
      .map(res => MoveSubscriptionServiceSuccess(res.toString))
  }
}

object SFMoveSubscriptionsService {
  def apply[F[_]: Monad](apiCfg: MoveSubscriptionApiConfig, backend: SttpBackend[Id, Nothing]): SFMoveSubscriptionsService[F] =
    new SFMoveSubscriptionsService(apiCfg, backend)
}
