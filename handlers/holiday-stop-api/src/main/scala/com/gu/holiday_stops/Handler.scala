package com.gu.holiday_stops

import java.io.{InputStream, OutputStream, PrintStream, Serializable}
import java.time.LocalDate
import java.util.UUID
import com.amazonaws.services.lambda.runtime.{Context, LambdaRuntime}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.fulfilmentdates.FulfilmentDatesFetcher
import com.gu.holiday_stops.WireHolidayStopRequest.toHolidayStopRequestDetail
import com.gu.salesforce.SalesforceClient.withAlternateAccessTokenIfPresentInHeaderList
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.HolidayStopRequestId
import com.gu.salesforce.holiday_stops.{SalesforceHolidayStopRequest, SalesforceSFSubscription}
import com.gu.salesforce.{Contact, SalesforceClient, SalesforceHandlerSupport}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ApiGatewayResponse.badRequest
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker.BodyAsString
import com.gu.util.resthttp.Types.ClientFailure
import com.gu.util.resthttp.{HttpOp, JsonHttp}
import com.gu.zuora.subscription._
import com.gu.zuora.{AccessToken, Zuora}
import sttp.client3.{HttpURLConnectionBackend, Identity, SttpBackend}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads, Writes}
import zio.console.Console
import zio.ZIO
import zio.ZIO.debug

import java.lang.{System => JavaSystem}
import scala.util.Try

object Handler extends Logging {

  type SfClient = HttpOp[StringHttpRequest, BodyAsString]

  private val runtime = zio.Runtime.default

  val printStream = new PrintStream(new OutputStream() {
    override def write(b: Int): Unit =
      LambdaRuntime.getLogger.log(Array(b.toByte))

    override def write(b: Array[Byte]): Unit =
      LambdaRuntime.getLogger.log(b)

    override def write(b: Array[Byte], off: Int, len: Int): Unit =
      LambdaRuntime.getLogger.log(b.slice(off, off + len))
  })

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    val configOp = runtime.unsafeRun {
      JavaSystem.setOut(printStream)
      JavaSystem.setErr(printStream)
      operationForEffects(
        RawEffects.response,
        RawEffects.stage,
        GetFromS3.fetchString,
        HttpURLConnectionBackend(),
        UUID.randomUUID().toString,
      ).provideCustomLayer(ConfigurationLive.impl)
    }

    Try(ApiGatewayHandler(LambdaIO(inputStream, outputStream, context))(configOp)).fold(
      { failure =>
        logger.error(failure.getMessage, failure)
        throw failure
      },
      _ => (),
    )
  }

  def operationForEffects(
      response: Request => Response,
      stage: Stage,
      fetchString: StringFromS3,
      backend: SttpBackend[Identity, Any],
      idGenerator: => String,
  ): ZIO[Console with Configuration, Serializable, ApiGatewayOp[Operation]] =
    Configuration.config.map(config =>
      operationForEffectsInternal(
        response,
        stage,
        fetchString,
        backend,
        idGenerator,
        config,
      ),
    )

  private def operationForEffectsInternal(
      response: Request => Response,
      stage: Stage,
      fetchString: StringFromS3,
      backend: SttpBackend[Identity, Any],
      idGenerator: => String,
      config: Config,
  ): ApiGatewayOp[Operation] = {
    for {
      sfClient <- SalesforceClient(
        response,
        config.sfConfig,
        shouldExposeSalesforceErrorMessageInClientFailure = true,
      ).value.toDisjunction.toApiGatewayOp("authenticate with SalesForce")
    } yield Operation.noHealthcheck(
      request => // checking connectivity to SF is sufficient healthcheck so no special steps required
        validateRequestAndCreateSteps(
          request,
          getAccessTokenFromZuora(config, backend),
          getSubscriptionFromZuora(config, backend),
          getAccountFromZuora(config, backend),
          idGenerator,
          FulfilmentDatesFetcher(fetchString, Stage()),
          PreviewPublications.preview,
        )(
          request,
          sfClient.setupRequest(withAlternateAccessTokenIfPresentInHeaderList(request.headers)),
        ),
    )
  }

  private def validateRequestAndCreateSteps(
      request: ApiGatewayRequest,
      getAccessToken: () => Either[ApiFailure, AccessToken],
      getSubscription: (AccessToken, SubscriptionName) => Either[ApiFailure, Subscription],
      getAccount: (AccessToken, String) => Either[ApiFailure, ZuoraAccount],
      idGenerator: => String,
      fulfilmentDatesFetcher: FulfilmentDatesFetcher,
      previewPublications: (String, String, String) => Either[ApiFailure, PreviewPublicationsResponse] = null, // FIXME
  ) = {
    (for {
      httpMethod <- validateMethod(request.httpMethod)
      path <- validatePath(request.path)
    } yield createSteps(
      httpMethod,
      splitPath(path),
      getAccessToken,
      getSubscription,
      getAccount,
      idGenerator,
      fulfilmentDatesFetcher,
      previewPublications,
    )).fold(
      { errorMessage: String =>
        badrequest(errorMessage) _
      },
      identity,
    )
  }

  private def validateMethod(method: Option[String]): Either[String, String] = {
    method match {
      case Some(method) => Right(method)
      case None => Left("Http method is required")
    }
  }

  private def validatePath(path: Option[String]): Either[String, String] = {
    path match {
      case Some(method) => Right(method)
      case None => Left("Path is required")
    }
  }

  private def createSteps(
      httpMethod: String,
      path: List[String],
      getAccessToken: () => Either[ApiFailure, AccessToken],
      getSubscription: (AccessToken, SubscriptionName) => Either[ApiFailure, Subscription],
      getAccount: (AccessToken, String) => Either[ApiFailure, ZuoraAccount],
      idGenerator: => String,
      fulfilmentDatesFetcher: FulfilmentDatesFetcher,
      previewPublications: (String, String, String) => Either[ApiFailure, PreviewPublicationsResponse] = null, // FIXME
  ) = {
    path match {
      case "potential" :: _ :: Nil =>
        httpMethod match {
          case "GET" => stepsForPotentialHolidayStop(getAccessToken, getSubscription, getAccount, previewPublications) _
          case _ => unsupported _
        }
      case "hsr" :: Nil =>
        httpMethod match {
          case "POST" => stepsToCreate(getAccessToken, getSubscription, getAccount) _
          case _ => unsupported _
        }
      case "bulk-hsr" :: Nil =>
        httpMethod match {
          case "POST" => stepsToBulkCreate(getAccessToken, getSubscription, getAccount) _
          case _ => unsupported _
        }
      case "hsr" :: _ :: Nil =>
        httpMethod match {
          case "GET" => stepsToListExisting(getAccessToken, getSubscription, getAccount, fulfilmentDatesFetcher) _
          case _ => unsupported _
        }
      case "hsr" :: _ :: "cancel" :: Nil =>
        httpMethod match {
          case "POST" => stepsToCancel(idGenerator) _
          case "GET" => stepsToGetCancellationDetails(idGenerator) _
          case _ => unsupported _
        }
      case "hsr" :: _ :: _ :: Nil =>
        httpMethod match {
          case "PATCH" => stepsToAmend(getAccessToken, getSubscription, getAccount) _
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
    SalesforceHandlerSupport
      .extractContactFromHeaders(headers.getOrElse(Map.empty).toList)
      .toApiGatewayOp(error =>
        ApiGatewayResponse.badRequest(
          error.message,
        ),
      )

  private def exposeSfErrorMessageIn500ApiResponse[A <: Product](
      action: String,
      inputThatCausedError: Option[A] = None,
  ): ClientFailure => ApiResponse = (error: ClientFailure) => {
    logger.error(s"Failed to $action using input $inputThatCausedError: $error")
    ApiGatewayResponse.messageResponse("500", error.message)
  }

  case class PotentialHolidayStopsPathParams(subscriptionName: SubscriptionName)

  case class PotentialHolidayStopsQueryParams(
      startDate: LocalDate,
      endDate: LocalDate,
  )

  // FIXME: Temporary test in production to validate migration to https://github.com/guardian/invoicing-api/pull/23
  // FIXME: Make sure to add .filter(_.price > 0.0) if it ever replaces old potential endpoint
  import scala.concurrent.{ExecutionContext, Future}
  import java.util.concurrent.Executors
  private val ecForTestInProd = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor)
  private def testInProdPreviewPublications(
      previewPublications: (String, String, String) => Either[ApiFailure, PreviewPublicationsResponse],
      subscription: Subscription,
      queryParams: PotentialHolidayStopsQueryParams,
      potentialHolidayStops: List[PotentialHolidayStop],
      nextInvoiceDateAfterToday: LocalDate,
  ): Future[_] = Future {
    lazy val testCase =
      s"${subscription.subscriptionNumber}?startDate=${queryParams.startDate}&endDate=${queryParams.endDate}"

    (previewPublications(subscription.subscriptionNumber, queryParams.startDate.toString, queryParams.endDate.toString)
      .map { actual =>
        val actualPotentialHolidayStops =
          actual.publicationsWithinRange
            .filter(
              _.price > 0.0,
            ) // invoicing-api/preview endpoint is general and calculates the price of each publication (even if it is 0)
            .map(pub => PotentialHolidayStop(pub.publicationDate, Credit(-pub.price, pub.nextInvoiceDate)))
            .sortBy(_.publicationDate)

        val actualNextInvoiceDateAfterToday = actual.nextInvoiceDateAfterToday

        if (
          (potentialHolidayStops == actualPotentialHolidayStops) && (nextInvoiceDateAfterToday == actualNextInvoiceDateAfterToday)
        ) {
          // 1logger.info("testInProdPreviewPublications OK")
        } else {
          logger.error(
            s"testInProdPreviewPublications failed $testCase because $potentialHolidayStops =/= $actualPotentialHolidayStops or $nextInvoiceDateAfterToday =/= $actualNextInvoiceDateAfterToday",
          )
        }
      })
      .left
      .map { e =>
        logger.error(s"testInProdPreviewPublications failed $testCase because invoicing-api error: $e")
      }
  }(ecForTestInProd)

  def stepsForPotentialHolidayStop(
      getAccessToken: () => Either[ApiFailure, AccessToken],
      getSubscription: (AccessToken, SubscriptionName) => Either[ApiFailure, Subscription],
      getAccount: (AccessToken, String) => Either[ApiFailure, ZuoraAccount],
      previewPublications: (String, String, String) => Either[ApiFailure, PreviewPublicationsResponse] = null, // FIXME
  )(req: ApiGatewayRequest, unused: SfClient): ApiResponse = {
    implicit val reads: Reads[PotentialHolidayStopsQueryParams] = Json.reads[PotentialHolidayStopsQueryParams]
    (for {
      pathParams <- req.pathParamsAsCaseClass[PotentialHolidayStopsPathParams]()(
        Json.reads[PotentialHolidayStopsPathParams],
      )
      queryParams <- req.queryParamsAsCaseClass[PotentialHolidayStopsQueryParams]()
      accessToken <- getAccessToken()
        .toApiGatewayOp(s"get zuora access token")
      subscription <- getSubscription(accessToken, pathParams.subscriptionName)
        .toApiGatewayOp(s"get subscription ${pathParams.subscriptionName}")
      account <- getAccount(accessToken, subscription.accountNumber)
        .toApiGatewayOp(s"get account ${subscription.accountNumber}")
      subscriptionData <- SubscriptionData(subscription, account)
        .toApiGatewayOp(s"building SubscriptionData")
      issuesData = subscriptionData.issueDataForPeriod(queryParams.startDate, queryParams.endDate)
      potentialHolidayStops = issuesData.map { issueData =>
        PotentialHolidayStop(
          issueData.issueDate,
          Credit(issueData.credit, issueData.nextBillingPeriodStartDate),
        )
      }
      nextInvoiceDateAfterToday = subscriptionData
        .issueDataForPeriod(MutableCalendar.today.minusDays(7), MutableCalendar.today.plusMonths(2))
        .filter(_.nextBillingPeriodStartDate.isAfter(MutableCalendar.today))
        .minBy(_.nextBillingPeriodStartDate)(Ordering.by(_.toEpochDay))
        .nextBillingPeriodStartDate
      _ = testInProdPreviewPublications(
        previewPublications,
        subscription,
        queryParams,
        potentialHolidayStops,
        nextInvoiceDateAfterToday,
      ) // FIXME
    } yield ApiGatewayResponse(
      "200",
      PotentialHolidayStopsResponse(nextInvoiceDateAfterToday, potentialHolidayStops),
    )).apiResponse
  }

  case class ListExistingPathParams(subscriptionName: SubscriptionName)

  def stepsToListExisting(
      getAccessToken: () => Either[ApiFailure, AccessToken],
      getSubscription: (AccessToken, SubscriptionName) => Either[ApiFailure, Subscription],
      getAccount: (AccessToken, String) => Either[ApiFailure, ZuoraAccount],
      fulfilmentDatesFetcher: FulfilmentDatesFetcher,
  )(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp =
      SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))

    val extractSubNameOp: ApiGatewayOp[SubscriptionName] =
      req.pathParamsAsCaseClass[ListExistingPathParams]()(Json.reads[ListExistingPathParams]).map(_.subscriptionName)

    (for {
      contact <- extractContactFromHeaders(req.headers)
      subName <- extractSubNameOp
      usersHolidayStopRequests <- lookupOp(
        contact,
        Some(subName),
        Some(MutableCalendar.today.minusMonths(6)),
      ).toDisjunction
        .toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
      accessToken <- getAccessToken()
        .toApiGatewayOp(s"get zuora access token")
      subscription <- getSubscription(accessToken, subName)
        .toApiGatewayOp(s"get subscription $subName")
      account <- getAccount(accessToken, subscription.accountNumber)
        .toApiGatewayOp(s"get account ${subscription.accountNumber}")
      subscriptionData <- SubscriptionData(subscription, account)
        .toApiGatewayOp(s"extract subscription data from subscription")
      fulfilmentDates <- fulfilmentDatesFetcher
        .getFulfilmentDates(
          subscriptionData.productType,
          MutableCalendar.today,
        )
        .toApiGatewayOp("get fulfilment dates for subscription")
      response <- GetHolidayStopRequests(
        usersHolidayStopRequests,
        subscriptionData,
        fulfilmentDates,
        subscription.fulfilmentStartDate,
      ).toApiGatewayOp("calculate holidays stops specifics")
    } yield ApiGatewayResponse("200", response)).apiResponse
  }

  def stepsToCreate(
      getAccessToken: () => Either[ApiFailure, AccessToken],
      getSubscription: (AccessToken, SubscriptionName) => Either[ApiFailure, Subscription],
      getAccount: (AccessToken, String) => Either[ApiFailure, ZuoraAccount],
  )(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse =
    stepsToCreate(
      getAccessToken,
      getSubscription,
      getAccount,
      req.bodyAsCaseClass[HolidayStopRequestPartial](),
    )(req, sfClient)

  def stepsToBulkCreate(
      getAccessToken: () => Either[ApiFailure, AccessToken],
      getSubscription: (AccessToken, SubscriptionName) => Either[ApiFailure, Subscription],
      getAccount: (AccessToken, String) => Either[ApiFailure, ZuoraAccount],
  )(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse =
    stepsToCreate(
      getAccessToken,
      getSubscription,
      getAccount,
      req.bodyAsCaseClass[BulkHolidayStopRequestPartial](),
    )(req, sfClient)

  private def stepsToCreate(
      getAccessToken: () => Either[ApiFailure, AccessToken],
      getSubscription: (AccessToken, SubscriptionName) => Either[ApiFailure, Subscription],
      getAccount: (AccessToken, String) => Either[ApiFailure, ZuoraAccount],
      requestBodyOp: ApiGatewayOp[HolidayStopRequestPartialTrait],
  )(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val verifyContactOwnsSubOp =
      SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact(sfClient.wrapWith(JsonHttp.getWithParams))
    val createOp = SalesforceHolidayStopRequest.CreateHolidayStopRequestWithDetail(sfClient.wrapWith(JsonHttp.post))

    (for {
      requestBody <- requestBodyOp
      contact <- extractContactFromHeaders(req.headers)
      maybeMatchingSfSub <- verifyContactOwnsSubOp(requestBody.subscriptionName, contact).toDisjunction.toApiGatewayOp(
        s"fetching subscriptions for contact $contact",
      )
      matchingSfSub <- maybeMatchingSfSub.toApiGatewayOp(
        s"contact $contact does not own ${requestBody.subscriptionName.value}",
      )
      accessToken <- getAccessToken().toApiGatewayOp(s"get zuora access token")
      subscription <- getSubscription(accessToken, requestBody.subscriptionName)
        .toApiGatewayOp(s"get subscription ${requestBody.subscriptionName}")
      account <- getAccount(accessToken, subscription.accountNumber)
        .toApiGatewayOp(s"get account ${subscription.accountNumber}")
      issuesData <- SubscriptionData(subscription, account)
        .map(_.issueDataForPeriod(requestBody.startDate, requestBody.endDate))
        .toApiGatewayOp(s"calculating publication dates")
      createBody = CreateHolidayStopRequestWithDetail.buildBody(
        requestBody.startDate,
        requestBody.endDate,
        issuesData,
        matchingSfSub,
        requestBody.bulkSuspensionReason,
      )
      _ <- createOp(createBody).toDisjunction.toApiGatewayOp(
        exposeSfErrorMessageIn500ApiResponse(
          s"create new Holiday Stop Request for subscription ${requestBody.subscriptionName} (contact $contact)",
          Some(createBody),
        ),
      )
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  case class CancelHolidayStopsPathParams(subscriptionName: SubscriptionName)
  case class CancelHolidayStopsQueryParams(
      effectiveCancellationDate: Option[LocalDate],
      autoRefundGuid: Option[String] = None,
  )

  def stepsToCancel(
      idGenerator: => String,
  )(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {
    val sfClientGetWithParams = sfClient.wrapWith(JsonHttp.getWithParams)
    val lookupOpHolidayStopsOp = LookupByContactAndOptionalSubscriptionName(sfClientGetWithParams)
    val updateRequestDetailOp = CancelHolidayStopRequestDetail(sfClient.wrapWith(JsonHttp.post))

    (for {
      pathParams <- req.pathParamsAsCaseClass[CancelHolidayStopsPathParams]()(Json.reads[CancelHolidayStopsPathParams])
      queryParams <- req.queryParamsAsCaseClass[CancelHolidayStopsQueryParams]()(
        Json.reads[CancelHolidayStopsQueryParams],
      )
      effectiveCancellationDate <- queryParams.effectiveCancellationDate
        .toApiGatewayOp("effectiveCancellationDate query string parameter is required")
      contact <- extractContactFromHeaders(req.headers)
      holidayStopRequests <- lookupOpHolidayStopsOp(contact, Some(pathParams.subscriptionName), None).toDisjunction
        .toApiGatewayOp(
          s"lookup Holiday Stop Requests for contact $contact and subscription ${pathParams.subscriptionName}",
        )
      holidayStopRequestDetailToUpdate = HolidayStopSubscriptionCancellation(
        effectiveCancellationDate,
        holidayStopRequests,
        queryParams.autoRefundGuid,
      )
      cancelBody = CancelHolidayStopRequestDetail.buildBody(holidayStopRequestDetailToUpdate, idGenerator)
      _ <- updateRequestDetailOp(cancelBody).toDisjunction
        .toApiGatewayOp(
          exposeSfErrorMessageIn500ApiResponse(
            s"cancel holiday stop request details: ${holidayStopRequestDetailToUpdate.map(_.Id.value).mkString(",")} " +
              s"(contact $contact)",
            Some(cancelBody),
          ),
        )
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  case class GetCancellationDetails(publicationsToRefund: List[HolidayStopRequestsDetail])
  implicit val writesGetCancellationDetails: Writes[GetCancellationDetails] = Json.writes[GetCancellationDetails]

  def stepsToGetCancellationDetails(idGenerator: => String)(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {
    val sfClientGetWithParams = sfClient.wrapWith(JsonHttp.getWithParams)
    val lookupOpHolidayStopsOp = LookupByContactAndOptionalSubscriptionName(sfClientGetWithParams)

    (for {
      pathParams <- req.pathParamsAsCaseClass[CancelHolidayStopsPathParams]()(Json.reads[CancelHolidayStopsPathParams])
      queryParams <- req.queryParamsAsCaseClass[CancelHolidayStopsQueryParams]()(
        Json.reads[CancelHolidayStopsQueryParams],
      )
      effectiveCancellationDate <- queryParams.effectiveCancellationDate
        .toApiGatewayOp("effectiveCancellationDate query string parameter is required")
      contact <- extractContactFromHeaders(req.headers)
      holidayStopRequests <- lookupOpHolidayStopsOp(contact, Some(pathParams.subscriptionName), None).toDisjunction
        .toApiGatewayOp(
          s"lookup Holiday Stop Requests for contact $contact and subscription ${pathParams.subscriptionName}",
        )
      holidayStopRequestDetailToRefund = HolidayStopSubscriptionCancellation(
        effectiveCancellationDate,
        holidayStopRequests,
      )

      response = GetCancellationDetails(holidayStopRequestDetailToRefund.map(toHolidayStopRequestDetail))
    } yield ApiGatewayResponse("200", response)).apiResponse
  }

  case class SpecificHolidayStopRequestPathParams(
      subscriptionName: SubscriptionName,
      holidayStopRequestId: HolidayStopRequestId,
  )
  implicit val readsSpecificHolidayStopRequestPathParams: Reads[SpecificHolidayStopRequestPathParams] =
    Json.reads[SpecificHolidayStopRequestPathParams]

  def stepsToAmend(
      getAccessToken: () => Either[ApiFailure, AccessToken],
      getSubscription: (AccessToken, SubscriptionName) => Either[ApiFailure, Subscription],
      getAccount: (AccessToken, String) => Either[ApiFailure, ZuoraAccount],
  )(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp =
      SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))
    val amendOp = SalesforceHolidayStopRequest.AmendHolidayStopRequest(sfClient.wrapWith(JsonHttp.post))

    (for {
      requestBody <- req.bodyAsCaseClass[HolidayStopRequestPartial]()
      contact <- extractContactFromHeaders(req.headers)
      pathParams <- req.pathParamsAsCaseClass[SpecificHolidayStopRequestPathParams]()
      allExisting <- lookupOp(contact, Some(pathParams.subscriptionName), None).toDisjunction
        .toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
      existingPublicationsThatWereToBeStopped <- allExisting
        .find(_.Id == pathParams.holidayStopRequestId)
        .flatMap(_.Holiday_Stop_Request_Detail__r.map(_.records))
        .toApiGatewayOp(s"contact $contact does not own ${requestBody.subscriptionName.value}")
      accessToken <- getAccessToken().toApiGatewayOp(s"get zuora access token")
      subscription <- getSubscription(accessToken, requestBody.subscriptionName)
        .toApiGatewayOp(s"get subscription ${requestBody.subscriptionName}")
      account <- getAccount(accessToken, subscription.accountNumber)
        .toApiGatewayOp(s"get account ${subscription.accountNumber}")
      issuesData <- SubscriptionData(subscription, account)
        .map(_.issueDataForPeriod(requestBody.startDate, requestBody.endDate))
        .toApiGatewayOp(s"calculating publication dates")
      amendBody <- AmendHolidayStopRequest
        .buildBody(
          pathParams.holidayStopRequestId,
          requestBody.startDate,
          requestBody.endDate,
          issuesData,
          existingPublicationsThatWereToBeStopped,
        )
        .toApiGatewayOp(message => badRequest(s"build body for holiday stop request: $message"))
      _ <- amendOp(amendBody).toDisjunction.toApiGatewayOp(
        exposeSfErrorMessageIn500ApiResponse(
          s"amend Holiday Stop Request for subscription ${requestBody.subscriptionName} (contact $contact)",
          Some(amendBody),
        ),
      )
    } yield ApiGatewayResponse.successfulExecution).apiResponse

  }

  def getSubscriptionFromZuora(
      config: Config,
      backend: SttpBackend[Identity, Any],
  )(
      accessToken: AccessToken,
      subscriptionName: SubscriptionName,
  ): Either[ApiFailure, Subscription] =
    Zuora.subscriptionGetResponse(config.zuoraConfig, accessToken, backend)(subscriptionName)

  def getAccountFromZuora(
      config: Config,
      backend: SttpBackend[Identity, Any],
  )(
      accessToken: AccessToken,
      accountKey: String,
  ): Either[ApiFailure, ZuoraAccount] = Zuora.accountGetResponse(config.zuoraConfig, accessToken, backend)(accountKey)

  def getAccessTokenFromZuora(
      config: Config,
      backend: SttpBackend[Identity, Any],
  )(): Either[ApiFailure, AccessToken] = Zuora.accessTokenGetResponse(config.zuoraConfig, backend)

  def stepsToWithdraw(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp =
      SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))
    val withdrawOp = SalesforceHolidayStopRequest.WithdrawHolidayStopRequest(sfClient.wrapWith(JsonHttp.patch))

    (for {
      contact <- extractContactFromHeaders(req.headers)
      pathParams <- req.pathParamsAsCaseClass[SpecificHolidayStopRequestPathParams]()
      existingForUser <- lookupOp(contact, None, None).toDisjunction.toApiGatewayOp(
        s"lookup Holiday Stop Requests for contact $contact",
      )
      hsr <- existingForUser
        .find(_.Id == pathParams.holidayStopRequestId)
        .toApiGatewayContinueProcessing(ApiGatewayResponse.forbidden("not your holiday stop"))
      _ = hsr.Holiday_Stop_Request_Detail__r
        .exists(_.records.exists(_.Is_Actioned__c))
        .toApiGatewayContinueProcessing(
          ApiGatewayResponse.forbidden("can't withdraw holiday stop with any actioned items"),
        ) // FIXME: Does this do anyting?
      _ <- withdrawOp(pathParams.holidayStopRequestId).toDisjunction.toApiGatewayOp(
        exposeSfErrorMessageIn500ApiResponse(
          s"withdraw Holiday Stop Request for subscription ${pathParams.subscriptionName.value} of contact $contact",
        ),
      )
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  def unsupported(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest("UNSUPPORTED HTTP METHOD")

  def notfound(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.notFound("Not Found")

  def badrequest(
      message: String,
  )(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest(message)
}
