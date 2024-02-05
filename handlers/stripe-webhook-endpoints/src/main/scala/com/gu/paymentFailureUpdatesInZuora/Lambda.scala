package com.gu.paymentFailureUpdatesInZuora

import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent}
import com.typesafe.scalalogging.LazyLogging

import scala.jdk.CollectionConverters._
import com.stripe.net.Webhook

import scala.util.Try
import io.circe.syntax._
import io.circe.generic.auto._
import cats.effect.IO._
import cats.effect.IO
import cats.Id
import com.gu.util.config.ConfigLoader
import com.gu.AppIdentity
import cats.data.EitherT
import com.gu.zuora.Zuora.accessTokenGetResponseV2
import com.gu.zuora.ZuoraRestOauthConfig
import com.gu.zuora.Oauth
import sttp.client3.{HttpURLConnectionBackend, SttpBackend}
import sttp.client3._
import sttp.client3.circe._
import com.gu.zuora.AccessToken

object Lambda extends LazyLogging {
  def handler(event: APIGatewayProxyRequestEvent): APIGatewayProxyResponseEvent = {
    val identity = AppIdentity.whoAmI(defaultAppName = "sepa-payment-failure-updates")

    val program = loadConfig(identity).subflatMap(config =>
      for {
        payload <- getPayload(event, config.endpointSecret)
        _ <- processDisputeEvent(payload, config)
      } yield (),
    )


    val result = program.value.unsafeRunSync()

    val response = new APIGatewayProxyResponseEvent()

      result match {
        case Left(ConfigLoadingError(message)) =>
          logger.error(message)
          response.setStatusCode(500)
        case Left(error@(InvalidRequestError(_) | InvalidJsonError(_))) =>
          logger.error(error.message)
          response.setStatusCode(400)
        case Left(error@(MissingPaymentNumberError(_) | ZuoraApiError(_))) =>
          // TODO: alarm
          logger.error(error.message)
          response.setStatusCode(200)
        case Right(_) =>
          response.setStatusCode(200)
      }
      response
    }

  def loadConfig(identity: AppIdentity): EitherT[IO, Error, Config] =
    ConfigLoader.loadConfig[IO, Config](identity).leftMap(e => ConfigLoadingError(e.message))


  def getPayload(event: APIGatewayProxyRequestEvent, endpointSecret: String): Either[Future,Error, String] ={
    logger.info("Attempting to verify event payload")
    EitherT.fromEither(for {
      payload <- Option(event.getBody()).toRight(InvalidRequestError("Missing body"))
      _ = SafeLogger.info(s"payload is ${payload.replace("\n", "")}")
      sigHeader <- event.getHeaders.asScala.get("Stripe-Signature").toRight(InvalidRequestError("Missing sig header"))
      _ <- Try(Webhook.Signature.verifyHeader(payload, sigHeader, endpointSecret, 300)).toEither.left.map(e =>
        InvalidRequestError(e.getMessage())
          _ = logger.info(s"payload successfully verified")
      )
    } yield payload)
}

  def processDisputeEvent(payload: String, config: Config): Either[Error, Unit] =
    for {
      dispute <- parseDisputes(payload)
      _ <- processDispute(dispute, config)
    } yield ()



  def parseDisputes(payload: String): Either[Error, Dispute] =
    for {
      event <- DisputeEvent.fromJson(payload)
      dispute <- Dispute.fromEvent(event)
    } yield dispute

  def processDispute(dispute: Dispute, config: Config): Either[Error, Unit] =
    dispute match {
      case SepaDispute(paymentNumber, disputeObject) =>
        updateDisputedSepaPaymentInZuora(paymentNumber, disputeObject, config)
      case OtherDispute() =>
        logger.info(s"Ignoring non-SEPA event")
        Right(())
    }

  def updateDisputedSepaPaymentInZuora(
                          paymentNumber: String,
                          disputeObject: DisputeObject,
                          config: Config,
                        ): Either[Error, Unit] = {
    logger.info(s"Zuora payment number: $paymentNumber")

    implicit val backend: SttpBackend[Id, Any] = HttpURLConnectionBackend()
    val oauthConfig = ZuoraRestOauthConfig(config.zuoraBaseUrl, Oauth(config.zuoraClientId, config.zuoraSecret))

    for {
      token <- getAccessToken(oauthConfig, backend)
      restConfig = ZuoraRestConfig(config.zuoraBaseUrl, token.access_token)
      paymentResponse <- queryPayments(paymentNumber, restConfig, backend)
      payment <- paymentResponse.records.headOption.toRight(
        ZuoraApiError(s"No payments for number: $paymentNumber"),
      )
      _ <- updatePayment(payment.`Id`, disputeObject, restConfig, backend)
    } yield ()
  }

  def getAccessToken(oauthConfig: ZuoraRestOauthConfig, backend: SttpBackend[Id, Any]): Either[Error, AccessToken] =
    accessTokenGetResponseV2(oauthConfig, backend).left.map(e => ZuoraApiError(e.reason))

  def queryPayments(
                     paymentNumber: String,
                     config: ZuoraRestConfig,
                     backend: SttpBackend[Id, Any],
                   ): Either[Error, ZuoraPaymentQueryResponse] =
    basicRequest
      .post(uri"${config.baseUrl}/action/query")
      .header("Authorization", s"Bearer ${config.accessToken}")
      .body(s"""{"queryString": "select Id from Payment where PaymentNumber = '$paymentNumber'" }""")
      .response(asJson[ZuoraPaymentQueryResponse])
      .mapResponse(
        _.left.map(e => ZuoraApiError(s"Response decode error for paymentNumber $paymentNumber: ${e.getMessage}")),
      )
      .send(backend)
      .body

  def updatePayment(
                     paymentId: String,
                     disputeObject: DisputeObject,
                     config: ZuoraRestConfig,
                     backend: SttpBackend[Id, Any],
                   ): Either[Error, Unit] = {
    val body = ZuoraUpdateDisputeDetails.fromStripeDisputeObject(disputeObject)

    basicRequest
      .post(uri"${config.baseUrl}/gateway-settlement/payments/$paymentId/settle")
      .header("Authorization", s"Bearer ${config.accessToken}")
      .header("Content-Type", "application/json")
      .body(body.asJson.noSpaces)
      .response(asJson[ZuoraUpdateDisputeDetailsResponse])
      .mapResponse {
        case Right(ZuoraUpdateDisputeDetailsResponse(true, _)) =>
          logger.info(s"Successfully updated disputed SEPA payment: $paymentId")
          Right(())
        case Right(ZuoraUpdateDisputeDetailsResponse(false, reasons)) =>
          Left(
            ZuoraApiError(
              reasons.getOrElse(Nil).map(_.message).mkString(", "),
            ),
          )
        case Left(e) => Left(ZuoraApiError(s"Response decode error for paymentId $paymentId: ${e.getMessage}"))
      }
      .send(backend)
      .body
  }
}
