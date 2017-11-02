package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.Context
import com.github.nscala_time.time.OrderingImplicits._
import com.gu.util.ApiGatewayResponse._
import com.gu.util.Auth._
import com.gu.util._
import com.gu.util.ResponseModels.ApiResponse
import com.gu.util.ZuoraModels._
import java.io._
import org.joda.time.LocalDate
import play.api.libs.json._
import scala.util.{ Failure, Success }
import scalaz.Scalaz._
import scalaz.{ -\/, \/, \/- }

object AutoCancelHandler extends App with Logging {

  /* Entry point for our Lambda - this takes the input event from API Gateway,
  extracts the JSON body and then hands over to cancellationAttemptForPayload for the 'real work'.
  */
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val stage = System.getenv("Stage")
    logger.info(s"Auto-cancel Lambda is starting up in $stage")
    val response = for {
      config <- loadConfig(stage)
      apiGatewayRequest <- parseApiGatewayInput(inputStream)
      auth <- authenticateCallout(apiGatewayRequest.requestAuth, config.trustedApiConfig)
      _ = logger.info("Authenticated request successfully...")
      _ = logger.info(s"Body from Zuora was: ${apiGatewayRequest.body}, onlyDirectDebit queryString was: ${apiGatewayRequest.queryStringParameters.onlyCancelDirectDebit}")
      autoCancelCallout <- parseBody(apiGatewayRequest)
      _ <- filterInvalidAccount(autoCancelCallout, onlyCancelDirectDebit = apiGatewayRequest.onlyCancelDirectDebit)
    } yield cancellationAttemptForPayload(config.zuoraRestConfig, autoCancelCallout)
    outputForAPIGateway(outputStream, response.fold(identity, identity))
  }

  case class RequestAuth(apiClientId: String, apiToken: String)
  case class URLParams(apiClientId: String, apiToken: String, onlyCancelDirectDebit: Option[Boolean])

  /* Using query strings because for Basic Auth to work Zuora requires us to return a WWW-Authenticate
    header, and API Gateway does not support this header (returns x-amzn-Remapped-WWW-Authenticate instead)
    */
  case class ApiGatewayRequest(queryStringParameters: URLParams, body: String) {
    def parsedBody: JsResult[AutoCancelCallout] = Json.fromJson[AutoCancelCallout](Json.parse(body))
    def onlyCancelDirectDebit: Boolean = queryStringParameters.onlyCancelDirectDebit.contains(true)
    def requestAuth: RequestAuth = RequestAuth(queryStringParameters.apiClientId, queryStringParameters.apiToken)
  }

  object URLParams {
    implicit val jf = Json.reads[URLParams]
  }

  object ApiGatewayRequest {
    implicit val jf = Json.reads[ApiGatewayRequest]
  }

  def parseApiGatewayInput(inputStream: InputStream): ApiResponse \/ ApiGatewayRequest = {
    Json.parse(inputStream).validate[ApiGatewayRequest] match {
      case JsSuccess(apiGatewayCallout, _) => \/-(apiGatewayCallout)
      case JsError(error) => {
        logger.error(s"Error when parsing JSON from API Gateway: $error")
        -\/(badRequest)
      }
    }
  }

  def parseBody(apiGatewayRequest: ApiGatewayRequest): ApiResponse \/ AutoCancelCallout = {
    apiGatewayRequest.parsedBody match {
      case JsSuccess(autoCancelCallout, _) => \/-(autoCancelCallout)
      case JsError(error) => {
        logger.error(s"Error when parsing JSON from API Gateway: $error")
        -\/(badRequest)
      }
    }
  }

  def loadConfig(stage: String): ApiResponse \/ Config = {
    Config.load(stage) match {
      case Success(config) => \/-(config)
      case Failure(error) => {
        logger.error(s"Failed to load config: $error")
        -\/(internalServerError("Failed to execute lambda - unable to load configuration from S3"))
      }
    }
  }

  def authenticateCallout(requestAuth: RequestAuth, trustedApiConfig: TrustedApiConfig): ApiResponse \/ Unit = {
    if (credentialsAreValid(requestAuth, trustedApiConfig)) \/-(()) else -\/(unauthorized)
  }

  def filterInvalidAccount(callout: AutoCancelCallout, onlyCancelDirectDebit: Boolean): ApiResponse \/ Unit = {
    for {
      _ <- filterAutoPay(callout)
      _ <- filterDirectDebit(onlyCancelDirectDebit = onlyCancelDirectDebit, nonDirectDebit = callout.nonDirectDebit)
    } yield ()
  }

  def filterAutoPay(callout: AutoCancelCallout): ApiResponse \/ Unit = {
    if (callout.isAutoPay) \/-(()) else -\/(noActionRequired("AutoPay is false"))
  }

  def filterDirectDebit(onlyCancelDirectDebit: Boolean, nonDirectDebit: Boolean) = {
    if (onlyCancelDirectDebit && nonDirectDebit)
      -\/(noActionRequired("it's not direct debit so we will wait longer"))
    else
      \/-(())
  }

  def cancellationAttemptForPayload(zuoraConfig: ZuoraRestConfig, autoCancelCallout: AutoCancelCallout): ApiResponse = {
    val restService = new ZuoraRestService(zuoraConfig)
    autoCancellation(restService, LocalDate.now, autoCancelCallout) match {
      case \/-(_) => {
        logger.info(s"Successfully processed auto-cancellation for ${autoCancelCallout.accountId}")
        successfulExecution
      }
      case -\/(response) => {
        logger.error(s"Failed to process auto-cancellation for ${autoCancelCallout.accountId}: ${response.body}.")
        response
      }
    }
  }

  def autoCancellation(restService: ZuoraRestService, date: LocalDate, autoCancelCallout: AutoCancelCallout): ApiResponse \/ Unit = {
    val accountId = autoCancelCallout.accountId
    logger.info(s"Attempting to perform auto-cancellation on account: ${accountId}")
    for {
      accountSummary <- restService.getAccountSummary(accountId)
      subToCancel <- getSubscriptionToCancel(accountSummary)
      cancellationDate <- getCancellationDateFromInvoices(accountSummary, date)
      updateSubscription <- restService.updateCancellationReason(subToCancel)
      cancelSubscription <- restService.cancelSubscription(subToCancel, cancellationDate)
      disableAutoPay <- restService.disableAutoPay(accountId)
      result <- handleZuoraResults(updateSubscription, cancelSubscription, disableAutoPay)
    } yield result
  }

  def getCancellationDateFromInvoices(accountSummary: AccountSummary, dateToday: LocalDate): ApiResponse \/ LocalDate = {
    val unpaidAndOverdueInvoices = accountSummary.invoices.filter { invoice => invoiceOverdue(invoice, dateToday) }
    if (unpaidAndOverdueInvoices.isEmpty) {
      logger.error(s"Failed to find an unpaid invoice that was overdue. The invoices we got were: ${accountSummary.invoices}")
      noActionRequired("No unpaid and overdue invoices found!").left
    } else {
      logger.info(s"Found at least one unpaid invoices for account: ${accountSummary.basicInfo.id}. Invoice id(s): ${unpaidAndOverdueInvoices.map(_.id)}")
      val earliestDueDate = unpaidAndOverdueInvoices.map(_.dueDate).min
      logger.info(s"Earliest overdue invoice for account ${accountSummary.basicInfo.id} has due date: $earliestDueDate. Setting this as the cancellation date.")
      earliestDueDate.right
    }
  }

  def invoiceOverdue(invoice: Invoice, dateToday: LocalDate): Boolean = {
    if (invoice.balance > 0 && invoice.status == "Posted") {
      val zuoraGracePeriod = 14 // This needs to match with the timeframe for the 3rd payment retry attempt in Zuora
      val invoiceOverdueDate = invoice.dueDate.plusDays(zuoraGracePeriod)
      logger.info(s"Zuora grace period is: $zuoraGracePeriod days. Due date for Invoice id ${invoice.id} is ${invoice.dueDate}, so it will be considered overdue on: $invoiceOverdueDate.")
      dateToday.isEqual(invoiceOverdueDate) || dateToday.isAfter(invoiceOverdueDate)
    } else false
  }

  def getSubscriptionToCancel(accountSummary: AccountSummary): ApiResponse \/ SubscriptionSummary = {
    val activeSubs = accountSummary.subscriptions.filter(_.status == "Active")
    activeSubs match {
      case sub :: Nil => {
        logger.info(s"Determined that we should cancel SubscriptionId: ${sub.id} (for AccountId: ${accountSummary.basicInfo.id})")
        sub.right
      }
      case Nil => {
        logger.error(s"Didn't find any active subscriptions. The full list of subs for this account was: ${accountSummary.subscriptions}")
        noActionRequired("No Active subscriptions to cancel!").left
      }
      case subs => {
        // This should be a pretty rare scenario, because the Billing Account to Sub relationship is (supposed to be) 1-to-1
        logger.error(s"More than one subscription is Active on account: ${accountSummary.basicInfo.id}. Subscription ids are: ${activeSubs.map(_.id)}")
        noActionRequired("More than one active sub found!").left // Don't continue because we don't know which active sub to cancel
      }
    }
  }

  def handleZuoraResults(
    updateSubscriptionResult: UpdateSubscriptionResult,
    cancelSubscriptionResult: CancelSubscriptionResult,
    updateAccountResult: UpdateAccountResult
  ): ApiResponse \/ Unit = {
    if (!updateSubscriptionResult.success || !cancelSubscriptionResult.success || !updateAccountResult.success) {
      logger.error(s"Zuora rejected one (or more) of our calls during autoCancellation")
      internalServerError("Received at least one failure result from Zuora during autoCancellation").left
    } else {
      logger.info("All Zuora calls completed successfully")
        .right
    }
  }

}