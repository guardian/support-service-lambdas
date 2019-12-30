package com.gu.holiday_stops

import java.io.{InputStream, OutputStream}
import java.time.LocalDate
import java.util.UUID

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.holiday_stops.WireHolidayStopRequest.toHolidayStopRequestDetail
import com.gu.holiday_stops.subscription.{HolidayStopCredit, Subscription, SubscriptionData}
import com.gu.salesforce.{Contact, SalesforceClient, SalesforceHandlerSupport}
import com.gu.salesforce.SalesforceClient.withAlternateAccessTokenIfPresentInHeaderList
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestId, SubscriptionName}
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
import com.gu.util.resthttp.Types.ClientFailure
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
          HttpURLConnectionBackend(),
          UUID.randomUUID().toString
        )
      )
  }

  def operationForEffects(
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3,
    backend: SttpBackend[Id, Nothing],
    idGenerator: => String
  ): ApiGatewayOp[Operation] = {
    for {
      config <- Config(fetchString).toApiGatewayOp("Failed to load config")
      sfClient <- SalesforceClient(
        response,
        config.sfConfig,
        shouldExposeSalesforceErrorMessageInClientFailure = true
      ).value.toDisjunction.toApiGatewayOp("authenticate with SalesForce")
    } yield Operation.noHealthcheck(request => // checking connectivity to SF is sufficient healthcheck so no special steps required
      validateRequestAndCreateSteps(
        request,
        getSubscriptionFromZuora(config, backend),
        idGenerator
      )(
          request,
          sfClient.setupRequest(withAlternateAccessTokenIfPresentInHeaderList(request.headers))
        ))
  }

  private def validateRequestAndCreateSteps(
    request: ApiGatewayRequest,
    getSubscription: SubscriptionName => Either[HolidayError, Subscription],
    idGenerator: => String
  ) = {
    (for {
      httpMethod <- validateMethod(request.httpMethod)
      path <- validatePath(request.path)
    } yield createSteps(httpMethod, splitPath(path), getSubscription, idGenerator)).fold(
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
    getSubscription: SubscriptionName => Either[HolidayError, Subscription],
    idGenerator: => String
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
      case "hsr" :: _ :: "cancel" :: Nil =>
        httpMethod match {
          case "POST" => stepsToCancel(getSubscription, idGenerator) _
          case "GET" => stepsToGetCancellationDetails(getSubscription, idGenerator) _
          case _ => unsupported _
        }
      case "hsr" :: _ :: _ :: Nil =>
        httpMethod match {
          case "PATCH" => stepsToAmend(getSubscription) _
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

  def extractContactFromHeaders(headers: Option[Map[String, String]]): ApiGatewayOp[Contact] =
    SalesforceHandlerSupport.extractContactFromHeaders(headers.getOrElse(Map.empty).toList)
      .toApiGatewayOp(error =>
        ApiGatewayResponse.badRequest(
          error.message
        ))

  private def exposeSfErrorMessageIn500ApiResponse(action: String) = (error: ClientFailure) => {
    logger.error(s"Failed to $action: $error")
    ApiGatewayResponse.messageResponse("500", error.message)
  }

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
      issuesData <- SubscriptionData(subscription)
        .map(_.issueDataForPeriod(queryParams.startDate, queryParams.endDate))
        .toApiGatewayOp(s"calculating publication dates")
      potentialHolidayStops = issuesData.map { issueData =>
        PotentialHolidayStop(
          issueData.issueDate,
          HolidayStopCredit(issueData.credit, issueData.nextBillingPeriodStartDate)
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
      subscription <- getSubscription(requestBody.subscriptionName)
        .toApiGatewayOp(s"get subscription ${requestBody.subscriptionName}")
      issuesData <- SubscriptionData(subscription)
        .map(_.issueDataForPeriod(requestBody.startDate, requestBody.endDate))
        .toApiGatewayOp(s"calculating publication dates")
      createBody = CreateHolidayStopRequestWithDetail.buildBody(requestBody.startDate, requestBody.endDate, issuesData, matchingSfSub, zuoraSubscription)
      _ <- createOp(createBody).toDisjunction.toApiGatewayOp(
        exposeSfErrorMessageIn500ApiResponse(s"create new Holiday Stop Request for subscription ${requestBody.subscriptionName} (contact $contact)")
      )
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  case class CancelHolidayStopsPathParams(subscriptionName: SubscriptionName)
  case class CancelHolidayStopsQueryParams(effectiveCancellationDate: Option[LocalDate])

  def stepsToCancel(getSubscription: SubscriptionName => Either[HolidayError, Subscription], idGenerator: => String)(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {
    val sfClientGetWithParams = sfClient.wrapWith(JsonHttp.getWithParams)
    val lookupOpHolidayStopsOp = LookupByContactAndOptionalSubscriptionName(sfClientGetWithParams)
    val updateRequestDetailOp = CancelHolidayStopRequestDetail(sfClient.wrapWith(JsonHttp.post))

    (for {
      pathParams <- req.pathParamsAsCaseClass[CancelHolidayStopsPathParams]()(Json.reads[CancelHolidayStopsPathParams])
      queryParams <- req.queryParamsAsCaseClass[CancelHolidayStopsQueryParams]()(Json.reads[CancelHolidayStopsQueryParams])
      effectiveCancellationDate <- queryParams.effectiveCancellationDate
        .toApiGatewayOp("effectiveCancellationDate query string parameter is required")
      contact <- extractContactFromHeaders(req.headers)
      holidayStopRequests <- lookupOpHolidayStopsOp(contact, Some(pathParams.subscriptionName))
        .toDisjunction
        .toApiGatewayOp(
          s"lookup Holiday Stop Requests for contact $contact and subscription ${pathParams.subscriptionName}"
        )
      holidayStopRequestDetailToUpdate = HolidayStopSubscriptionCancellation(
        effectiveCancellationDate,
        holidayStopRequests
      )
      cancelBody = CancelHolidayStopRequestDetail.buildBody(holidayStopRequestDetailToUpdate, idGenerator)
      _ <- updateRequestDetailOp(cancelBody)
        .toDisjunction
        .toApiGatewayOp(
          exposeSfErrorMessageIn500ApiResponse(
            s"cancel holiday stop request details: ${holidayStopRequestDetailToUpdate.map(_.Id.value).mkString(",")} " +
              s"(contact $contact)"
          )
        )
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  case class GetCancellationDetails(publicationsToRefund: List[HolidayStopRequestsDetail])
  implicit val writesGetCancellationDetails = Json.writes[GetCancellationDetails]

  def stepsToGetCancellationDetails(getSubscription: SubscriptionName => Either[HolidayError, Subscription], idGenerator: => String)(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {
    val sfClientGetWithParams = sfClient.wrapWith(JsonHttp.getWithParams)
    val lookupOpHolidayStopsOp = LookupByContactAndOptionalSubscriptionName(sfClientGetWithParams)

    (for {
      pathParams <- req.pathParamsAsCaseClass[CancelHolidayStopsPathParams]()(Json.reads[CancelHolidayStopsPathParams])
      queryParams <- req.queryParamsAsCaseClass[CancelHolidayStopsQueryParams]()(Json.reads[CancelHolidayStopsQueryParams])
      effectiveCancellationDate <- queryParams.effectiveCancellationDate
        .toApiGatewayOp("effectiveCancellationDate query string parameter is required")
      contact <- extractContactFromHeaders(req.headers)
      holidayStopRequests <- lookupOpHolidayStopsOp(contact, Some(pathParams.subscriptionName))
        .toDisjunction
        .toApiGatewayOp(
          s"lookup Holiday Stop Requests for contact $contact and subscription ${pathParams.subscriptionName}"
        )
      holidayStopRequestDetailToRefund = HolidayStopSubscriptionCancellation(
        effectiveCancellationDate,
        holidayStopRequests
      )

      response = GetCancellationDetails(holidayStopRequestDetailToRefund.map(toHolidayStopRequestDetail))
    } yield ApiGatewayResponse("200", response)).apiResponse
  }

  case class SpecificHolidayStopRequestPathParams(subscriptionName: SubscriptionName, holidayStopRequestId: HolidayStopRequestId)
  implicit val readsSpecificHolidayStopRequestPathParams = Json.reads[SpecificHolidayStopRequestPathParams]

  def stepsToAmend(
    getSubscription: SubscriptionName => Either[HolidayError, Subscription]
  )(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))
    val amendOp = SalesforceHolidayStopRequest.AmendHolidayStopRequest(sfClient.wrapWith(JsonHttp.post))

    (for {
      requestBody <- req.bodyAsCaseClass[HolidayStopRequestPartial]()
      contact <- extractContactFromHeaders(req.headers)
      pathParams <- req.pathParamsAsCaseClass[SpecificHolidayStopRequestPathParams]()
      zuoraSubscription <- getSubscription(pathParams.subscriptionName).toApiGatewayOp("get subscription from zuora")
      allExisting <- lookupOp(contact, Some(pathParams.subscriptionName)).toDisjunction.toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
      existingPublicationsThatWereToBeStopped <- allExisting.find(_.Id == pathParams.holidayStopRequestId).flatMap(_.Holiday_Stop_Request_Detail__r.map(_.records)).toApiGatewayOp(s"contact $contact does not own ${requestBody.subscriptionName.value}")
      subscription <- getSubscription(requestBody.subscriptionName)
        .toApiGatewayOp(s"get subscription ${requestBody.subscriptionName}")
      issuesData <- SubscriptionData(subscription)
        .map(_.issueDataForPeriod(requestBody.startDate, requestBody.endDate))
        .toApiGatewayOp(s"calculating publication dates")
      amendBody = AmendHolidayStopRequest.buildBody(pathParams.holidayStopRequestId, requestBody.startDate, requestBody.endDate, issuesData, existingPublicationsThatWereToBeStopped, zuoraSubscription)
      _ <- amendOp(amendBody).toDisjunction.toApiGatewayOp(
        exposeSfErrorMessageIn500ApiResponse(s"amend Holiday Stop Request for subscription ${requestBody.subscriptionName} (contact $contact)")
      )
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

  def stepsToWithdraw(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))
    val withdrawOp = SalesforceHolidayStopRequest.WithdrawHolidayStopRequest(sfClient.wrapWith(JsonHttp.patch))

    (for {
      contact <- extractContactFromHeaders(req.headers)
      pathParams <- req.pathParamsAsCaseClass[SpecificHolidayStopRequestPathParams]()
      existingForUser <- lookupOp(contact, None).toDisjunction.toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
      _ = existingForUser.exists(_.Id == pathParams.holidayStopRequestId).toApiGatewayContinueProcessing(ApiGatewayResponse.forbidden("not your holiday stop"))
      _ <- withdrawOp(pathParams.holidayStopRequestId).toDisjunction.toApiGatewayOp(
        exposeSfErrorMessageIn500ApiResponse(s"withdraw Holiday Stop Request for subscription ${pathParams.subscriptionName.value} of contact $contact")
      )
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  def unsupported(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest("UNSUPPORTED HTTP METHOD")

  def notfound(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.notFound("Not Found")

  def badrequest(message: String)(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest(message)
}
