package com.gu.stripeCustomerSourceUpdated.zuora

import com.gu.stripeCustomerSourceUpdated.{ StripeCustomerId, StripeSourceId }
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import play.api.libs.json._

import scalaz.{ -\/, NonEmptyList, \/- }
import com.gu.util.zuora.ZuoraAccount._
import com.gu.util.zuora.{ ZuoraDeps, ZuoraQuery }
import com.gu.util.zuora.ZuoraQuery.Query
import com.gu.util.reader.Types._

object ZuoraQueryPaymentMethod extends Logging {

  case class PaymentMethodFields(
    Id: PaymentMethodId,
    AccountId: AccountId,
    NumConsecutiveFailures: NumConsecutiveFailures)
  implicit val QueryRecordR: Format[PaymentMethodFields] = Json.format[PaymentMethodFields]

  case class AccountPaymentMethodIds(accountId: AccountId, paymentMethods: NonEmptyList[PaymentMethodFields])

  def getPaymentMethodForStripeCustomer(customerId: StripeCustomerId, sourceId: StripeSourceId): WithDepsFailableOp[ZuoraDeps, List[AccountPaymentMethodIds]] = {
    val query =
      s"""SELECT Id, AccountId, NumConsecutiveFailures
         | FROM PaymentMethod
         |  where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = '${sourceId.value}' AND SecondTokenId = '${customerId.value}'""".stripMargin

    ZuoraQuery.query[PaymentMethodFields](Query(query)).leftMap(ApiGatewayResponse.fromClientFail).run.map(_.flatMap { result =>

      def groupedList(records: List[PaymentMethodFields]): List[(AccountId, NonEmptyList[PaymentMethodFields])] = {
        records.groupBy(_.AccountId).toList.collect {
          case (accountId, head :: tail) =>
            (accountId, NonEmptyList(head, tail: _*))
        }
      }

      val accountPaymentMethodIds = groupedList(result.records)
      if (accountPaymentMethodIds.length > 3) {
        logger.warn(s"too many accounts using the customer token, could indicate a fault in the logic: $result")
        -\/(ApiGatewayResponse.internalServerError("could not find correct account for stripe details"))
      } else {
        \/-(accountPaymentMethodIds.map((AccountPaymentMethodIds.apply _).tupled))
      }
    }).toEitherT

  }

}
