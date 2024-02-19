package com.gu.paymentIntentIssues

import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent, SQSBatchResponse, SQSEvent}
import com.typesafe.scalalogging.LazyLogging

import scala.jdk.CollectionConverters.*
import com.stripe.net.Webhook

import scala.util.Try
import io.circe.syntax.*
import io.circe.generic.auto.*
import cats.effect.IO.*
import cats.effect.IO
import cats.Id
import com.gu.util.config.ConfigLoader
import com.gu.AppIdentity
import cats.data.EitherT
import com.gu.zuora.Zuora.accessTokenGetResponseV2
import com.gu.zuora.ZuoraRestOauthConfig
import com.gu.zuora.Oauth
import sttp.client3.{HttpURLConnectionBackend, SttpBackend}
import sttp.client3.*
import sttp.client3.circe.*
import com.gu.zuora.AccessToken

object Lambda extends LazyLogging {

  case class SQSBatchError(message: String) extends Error

  def handler(event: SQSEvent): SQSBatchResponse= {
    logger.info(s"Input was $event")

    val identity = AppIdentity.whoAmI(defaultAppName = "payment-intent-issues")

    val program = loadConfig(identity).subflatMap(config =>

      config.endpointSecret match {
        case Right( config.endpointSecret) =>
          val messages: List[SQSEvent.SQSMessage] = event.getRecords.asScala.toList
          for {
            message <- messages
            payload <- getPayload(message, config.endpointSecret)
            _ <- processEvent(payload, config)
          } yield ()

          val result = program.value.unsafeRunSync()
          result match {
            case Right(_) =>
              logger.info(s"Batch processed successfully")
              val failedMessageIds = messages.map(message => processEvent(getPayload(message, config.endpointSecret), config)).collect { case Left(messageId) => messageId }
              new SQSBatchResponse(
                failedMessageIds.map(messageId => new BatchItemFailure(messageId)).asJava,
              )
            case Left(error) =>
              logger.error(s"Error processing SQS event: $error")
              new SQSBatchResponse(
                event.getRecords.asScala.map(message => new BatchItemFailure(message.getMessageId)).asJava,
              )
          }
        case Left(error) =>
          logger.error(s"Error fetching  config : $error")
          // Return all messages to the queue
          new SQSBatchResponse(
            event.getRecords.asScala.map(message => new BatchItemFailure(message.getMessageId)).asJava,
          )
      }

    )
  }

  def loadConfig(identity: AppIdentity): EitherT[IO, Error, Config] =
    ConfigLoader.loadConfig[IO, Config](identity).leftMap(e => ConfigLoadingError(e.message))

  def getPayload(message: SQSEvent.SQSMessage, endpointSecret: String): Either[Error, String] =
    for {
      payload <- Option(message.getBody()).toRight(InvalidRequestError("Missing body"))
      sigHeader <- message.getHeaders.asScala.get("Stripe-Signature").toRight(InvalidRequestError("Missing sig header"))
      _ <- Try(Webhook.Signature.verifyHeader(payload, sigHeader, endpointSecret, 300)).toEither.left.map(e =>
        InvalidRequestError(e.getMessage()),
      )
    } yield payload

  def processEvent(payload: String, config: Config): Either[Error, Unit] =
    for {
      intent <- parsePaymentIntent(payload)
      _ <- processPaymentIntent(intent, config)
    } yield ()

  def parsePaymentIntent(payload: String): Either[Error, PaymentIntent] =
    for {
      event <- PaymentIntentEvent.fromJson(payload)
      intent <- PaymentIntent.fromEvent(event)
    } yield intent

  def processPaymentIntent(intent: PaymentIntent, config: Config): Either[Error, Unit] =
    intent match {
      case SepaPaymentIntent(paymentNumber, paymentIntentObject) =>
        refundZuoraPayment(paymentNumber, paymentIntentObject, config)
      case OtherPaymentIntent() =>
        logger.info(s"Ignoring non-SEPA event")
        Right(())
    }

  def refundZuoraPayment(
                          paymentNumber: String,
                          paymentIntentObject: PaymentIntentObject,
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
        ZuoraApiError(s"No payments for for number: $paymentNumber"),
      )
      _ <- rejectPayment(payment.`Id`, paymentIntentObject, restConfig, backend)
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

  def rejectPayment(
                     paymentId: String,
                     paymentIntentObject: PaymentIntentObject,
                     config: ZuoraRestConfig,
                     backend: SttpBackend[Id, Any],
                   ): Either[Error, Unit] = {
    val body = ZuoraRejectPaymentBody.fromStripePaymentIntentObject(paymentIntentObject)

    basicRequest
      .post(uri"${config.baseUrl}/gateway-settlement/payments/$paymentId/reject")
      .header("Authorization", s"Bearer ${config.accessToken}")
      .header("Content-Type", "application/json")
      .body(body.asJson.noSpaces)
      .response(asJson[ZuoraRejectPaymentResponse])
      .mapResponse {
        case Right(ZuoraRejectPaymentResponse(true, _)) =>
          logger.info(s"Successfully rejected SEPA payment: $paymentId")
          Right(())
        case Right(ZuoraRejectPaymentResponse(false, reasons)) =>
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
