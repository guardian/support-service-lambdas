package com.gu.holiday_stops

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

import cats.syntax.either._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.holiday_stops.subscription.{StoppedProduct, Subscription}
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestId, StoppedPublicationDate, SubscriptionName}
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact._
import com.gu.salesforce.holiday_stops.{SalesforceHolidayStopRequest, SalesforceSFSubscription}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker.BodyAsString
import com.gu.util.resthttp.{HttpOp, JsonHttp}
import com.softwaremill.sttp.{HttpURLConnectionBackend, Id, SttpBackend}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scalaz.{-\/, \/, \/-}

object Handler extends Logging {

  type SfClient = HttpOp[StringHttpRequest, BodyAsString]

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    ApiGatewayHandler(
      LambdaIO(
        inputStream,
        outputStream,
        context
      )
    )(
        operationForEffects(
          RawEffects.response,
          RawEffects.stage,
          GetFromS3.fetchString,
          HttpURLConnectionBackend()
        )
      )
  }

  def operationForEffects(
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3,
    backend: SttpBackend[Id, Nothing]
  ): ApiGatewayOp[Operation] = {
    for {
      config <- Config(fetchString).toApiGatewayOp("Failed to load config")
      sfClient <- SalesforceClient(response, config.sfConfig).value.toDisjunction.toApiGatewayOp("authenticate with SalesForce")
    } yield Operation.noHealthcheck(request => // checking connectivity to SF is sufficient healthcheck so no special steps required
      validateRequestAndCreateSteps(
        request,
        getSubscriptionFromZuora(config, backend)
      )(request, sfClient))
  }

  private def validateRequestAndCreateSteps(
    request: ApiGatewayRequest,
    getSubscription: SubscriptionName => Either[HolidayError, Subscription]
  ) = {
    (for {
      httpMethod <- validateMethod(request.httpMethod)
      path <- validatePath(request.path)
    } yield createSteps(httpMethod, splitPath(path), getSubscription)).fold(
      { errorMessage: String =>
        badrequest(errorMessage) _
      },
      identity
    )
  }

  private def validateMethod(method: Option[String]): String \/ String = {
    method match {
      case Some(method) => \/-(method)
      case None => -\/("Http method is required")
    }
  }

  private def validatePath(path: Option[String]): String \/ String = {
    path match {
      case Some(method) => \/-(method)
      case None => -\/("Path is required")
    }
  }

  private def createSteps(
    httpMethod: String,
    path: List[String],
    getSubscription: SubscriptionName => Either[HolidayError, Subscription]
  ) = {
    path match {
      case "potential" :: _ :: Nil =>
        httpMethod match {
          case "GET" => stepsForPotentialHolidayStop(getSubscription) _
          case _ => unsupported _
        }
      case "hsr" :: Nil =>
        httpMethod match {
          case "POST" => stepsToCreate(getSubscription) _
          case _ => unsupported _
        }
      case "hsr" :: _ :: Nil =>
        httpMethod match {
          case "GET" => stepsToListExisting(getSubscription) _
          case _ => unsupported _
        }
      case "hsr" :: _ :: _ :: Nil =>
        httpMethod match {
          case "DELETE" => stepsToWithdraw _
          case _ => unsupported _
        }
      case _ =>
        notfound _
    }
  }

  def splitPath(pathString: String): List[String] = {
    pathString.split('/').toList match {
      case "" :: tail => tail
      case noLeadingSlash => noLeadingSlash
    }
  }

  val HEADER_IDENTITY_ID = "x-identity-id"
  val HEADER_SALESFORCE_CONTACT_ID = "x-salesforce-contact-id"

  def extractContactFromHeaders(headers: Option[Map[String, String]]): ApiGatewayOp[Contact] = headers.flatMap(_.toList.collectFirst {
    case (HEADER_SALESFORCE_CONTACT_ID, sfContactId) => Right(SalesforceContactId(sfContactId))
    case (HEADER_IDENTITY_ID, identityId) => Left(IdentityId(identityId))
  }).toApiGatewayOp(s"either '$HEADER_IDENTITY_ID' header OR '$HEADER_SALESFORCE_CONTACT_ID' (one is required)")

  case class PotentialHolidayStopsPathParams(subscriptionName: SubscriptionName)

  case class PotentialHolidayStopsQueryParams(
    startDate: LocalDate,
    endDate: LocalDate,
    estimateCredit: Option[String]
  )

  def stepsForPotentialHolidayStop(
    getSubscription: SubscriptionName => Either[HolidayError, Subscription]
  )(req: ApiGatewayRequest, unused: SfClient): ApiResponse = {
    implicit val reads: Reads[PotentialHolidayStopsQueryParams] = Json.reads[PotentialHolidayStopsQueryParams]
    (for {
      pathParams <- req.pathParamsAsCaseClass[PotentialHolidayStopsPathParams]()(Json.reads[PotentialHolidayStopsPathParams])
      queryParams <- req.queryParamsAsCaseClass[PotentialHolidayStopsQueryParams]()
      subscription <- getSubscription(pathParams.subscriptionName)
        .toApiGatewayOp(s"get subscription ${pathParams.subscriptionName}")
      publicationDatesToBeStopped <- ActionCalculator
        .publicationDatesToBeStopped(queryParams.startDate, queryParams.endDate, ProductVariant(subscription.ratePlans))
        .toApiGatewayOp(s"calculating publication dates")
      potentialHolidayStops = publicationDatesToBeStopped.map { stoppedPublicationDate =>
        // unfortunately necessary due to GW N-for-N requiring stoppedPublicationDate to calculate correct credit estimation
        PotentialHolidayStop(
          stoppedPublicationDate,
          StoppedProduct(subscription, StoppedPublicationDate(stoppedPublicationDate)).map(_.credit).toOption
        )
      }
    } yield ApiGatewayResponse("200", PotentialHolidayStopsResponse(potentialHolidayStops))).apiResponse
  }

  case class ListExistingPathParams(subscriptionName: SubscriptionName)

  def stepsToListExisting(getSubscription: SubscriptionName => Either[HolidayError, Subscription])(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))

    val extractSubNameOp: ApiGatewayOp[SubscriptionName] = req.pathParamsAsCaseClass[ListExistingPathParams]()(Json.reads[ListExistingPathParams]).map(_.subscriptionName)

    (for {
      contact <- extractContactFromHeaders(req.headers)
      subName <- extractSubNameOp
      usersHolidayStopRequests <- lookupOp(contact, Some(subName))
        .toDisjunction
        .toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
      subscription <- getSubscription(subName)
        .toApiGatewayOp(s"get subscription $subName")
      response <- GetHolidayStopRequests(
        usersHolidayStopRequests,
        subscription
      ).toApiGatewayOp("calculate holidays stops specifics")
    } yield ApiGatewayResponse("200", response)).apiResponse
  }

  def stepsToCreate(
    getSubscription: SubscriptionName => Either[HolidayError, Subscription]
  )(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val verifyContactOwnsSubOp = SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact(sfClient.wrapWith(JsonHttp.getWithParams))
    val createOp = SalesforceHolidayStopRequest.CreateHolidayStopRequestWithDetail(sfClient.wrapWith(JsonHttp.post))

    (for {
      requestBody <- req.bodyAsCaseClass[HolidayStopRequestPartial]()
      contact <- extractContactFromHeaders(req.headers)
      maybeMatchingSfSub <- verifyContactOwnsSubOp(requestBody.subscriptionName, contact).toDisjunction.toApiGatewayOp(s"fetching subscriptions for contact $contact")
      matchingSfSub <- maybeMatchingSfSub.toApiGatewayOp(s"contact $contact does not own ${requestBody.subscriptionName.value}")
      zuoraSubscription <- getSubscription(requestBody.subscriptionName).toApiGatewayOp("get subscription from zuora")
      publicationDatesToBeStopped <- ActionCalculator
        .publicationDatesToBeStopped(requestBody.start, requestBody.end, ProductVariant(zuoraSubscription.ratePlans))
        .toApiGatewayOp(s"calculating publication dates")
      createBody = CreateHolidayStopRequestWithDetail.buildBody(requestBody.start, requestBody.end, publicationDatesToBeStopped, matchingSfSub, zuoraSubscription)
      _ <- createOp(createBody).toDisjunction.toApiGatewayOp(s"create new Holiday Stop Request for subscription ${requestBody.subscriptionName} (contact $contact)")
      // TODO nice to have - handle 'FIELD_CUSTOM_VALIDATION_EXCEPTION' etc back from SF and place in response
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  def getSubscriptionFromZuora(
    config: Config,
    backend: SttpBackend[Id, Nothing]
  )(
    subscriptionName: SubscriptionName
  ): Either[HolidayError, Subscription] =
    for {
      accessToken <- Zuora.accessTokenGetResponse(config.zuoraConfig, backend)
      subscription <- Zuora.subscriptionGetResponse(config, accessToken, backend)(subscriptionName)
    } yield subscription

  case class WithdrawPathParams(subscriptionName: SubscriptionName, holidayStopRequestId: HolidayStopRequestId)

  def stepsToWithdraw(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))
    val withdrawOp = SalesforceHolidayStopRequest.WithdrawHolidayStopRequest(sfClient.wrapWith(JsonHttp.patch))

    (for {
      contact <- extractContactFromHeaders(req.headers)
      pathParams <- req.pathParamsAsCaseClass[WithdrawPathParams]()(Json.reads[WithdrawPathParams])
      existingForUser <- lookupOp(contact, None).toDisjunction.toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
      _ = existingForUser.exists(_.Id == pathParams.holidayStopRequestId).toApiGatewayContinueProcessing(ApiGatewayResponse.forbidden("not your holiday stop"))
      _ <- withdrawOp(pathParams.holidayStopRequestId).toDisjunction.toApiGatewayOp(s"withdraw Holiday Stop Request for subscription ${pathParams.subscriptionName.value} of contact $contact")
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  def unsupported(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest("UNSUPPORTED HTTP METHOD")

  def notfound(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.notFound("Not Found")

  def badrequest(message: String)(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest(message)
}
