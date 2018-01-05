package com.gu.util.zuora

import com.gu.stripeCustomerSourceUpdated.{ StripeCustomerId, _ }
import com.gu.util.ZuoraRestConfig
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.Zuora.Query
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraQueryPaymentMethod.{ AccountId, PaymentMethodId }
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraWriters._
import com.gu.util.zuora.ZuoraRestRequestMaker._
import okhttp3.{ Request, Response }
import org.joda.time.LocalDate
import play.api.libs.functional.syntax._
import play.api.libs.json._

import scalaz.{ -\/, NonEmptyList, \/-, _ }

case class ZuoraDeps(response: Request => Response, config: ZuoraRestConfig)

object Zuora {

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
    Format[QueryLocator](JsPath.read[String].map(QueryLocator.apply), Writes { (o: QueryLocator) => JsString(o.value) })

  implicit def queryResultR[QUERYRECORD: Reads]: Reads[QueryResult[QUERYRECORD]] = (
    (JsPath \ "records").read[List[QUERYRECORD]] and
    (JsPath \ "size").read[Int] and
    (JsPath \ "done").read[Boolean] and
    (JsPath \ "queryLocator").readNullable[QueryLocator]
  ).apply(QueryResult.apply[QUERYRECORD] _)

  case class QueryMoreReq(queryLocator: QueryLocator)

  implicit val wQueryMoreReq: Writes[QueryMoreReq] = Json.writes[QueryMoreReq]

  // https://www.zuora.com/developer/api-reference/#operation/Action_POSTquery
  def query[QUERYRECORD: Reads](query: Query): WithDepsFailableOp[ZuoraDeps, QueryResult[QUERYRECORD]] =
    post(query, s"action/query")

}

object SetDefaultPaymentMethod {

  case class SetDefaultPaymentMethod(paymentMethodId: PaymentMethodId)

  implicit val writes = new Writes[SetDefaultPaymentMethod] {
    def writes(subscriptionUpdate: SetDefaultPaymentMethod) = Json.obj(
      "DefaultPaymentMethodId" -> subscriptionUpdate.paymentMethodId
    )
  }

  def setDefaultPaymentMethod(accountId: AccountId, paymentMethodId: PaymentMethodId): WithDepsFailableOp[ZuoraDeps, Unit] =
    put(SetDefaultPaymentMethod(paymentMethodId), s"object/account/${accountId.value}")

}

object CreatePaymentMethod {

  case class CreateStripePaymentMethod(
    accountId: AccountId,
    cardId: StripeSourceId,
    customerId: StripeCustomerId,
    cardCountry: StripeCountry,
    last4: StripeLast4,
    expiration: StripeExpiry,
    creditCardType: CreditCardType
  )

  sealed abstract class CreditCardType(val value: String)
  object CreditCardType {

    case object AmericanExpress extends CreditCardType("AmericanExpress")
    case object Discover extends CreditCardType("Discover")
    case object MasterCard extends CreditCardType("MasterCard")
    case object Visa extends CreditCardType("Visa")

  }

  implicit val writes = new Writes[CreateStripePaymentMethod] {
    def writes(command: CreateStripePaymentMethod) = Json.obj(
      "AccountId" -> command.accountId.value,
      "TokenId" -> command.cardId.value,
      "SecondTokenId" -> command.customerId.value,
      "CreditCardCountry" -> command.cardCountry.value,
      "CreditCardNumber" -> command.last4.value,
      "CreditCardExpirationYear" -> command.expiration.exp_month,
      "CreditCardExpirationYear" -> command.expiration.exp_year,
      "CreditCardType" -> command.creditCardType.value,
      "Type" -> "CreditCardReferenceTransaction"
    )
  }

  implicit val reads: Reads[CreatePaymentMethodResult] =
    (JsPath \ "Id").read[PaymentMethodId].map(CreatePaymentMethodResult.apply _)

  case class CreatePaymentMethodResult(id: PaymentMethodId)

  def createPaymentMethod(request: CreateStripePaymentMethod): WithDepsFailableOp[ZuoraDeps, CreatePaymentMethodResult] =
    post[CreateStripePaymentMethod, CreatePaymentMethodResult](request, s"object/payment-method")

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
    Format[PaymentMethodId](JsPath.read[String].map(PaymentMethodId.apply), Writes { (o: PaymentMethodId) => JsString(o.value) })

  implicit val fAccountId: Format[AccountId] =
    Format[AccountId](JsPath.read[String].map(AccountId.apply), Writes { (o: AccountId) => JsString(o.value) })

  implicit val QueryRecordR: Format[PaymentMethodFields] = Json.format[PaymentMethodFields]

  case class AccountPaymentMethodIds(accountId: AccountId, paymentMethodIds: NonEmptyList[PaymentMethodId])

  def getPaymentMethodForStripeCustomer(customerId: StripeCustomerId, sourceId: StripeSourceId): WithDepsFailableOp[ZuoraDeps, AccountPaymentMethodIds] = {
    import com.gu.util.reader.Types._
    val query =
      s"""SELECT Id, AccountId
         | FROM PaymentMethod
         |  where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = '${sourceId.value}' AND SecondTokenId = '${customerId.value}'""".stripMargin

    Zuora.query[PaymentMethodFields](Query(query)).run.map(_.flatMap { result =>
      result.records.groupBy(_.AccountId).toList match {
        case (account, first :: rest) :: Nil =>
          \/-(AccountPaymentMethodIds(account, NonEmptyList(first, rest: _*).map(_.Id)))
        case _ =>
          -\/(ApiGatewayResponse.internalServerError(s"no results for the customer token: $result"))
      }
    }).toEitherT

  }

}