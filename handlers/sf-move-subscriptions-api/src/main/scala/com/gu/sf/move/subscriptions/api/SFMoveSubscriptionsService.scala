package com.gu.sf.move.subscriptions.api

import cats.Monad
import cats.data.EitherT
import cats.implicits._
import com.gu.zuora.Zuora.ZuoraAccountMoveSubscriptionCommand
import com.gu.zuora._
import com.gu.zuora.subscription._
import com.softwaremill.sttp._
import com.typesafe.scalalogging.LazyLogging

class SFMoveSubscriptionsService[F[_]: Monad](apiCfg: MoveSubscriptionApiConfig) extends LazyLogging {

  private val zuoraSttpBackend = HttpURLConnectionBackend()

  // adapter TODO refactor later
  private val zuoraConfig = ZuoraConfig(
    baseUrl = apiCfg.zuoraBaseUrl,
    holidayStopProcessor = HolidayStopProcessor(
      Oauth(
        clientId = apiCfg.zuoraClientId,
        clientSecret = apiCfg.zuoraSecret
      )
    )
  )

  def moveSubscription(moveSubscriptionData: MoveSubscriptionData): EitherT[F, MoveSubscriptionServiceError, MoveSubscriptionServiceSuccess] = {
    import moveSubscriptionData._
    logger.info(s"attempt to move $zuoraSubscriptionId subscription to $sfAccountId , $sfFullContactId SalesForce Contact")

    val moveSubCommand = ZuoraAccountMoveSubscriptionCommand(
      crmId = sfAccountId,
      sfContactId__c = sfFullContactId
    )
    import Zuora.{accessTokenGetResponse, subscriptionGetResponse, updateAccountByMovingSubscription}
    val updateResponse = for {
      token <- accessTokenGetResponse(zuoraConfig, zuoraSttpBackend)
      subscription <- subscriptionGetResponse(zuoraConfig, token, zuoraSttpBackend)(SubscriptionName(zuoraSubscriptionId))
      updateRes <- updateAccountByMovingSubscription(zuoraConfig, token, zuoraSttpBackend)(subscription, moveSubCommand)
    } yield updateRes

    updateResponse.toEitherT[F]
      .leftMap(err => MoveSubscriptionServiceError(err.toString))
      .map(status => MoveSubscriptionServiceSuccess(status))
  }
}

object SFMoveSubscriptionsService {
  def apply[F[_]: Monad](apiCfg: MoveSubscriptionApiConfig): SFMoveSubscriptionsService[F] = new SFMoveSubscriptionsService(apiCfg)
}


