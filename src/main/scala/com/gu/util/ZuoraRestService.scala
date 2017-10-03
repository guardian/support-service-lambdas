package com.gu.util

import com.gu.util.ZuoraModels._
import com.gu.util.ZuoraReaders._
import com.gu.util.ZuoraWriters._
import java.util.concurrent.TimeUnit
import com.gu.util.ResponseModels.ApiResponse
import com.gu.util.ApiGatewayResponse._
import okhttp3._
import org.joda.time.LocalDate
import play.api.libs.json._
import scalaz.Scalaz._
import scalaz.\/

trait ZuoraService {
  def getAccountSummary(accountId: String): ApiResponse \/ AccountSummary
  def getInvoiceTransactions(accountId: String): ApiResponse \/ InvoiceTransactionSummary
}

class ZuoraRestService(config: ZuoraRestConfig) extends ZuoraService with Logging {

  val restClient = new OkHttpClient().newBuilder()
    .readTimeout(15, TimeUnit.SECONDS)
    .build()

  def buildRequest(config: ZuoraRestConfig, route: String): Request.Builder = {
    new Request.Builder()
      .addHeader("apiSecretAccessKey", config.password)
      .addHeader("apiAccessKeyId", config.username)
      .url(s"${config.baseUrl}/$route")
  }

  def convertResponseToCaseClass[T](response: Response)(implicit r: Reads[T]): ApiResponse \/ T = {
    if (response.isSuccessful) {
      val bodyAsJson = Json.parse(response.body.string)
      bodyAsJson.validate[T] match {
        case success: JsSuccess[T] => success.get.right
        case error: JsError => {
          logger.info(s"Failed to convert Zuora response to case case. Response body was: \n ${bodyAsJson}")
          internalServerError("Error when converting Zuora response to case class").left
        }
      }
    } else {
      logger.error(s"Request to Zuora was unsuccessful, the response was: \n $response")
      internalServerError("Request to Zuora was unsuccessful").left
    }
  }

  override def getAccountSummary(accountId: String): ApiResponse \/ AccountSummary = {
    logger.info(s"Getting account summary from Zuora for Account Id: $accountId")
    val request = buildRequest(config, s"accounts/$accountId/summary").get().build()
    val call = restClient.newCall(request)
    val response = call.execute
    convertResponseToCaseClass[AccountSummary](response)
  }

  override def getInvoiceTransactions(accountId: String): ApiResponse \/ InvoiceTransactionSummary = {
    logger.info(s"Getting itemised invoices from Zuora for Account Id: $accountId")
    val request = buildRequest(config, s"transactions/invoices/accounts/$accountId").get().build()
    val call = restClient.newCall(request)
    val response = call.execute
    convertResponseToCaseClass[InvoiceTransactionSummary](response)
  }

  def cancelSubscription(subscription: SubscriptionSummary, cancellationDate: LocalDate): ApiResponse \/ CancelSubscriptionResult = {
    val subscriptionCancellation = SubscriptionCancellation(cancellationDate)
    val body = RequestBody.create(MediaType.parse("application/json"), Json.toJson(subscriptionCancellation).toString)
    val request = buildRequest(config, s"subscriptions/${subscription.id}/cancel").put(body).build()
    val call = restClient.newCall(request)
    logger.info(s"Attempting to Cancel Subscription, using the following command: $subscriptionCancellation")
    val response = call.execute
    convertResponseToCaseClass[CancelSubscriptionResult](response)
  }

  def updateCancellationReason(subscription: SubscriptionSummary): ApiResponse \/ UpdateSubscriptionResult = {
    val subscriptionUpdate = SubscriptionUpdate("System AutoCancel")
    val body = RequestBody.create(MediaType.parse("application/json"), Json.toJson(subscriptionUpdate).toString)
    val request = buildRequest(config, s"subscriptions/${subscription.id}").put(body).build()
    val call = restClient.newCall(request)
    logger.info(s"Attempting to update Subscription cancellation reason with the following command: $subscriptionUpdate")
    val response = call.execute
    convertResponseToCaseClass[UpdateSubscriptionResult](response)
  }

  def disableAutoPay(accountId: String): ApiResponse \/ UpdateAccountResult = {
    val accountUpdate = AccountUpdate(autoPay = false)
    val body = RequestBody.create(MediaType.parse("application/json"), Json.toJson(accountUpdate).toString)
    val request = buildRequest(config, s"accounts/${accountId}").put(body).build()
    val call = restClient.newCall(request)
    logger.info(s"Attempting to disable autoPay with the following command: $accountUpdate")
    val response = call.execute
    convertResponseToCaseClass[UpdateAccountResult](response)
  }

}

