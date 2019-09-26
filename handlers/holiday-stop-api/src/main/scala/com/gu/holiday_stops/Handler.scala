package com.gu.holiday_stops

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.holiday_stops.CreditCalculator.PartiallyWiredCreditCalculator
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestId, ProductRatePlanKey, ProductRatePlanName, ProductType, SubscriptionName}
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact._
import com.gu.salesforce.holiday_stops.{SalesforceHolidayStopRequest, SalesforceSFSubscription}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
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
        CreditCalculator.calculateCredit(
          config.guardianWeeklyConfig.productRatePlanIds,
          config.guardianWeeklyConfig.nForNProductRatePlanIds,
          config.sundayVoucherConfig.productRatePlanChargeId
        ),
        getSubscriptionFromZuora(config, backend)
      )(request, sfClient))
  }

  private def validateRequestAndCreateSteps(
    request: ApiGatewayRequest,
    creditCalculator: PartiallyWiredCreditCalculator,
    getSubscription: SubscriptionName => Either[HolidayError, Subscription]
  ) = {
    (for {
      httpMethod <- validateMethod(request.httpMethod)
      path <- validatePath(request.path)
    } yield createSteps(httpMethod, splitPath(path), creditCalculator, getSubscription)).fold(
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
    creditCalculator: PartiallyWiredCreditCalculator,
    getSubscription: SubscriptionName => Either[HolidayError, Subscription]
  ) = {
    path match {
      case "potential" :: _ :: Nil =>
        httpMethod match {
          case "GET" => stepsForPotentialHolidayStop(creditCalculator, getSubscription) _
          case _ => unsupported _
        }
      case "hsr" :: Nil =>
        httpMethod match {
          case "GET" => stepsToListExisting _
          case "POST" => stepsToCreate(creditCalculator, getSubscription) _
          case _ => unsupported _
        }
      case "hsr" :: _ :: Nil =>
        httpMethod match {
          case "GET" => stepsToListExisting _
          case _ => unsupported _
        }
      case "hsr" :: _ :: _ :: Nil =>
        httpMethod match {
          case "DELETE" => stepsToDelete _
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
  val HEADER_PRODUCT_NAME_PREFIX = "x-product-name-prefix"
  val PRODUCT_TYPE_QUERY_STRING_KEY = "productType"
  val PRODUCT_RATE_PLAN_NAME_QUERY_STRING_KEY = "productRatePlanName"

  def extractContactFromHeaders(headers: Option[Map[String, String]]): ApiGatewayOp[Contact] = headers.flatMap(_.toList.collectFirst {
    case (HEADER_SALESFORCE_CONTACT_ID, sfContactId) => Right(SalesforceContactId(sfContactId))
    case (HEADER_IDENTITY_ID, identityId) => Left(IdentityId(identityId))
  }).toApiGatewayOp(s"either '$HEADER_IDENTITY_ID' header OR '$HEADER_SALESFORCE_CONTACT_ID' (one is required)")

  case class PotentialHolidayStopsPathParams(subscriptionName: SubscriptionName)

  case class PotentialHolidayStopsQueryParams(
    startDate: LocalDate,
    endDate: LocalDate,
    estimateCredit: Option[String],
    productType: String,
    productRatePlanName: String
  )

  def stepsForPotentialHolidayStop(
    creditCalculator: PartiallyWiredCreditCalculator,
    getSubscription: SubscriptionName => Either[HolidayError, Subscription]
  )(req: ApiGatewayRequest, unused: SfClient): ApiResponse = {
    implicit val reads: Reads[PotentialHolidayStopsQueryParams] = Json.reads[PotentialHolidayStopsQueryParams]
    (for {
      pathParams <- req.pathParamsAsCaseClass[PotentialHolidayStopsPathParams]()(Json.reads[PotentialHolidayStopsPathParams])
      queryParams <- req.queryParamsAsCaseClass[PotentialHolidayStopsQueryParams]()
      potentialHolidayStopDates <- getPublicationDatesToBeStopped(queryParams)
      optionalSubscription <- getSubscriptionIfRequired(getSubscription, pathParams, queryParams)
      potentialHolidayStops = potentialHolidayStopDates.map { stoppedPublicationDate => // unfortunately necessary due to GW N-for-N requiring stoppedPublicationDate to calculate correct credit estimation
        PotentialHolidayStop(stoppedPublicationDate, optionalSubscription.flatMap(creditCalculator(stoppedPublicationDate, _).toOption))
      }
    } yield ApiGatewayResponse("200", PotentialHolidayStopsResponse(potentialHolidayStops))).apiResponse
  }

  private def getPublicationDatesToBeStopped(queryParams: PotentialHolidayStopsQueryParams) = {
    ActionCalculator
      .publicationDatesToBeStopped(
        queryParams.startDate,
        queryParams.endDate,
        ProductRatePlanKey(ProductType(queryParams.productType), ProductRatePlanName(queryParams.productRatePlanName))
      )
      .toApiGatewayOp(s"calculating publication dates")
  }

  private def getSubscriptionIfRequired(
    getSubscription: SubscriptionName => Either[HolidayError, Subscription],
    pathParams: PotentialHolidayStopsPathParams,
    queryParams: PotentialHolidayStopsQueryParams
  ): ApiGatewayOp[Option[Subscription]] = {
    if (queryParams.estimateCredit.contains("true"))
      getSubscription(pathParams.subscriptionName)
        .map(Some(_))
        .toApiGatewayOp(s"get subscription ${pathParams.subscriptionName}")
    else
      ContinueProcessing(None)
  }

  case class ListExistingPathParams(subscriptionName: Option[SubscriptionName])

  def stepsToListExisting(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))

    val extractOptionalSubNameOp: ApiGatewayOp[Option[SubscriptionName]] = req.pathParameters match {
      case Some(_) => req.pathParamsAsCaseClass[ListExistingPathParams]()(Json.reads[ListExistingPathParams]).map(_.subscriptionName)
      case None => ContinueProcessing(None)
    }

    (for {
      productRatePlanKey <- req.queryParamsAsCaseClass[ProductRatePlanKey]()
      contact <- extractContactFromHeaders(req.headers)
      optionalSubName <- extractOptionalSubNameOp
      usersHolidayStopRequests <- lookupOp(contact, optionalSubName)
        .toDisjunction
        .toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
      response <- GetHolidayStopRequests(usersHolidayStopRequests, productRatePlanKey)
        .toApiGatewayOp("calculate holidays stops specifics")
    } yield ApiGatewayResponse("200", response)).apiResponse
  }

  def stepsToCreate(
    creditCalculator: PartiallyWiredCreditCalculator,
    getSubscription: SubscriptionName => Either[HolidayError, Subscription]
  )(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val verifyContactOwnsSubOp = SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact(sfClient.wrapWith(JsonHttp.getWithParams))
    val createOp = SalesforceHolidayStopRequest.CreateHolidayStopRequestWithDetail(sfClient.wrapWith(JsonHttp.post))

    (for {
      requestBody <- req.bodyAsCaseClass[HolidayStopRequestPartial]()
      contact <- extractContactFromHeaders(req.headers)
      maybeMatchingSub <- verifyContactOwnsSubOp(requestBody.subscriptionName, contact).toDisjunction.toApiGatewayOp(s"fetching subscriptions for contact $contact")
      matchingSub <- maybeMatchingSub.toApiGatewayOp(s"contact $contact does not own ${requestBody.subscriptionName.value}")
      zuoraSubscription <- getSubscription(requestBody.subscriptionName).toApiGatewayOp("get subscription from zuora")
      createBody = CreateHolidayStopRequestWithDetail.buildBody(creditCalculator)(requestBody.start, requestBody.end, matchingSub, zuoraSubscription)
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

  case class DeletePathParams(subscriptionName: SubscriptionName, holidayStopRequestId: HolidayStopRequestId)

  def stepsToDelete(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))
    val deleteOp = SalesforceHolidayStopRequest.DeleteHolidayStopRequest(sfClient.wrapWith(JsonHttp.deleteWithStringResponse))

    (for {
      contact <- extractContactFromHeaders(req.headers)
      pathParams <- req.pathParamsAsCaseClass[DeletePathParams]()(Json.reads[DeletePathParams])
      existingForUser <- lookupOp(contact, None).toDisjunction.toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
      _ = existingForUser.exists(_.Id == pathParams.holidayStopRequestId).toApiGatewayContinueProcessing(ApiGatewayResponse.forbidden("not your holiday stop"))
      _ <- deleteOp(pathParams.holidayStopRequestId).toDisjunction.toApiGatewayOp(s"delete Holiday Stop Request for subscription ${pathParams.subscriptionName.value} of contact $contact")
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  def unsupported(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest("UNSUPPORTED HTTP METHOD")

  def notfound(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.notFound("Not Found")

  def badrequest(message: String)(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest(message)
}
