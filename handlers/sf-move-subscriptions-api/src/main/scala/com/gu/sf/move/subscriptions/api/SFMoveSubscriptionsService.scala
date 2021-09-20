package com.gu.sf.move.subscriptions.api

import cats.Monad
import cats.data.EitherT
import cats.syntax.all._
import com.gu.zuora.Zuora.{accessTokenGetResponseV2, subscriptionGetResponse, updateAccountByMovingSubscription}
import com.gu.zuora._
import com.gu.zuora.subscription._
import sttp.client3._
import com.typesafe.scalalogging.LazyLogging

final case class MoveSubscriptionServiceSuccess(message: String)

sealed trait MoveSubscriptionServiceError {
  def message: String
}

case class FetchZuoraAccessTokenError(message: String) extends MoveSubscriptionServiceError

case class FetchZuoraSubscriptionError(message: String) extends MoveSubscriptionServiceError

case class UpdateZuoraAccountError(message: String) extends MoveSubscriptionServiceError

class SFMoveSubscriptionsService[F[_]: Monad](
  apiCfg: MoveSubscriptionApiConfig,
  backend: SttpBackend[Identity, Any]
) extends LazyLogging {

  private val ZuoraConfig = ZuoraRestOauthConfig(
    baseUrl = apiCfg.zuoraBaseUrl,
    oauth = Oauth(
      clientId = apiCfg.zuoraClientId,
      clientSecret = apiCfg.zuoraSecret
    )
  )

  def moveSubscription(moveSubscriptionData: MoveSubscriptionReqBody): EitherT[F, MoveSubscriptionServiceError, MoveSubscriptionServiceSuccess] = {
    moveSubscriptionInternal(moveSubscriptionData, updateAccountByMovingSubscriptionRun)
  }

  def moveSubscriptionDryRun(moveSubscriptionData: MoveSubscriptionReqBody): EitherT[F, MoveSubscriptionServiceError, MoveSubscriptionServiceSuccess] = {
    moveSubscriptionInternal(moveSubscriptionData, updateAccountByMovingSubscriptionDryRun)
  }

  private def moveSubscriptionInternal(
    moveSubscriptionData: MoveSubscriptionReqBody,
    updateAccountByMovingSubscription: (AccessToken, SttpBackend[Identity, Any]) => (Subscription, ZuoraAccountMoveSubscriptionCommand) => ZuoraApiResponse[MoveSubscriptionAtZuoraAccountResponse]
  ): EitherT[F, MoveSubscriptionServiceError, MoveSubscriptionServiceSuccess] = {
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
      updateRes <- updateAccountByMovingSubscription(accessToken, backend)(subscription, moveSubCommand)
        .leftMap(err => UpdateZuoraAccountError(err.reason))
    } yield updateRes)
      .toEitherT[F]
      .map(res => MoveSubscriptionServiceSuccess(res.toString))
  }

  private def updateAccountByMovingSubscriptionDryRun(accessToken: AccessToken, backend: SttpBackend[Identity, Any])(
    subscription: Subscription,
    moveSubCommand: ZuoraAccountMoveSubscriptionCommand
  ): ZuoraApiResponse[MoveSubscriptionAtZuoraAccountResponse] = {
    logger.info(s"DRY_RUN, successfully created moveSubscriptionCommand: $moveSubCommand")
    Right(MoveSubscriptionAtZuoraAccountResponse("SUCCESS_DRY_RUN"))
  }

  private def updateAccountByMovingSubscriptionRun(accessToken: AccessToken, backend: SttpBackend[Identity, Any])(
    subscription: Subscription,
    moveSubCommand: ZuoraAccountMoveSubscriptionCommand
  ): ZuoraApiResponse[MoveSubscriptionAtZuoraAccountResponse] = {
    updateAccountByMovingSubscription(ZuoraConfig, accessToken, backend)(subscription, moveSubCommand)
  }

}

object SFMoveSubscriptionsService {
  def apply[F[_]: Monad](apiCfg: MoveSubscriptionApiConfig, backend: SttpBackend[Identity, Any]): SFMoveSubscriptionsService[F] =
    new SFMoveSubscriptionsService(apiCfg, backend)
}
