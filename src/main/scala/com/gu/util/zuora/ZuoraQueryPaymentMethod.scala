package com.gu.util.zuora

import com.gu.stripeCustomerSourceUpdated.{ StripeCustomerId, StripeSourceId }
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.ZuoraQuery.Query
import com.gu.util.zuora.ZuoraRestRequestMaker.logger
import play.api.libs.json._

import scalaz.{ -\/, NonEmptyList, \/- }

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

    ZuoraQuery.query[PaymentMethodFields](Query(query)).run.map(_.flatMap { result =>
      result.records.groupBy(_.AccountId).toList match {
        case (account, first :: rest) :: Nil =>
          \/-(AccountPaymentMethodIds(account, NonEmptyList(first, rest: _*).map(_.Id)))
        case _ =>
          logger.warn(s"wrong number of accounts using the customer token: $result")
          -\/(ApiGatewayResponse.internalServerError("could not find correct account for stripe details"))
      }
    }).toEitherT

  }

}
