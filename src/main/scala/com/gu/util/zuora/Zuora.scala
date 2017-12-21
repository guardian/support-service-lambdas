package com.gu.util.zuora

import com.gu.stripeCustomerSourceUpdated.StripeCustomerId
import com.gu.util.ZuoraRestConfig
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.Zuora.Query
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraWriters._
import okhttp3.{Request, Response}
import org.joda.time.LocalDate
import play.api.libs.json._

import scala.annotation.tailrec
import scala.util.{Failure, Success, Try}
import scalaz.{-\/, EitherT, NonEmptyList, \/-}
object Zuora {

  import ZuoraRestRequestMaker._

  case class ZuoraDeps(response: Request => Response, config: ZuoraRestConfig)

  def getAccountSummary(accountId: String): WithDepsFailableOp[ZuoraDeps, AccountSummary] =
    get[AccountSummary](s"accounts/$accountId/summary")

  def getInvoiceTransactions(accountId: String): WithDepsFailableOp[ZuoraDeps, InvoiceTransactionSummary] =
    get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId")

  def cancelSubscription(subscription: SubscriptionId, cancellationDate: LocalDate): WithDepsFailableOp[ZuoraDeps, Unit] =
    put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")

  def updateCancellationReason(subscription: SubscriptionId): WithDepsFailableOp[ZuoraDeps, Unit] =
    put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}")

  def disableAutoPay(accountId: String): WithDepsFailableOp[ZuoraDeps, Unit] =
    put(AccountUpdate(autoPay = false), s"accounts/$accountId")

  case class Query(queryString: String)
  case class QueryLocator(value: String) extends AnyVal

  case class QueryResult[QUERYRECORD](records: List[QUERYRECORD], size: Int, done: Boolean, queryLocator: Option[QueryLocator])

  implicit val queryW: Writes[Query] = Json.writes[Query]

  implicit val queryLocator: Format[QueryLocator] =
    Format[QueryLocator](JsPath.read[String].map(QueryLocator.apply), (o: QueryLocator) => JsString(o.value))

  implicit def queryResultR[QUERYRECORD : Reads]: Reads[QueryResult[QUERYRECORD]] = Json.reads[QueryResult[QUERYRECORD]]


  case class QueryMoreReq(queryLocator: QueryLocator)
  implicit val wQueryMoreReq: Writes[QueryMoreReq] = Json.writes[QueryMoreReq]

  // https://www.zuora.com/developer/api-reference/#operation/Action_POSTquery
  def query[QUERYRECORD : Reads](query: Query): WithDepsFailableOp[ZuoraDeps, QueryResult[QUERYRECORD]] =
    post(query, s"action/query")


}

object ZuoraQueryPaymentMethod {

  case class SecondTokenId(value: String) extends AnyVal
  case class PaymentMethodId(value: String) extends AnyVal
  case class AccountId(value: String) extends AnyVal
  case class CreditCardExpirationMonth(value: Int) extends AnyVal
  case class CreditCardExpirationYear(value: Int) extends AnyVal
  case class CreditCardMaskNumber(value: String) extends AnyVal
  case class PaymentMethodFields(
    Id: PaymentMethodId,
    AccountId: AccountId
  )
  implicit val fPaymentMethodId: Format[PaymentMethodId] =
    Format[PaymentMethodId](JsPath.read[String].map(PaymentMethodId.apply), (o: PaymentMethodId) => JsString(o.value))

  implicit val fAccountId: Format[AccountId] =
    Format[AccountId](JsPath.read[String].map(AccountId.apply), (o: AccountId) => JsString(o.value))

  implicit val QueryRecordR: Format[PaymentMethodFields] = Json.format[PaymentMethodFields]

  case class AccountPaymentMethodIds(accountId: AccountId, paymentMethodIds: NonEmptyList[PaymentMethodId])

  def getPaymentMethodForStripeCustomer(customerId: StripeCustomerId): WithDepsFailableOp[Zuora.ZuoraDeps, AccountPaymentMethodIds] = {

    val query =
      s"""SELECT Id, AccountId
         | FROM PaymentMethod
         |  where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = 'TokenId' AND SecondTokenId = '${customerId.value}'""".stripMargin

    EitherT(Zuora.query[PaymentMethodFields](Query(query)).run.map(_.flatMap { result =>
      result.records.groupBy(_.AccountId).toList match {
        case (account, first :: rest) :: Nil =>
          \/-(AccountPaymentMethodIds(account, NonEmptyList(first, rest: _*).map(_.Id)))
        case _ =>
          -\/(ApiGatewayResponse.internalServerError(s"no results for the customer token: $result"))
      }
    }))

  }

}