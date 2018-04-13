package com.gu.stripeCustomerSourceUpdated.zuora

import com.gu.stripeCustomerSourceUpdated.{StripeCustomerId, StripeSourceId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraAccount._
import com.gu.util.zuora.ZuoraQuery
import com.gu.util.zuora.ZuoraQuery.Query
import com.gu.util.{Logging, ZuoraToApiGateway}
import play.api.libs.json._
import scalaz.{-\/, NonEmptyList, \/-}

object ZuoraQueryPaymentMethod extends Logging {

  case class PaymentMethodFields(
    Id: PaymentMethodId,
    AccountId: AccountId,
    NumConsecutiveFailures: NumConsecutiveFailures
  )
  // FIXME create WireRequest/Response and converter layer to replace the custom writes and reads
  implicit val QueryRecordR: Format[PaymentMethodFields] = Json.format[PaymentMethodFields]

  case class AccountPaymentMethodIds(accountId: AccountId, paymentMethods: NonEmptyList[PaymentMethodFields])

  def getPaymentMethodForStripeCustomer(requests: Requests)(customerId: StripeCustomerId, sourceId: StripeSourceId): FailableOp[List[AccountPaymentMethodIds]] = {
    val query =
      s"""SELECT Id, AccountId, NumConsecutiveFailures
         | FROM PaymentMethod
         |  where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = '${sourceId.value}' AND SecondTokenId = '${customerId.value}'""".stripMargin

    ZuoraQuery.getResults[PaymentMethodFields](requests)(Query(query)).leftMap(ZuoraToApiGateway.fromClientFail).flatMap { result =>

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
    }

  }

}
