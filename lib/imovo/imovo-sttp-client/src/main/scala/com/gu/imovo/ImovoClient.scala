package com.gu.imovo

import cats.data.EitherT
import cats.effect.Sync
import cats.syntax.all._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.{Decoder, Encoder}
import sttp.client3._
import sttp.client3.circe._
import sttp.model.Method.GET
import sttp.model.{Method, Uri}

import java.net.URI
import java.time.LocalDate
import java.time.format.DateTimeFormatter

case class ImovoConfig(imovoBaseUrl: String, imovoApiKey: String)
case class SfSubscriptionId(value: String) extends AnyVal
case class SchemeName(value: String) extends AnyVal
case class ImovoVoucherResponse(subscriptionType: String, voucherCode: String)
case class ImovoSubscriptionResponse(
    schemeName: String,
    subscriptionId: String,
    successfulRequest: Boolean,
    subscriptionVouchers: List[ImovoVoucherResponse],
)
case class ImovoErrorResponse(errorMessages: List[String], successfulRequest: Boolean)
case class ImovoSuccessResponse(message: String, successfulRequest: Boolean)

case class ImovoExceptionResponse(code: Int, body: String)
case class ImovoClientException(message: String, responseBody: Option[String] = None)
sealed trait ImovoSubscriptionType {
  val value: String
}
object ImovoSubscriptionType {
  case object ActiveCard extends ImovoSubscriptionType { override val value: String = "ActiveCard" }
  case object ActiveLetter extends ImovoSubscriptionType { override val value: String = "ActiveLetter" }
  case object Both extends ImovoSubscriptionType { override val value: String = "Both" }

  def fromBooleans(replaceCard: Boolean, replaceLetter: Boolean): Option[ImovoSubscriptionType] = {
    (replaceCard, replaceLetter) match {
      case (true, true) => Some(Both)
      case (true, false) => Some(ActiveCard)
      case (false, true) => Some(ActiveLetter)
      case _ => None
    }
  }

}

case class ImovoRedemptionHistoryResponse(
    subscriptionId: String,
    lines: Int,
    voucherHistoryItem: List[ImovoSubscriptionHistoryItem],
    successfulRequest: Boolean,
)

case class ImovoSubscriptionHistoryItem(
    voucherCode: String,
    voucherType: String,
    date: String,
    activityType: String,
    address: Option[String],
    postCode: Option[String],
    reason: String,
    value: Double,
)

trait ImovoClient[F[_]] {
  def createSubscriptionVoucher(
      subscriptionId: SfSubscriptionId,
      schemeName: SchemeName,
      startDate: LocalDate,
  ): EitherT[F, ImovoClientException, ImovoSubscriptionResponse]
  def getSubscriptionVoucher(voucherCode: String): EitherT[F, ImovoClientException, ImovoSubscriptionResponse]
  def replaceSubscriptionVoucher(
      subscriptionId: SfSubscriptionId,
      subscriptionType: ImovoSubscriptionType,
  ): EitherT[F, ImovoClientException, ImovoSubscriptionResponse]
  def cancelSubscriptionVoucher(
      subscriptionId: SfSubscriptionId,
      lastActiveDay: Option[LocalDate],
  ): EitherT[F, ImovoClientException, ImovoSuccessResponse]
  def suspendSubscriptionVoucher(
      subscriptionId: SfSubscriptionId,
      startDate: LocalDate,
      endDateExclusive: LocalDate,
  ): EitherT[F, ImovoClientException, Unit]
  def getRedemptionHistory(
      subscriptionId: SfSubscriptionId,
  ): EitherT[F, ImovoClientException, ImovoRedemptionHistoryResponse]
}

object ImovoClient extends LazyLogging {

  val redemptionHistoryMaxLines = "100"

  def apply[F[_]: Sync, S](
      backend: SttpBackend[F, S],
      config: ImovoConfig,
  ): EitherT[F, ImovoClientException, ImovoClient[F]] = {

    def sendAuthenticatedRequest[A: Decoder, B: Encoder](
        apiKey: String,
        method: Method,
        uri: Uri,
        body: Option[B],
    ): EitherT[F, ImovoClientException, A] = {

      val requestWithoutBody = basicRequest
        .method(method, uri)
        .headers(
          Map(
            "X-API-KEY" -> apiKey,
          ),
        )

      val request = body.fold(requestWithoutBody)(b => requestWithoutBody.body(b))

      for {
        response <- request.send(backend).attemptT.leftMap(e => ImovoClientException(e.toString))
        responseBody <- EitherT.fromEither[F](decodeResponse[A](request, response))
      } yield responseBody
    }

    def decodeResponse[A: Decoder](
        request: Request[Either[String, String], Any],
        response: Response[Either[String, String]],
    ): Either[ImovoClientException, A] = {
      response.body.left
        .map(errorBody =>
          ImovoClientException(
            message =
              s"Request ${request.method.method} ${request.uri.toString()} failed returning a status ${response.code} with body: $errorBody",
            responseBody = Some(errorBody),
          ),
        )
        .flatMap { successBody =>
          for {
            parsedResponse <- parse(successBody)
              .leftMap(e =>
                ImovoClientException(
                  message =
                    s"Request ${request.method.method} ${request.uri.toString()} failed to parse response ($successBody): $e",
                  responseBody = Some(successBody),
                ),
              )

            successFlag <- parsedResponse.hcursor
              .downField("successfulRequest")
              .as[Boolean]
              .leftMap(e =>
                ImovoClientException(
                  message = s"Request ${request.method.method} ${request.uri
                      .toString()} had a response which did not contain the successfulRequest flag ($successBody): $e",
                  responseBody = Some(successBody),
                ),
              )

            response <- {
              if (successFlag) {
                parsedResponse
                  .as[A]
                  .leftMap(e =>
                    ImovoClientException(
                      message = s"Request ${request.method.method} ${request.uri
                          .toString()} failed to decode response ($successBody): $e",
                      responseBody = Some(successBody),
                    ),
                  )
              } else {
                ImovoClientException(
                  message =
                    s"Request ${request.method.method} ${request.uri.toString()} failed with response ($successBody)",
                  responseBody = Some(successBody),
                ).asLeft[A]
              }
            }
          } yield response
        }
    }

    val imovoDateFormat = DateTimeFormatter.ISO_DATE

    new ImovoClient[F] {

      override def createSubscriptionVoucher(
          subscriptionId: SfSubscriptionId,
          schemeName: SchemeName,
          startDate: LocalDate,
      ): EitherT[F, ImovoClientException, ImovoSubscriptionResponse] =
        sendAuthenticatedRequest[ImovoSubscriptionResponse, String](
          config.imovoApiKey,
          Method.GET,
          Uri(new URI(s"${config.imovoBaseUrl}/Subscription/RequestSubscriptionVouchers"))
            .addParam("SubscriptionId", subscriptionId.value)
            .addParam("SchemeName", schemeName.value)
            .addParam("StartDate", imovoDateFormat.format(startDate)),
          None,
        )

      override def getSubscriptionVoucher(
          subscriptionId: String,
      ): EitherT[F, ImovoClientException, ImovoSubscriptionResponse] = {
        sendAuthenticatedRequest[ImovoSubscriptionResponse, String](
          config.imovoApiKey,
          Method.GET,
          Uri(new URI(s"${config.imovoBaseUrl}/Subscription/GetSubscriptionVoucherDetails"))
            .addParam("SubscriptionId", subscriptionId),
          None,
        )
      }

      override def replaceSubscriptionVoucher(
          subscriptionId: SfSubscriptionId,
          subscriptionType: ImovoSubscriptionType,
      ): EitherT[F, ImovoClientException, ImovoSubscriptionResponse] = {
        sendAuthenticatedRequest[ImovoSubscriptionResponse, String](
          config.imovoApiKey,
          Method.GET,
          Uri(new URI(s"${config.imovoBaseUrl}/Subscription/ReplaceVoucherBySubscriptionId"))
            .addParam("SubscriptionId", subscriptionId.value)
            .addParam("SubscriptionType", subscriptionType.value),
          None,
        )
      }

      override def cancelSubscriptionVoucher(
          subscriptionId: SfSubscriptionId,
          optionalLastActiveDay: Option[LocalDate],
      ): EitherT[F, ImovoClientException, ImovoSuccessResponse] = {
        val uri = Uri(new URI(s"${config.imovoBaseUrl}/Subscription/CancelSubscriptionVoucher"))
          .addParam("SubscriptionId", subscriptionId.value)
        val uriWithLastActiveDay = optionalLastActiveDay
          .map(lastActiveDay => uri.addParam("LastActiveDay", imovoDateFormat.format(lastActiveDay)))
          .getOrElse(uri)
        sendAuthenticatedRequest[ImovoSuccessResponse, String](
          config.imovoApiKey,
          Method.GET,
          uriWithLastActiveDay,
          None,
        )
      }

      def suspendSubscriptionVoucher(
          subscriptionId: SfSubscriptionId,
          startDate: LocalDate,
          endDateExclusive: LocalDate,
      ): EitherT[F, ImovoClientException, Unit] =
        sendAuthenticatedRequest[ImovoSuccessResponse, String](
          apiKey = config.imovoApiKey,
          method = GET,
          uri = Uri(new URI(s"${config.imovoBaseUrl}/Subscription/SetHoliday"))
            .addParam("SubscriptionId", subscriptionId.value)
            .addParam("StartDate", startDate.toString)
            .addParam("ReactivationDate", endDateExclusive.toString),
          body = None,
        ).map(_ => ())

      /** Method to return `redemptionHistoryMaxLines` of redemption attempts - this call returns successful
        * redemptions, failed redemptions with a reason and any top up credits applied to the subscription
        *
        * The call to imovo has some additional parameters that can be used to paginate the request
        * /Subscription/SubscriptionRedemptionHistory?EndDate=2019-11-23&StartDate=2008-11-23&SubscriptionId=A-S0039247&MaxLines=20
        *
        * REQUIRED
        *
        * CustomerReference - string
        *
        * OPTIONAL
        *
        * StartDate - string (yyyy-MM-dd)
        *
        * EndDate - string (yyyy-MM-dd)
        *
        * MaxLines - integer
        *
        * @return
        *   Either[F, ImovoClientException, ImovoRedemptionHistoryResponse]
        */
      override def getRedemptionHistory(
          subscriptionId: SfSubscriptionId,
      ): EitherT[F, ImovoClientException, ImovoRedemptionHistoryResponse] = {
        val uri = Uri(new URI(s"${config.imovoBaseUrl}/Subscription/SubscriptionRedemptionHistory"))
          .addParam("SubscriptionId", subscriptionId.value)
          .addParam("MaxLines", redemptionHistoryMaxLines)

        sendAuthenticatedRequest[ImovoRedemptionHistoryResponse, String](
          config.imovoApiKey,
          Method.GET,
          uri,
          None,
        )
      }

    }.asRight[ImovoClientException].toEitherT[F]
  }
}
