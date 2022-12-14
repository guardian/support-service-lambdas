package com.gu.stripeCardUpdated.zuora

import com.gu.stripeCardUpdated.TypeConvert._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount._
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json._
import cats.data.NonEmptyList
import com.gu.stripeCardUpdated.{StripeCustomerId, StripeCardId}

object ZuoraQueryPaymentMethod extends Logging {

  case class PaymentMethodFields(
      Id: PaymentMethodId,
      AccountId: AccountId,
      NumConsecutiveFailures: NumConsecutiveFailures,
  )
  // FIXME create WireRequest/Response and converter layer to replace the custom writes and reads
  implicit val QueryRecordR: Format[PaymentMethodFields] = Json.format[PaymentMethodFields]

  case class AccountPaymentMethodIds(accountId: AccountId, paymentMethods: NonEmptyList[PaymentMethodFields])

  def getPaymentMethodForStripeCustomer(
      zuoraQuerier: ZuoraQuerier,
  )(
      customerId: StripeCustomerId,
      cardId: StripeCardId,
  ): ApiGatewayOp[List[AccountPaymentMethodIds]] = {
    val maybeQueryResult = for {
      query <- zoql"""SELECT
          Id,
          AccountId,
          NumConsecutiveFailures
          FROM PaymentMethod
           where Type='CreditCardReferenceTransaction'
          AND PaymentMethodStatus = 'Active'
          AND TokenId = ${cardId.value}
          AND SecondTokenId = ${customerId.value}
         """

      queryResult <- zuoraQuerier[PaymentMethodFields](query)
    } yield queryResult

    for {
      queryResult <- maybeQueryResult.toApiGatewayOp("query failed")
      paymentMethodIds <- {

        def groupedList(records: List[PaymentMethodFields]): List[(AccountId, NonEmptyList[PaymentMethodFields])] = {
          records.groupBy(_.AccountId).toList.collect { case (accountId, head :: tail) =>
            (accountId, NonEmptyList(head, tail))
          }
        }

        val accountPaymentMethodIds = groupedList(queryResult.records)
        if (accountPaymentMethodIds.length > 3) {
          logger.warn(s"too many accounts using the customer token, could indicate a fault in the logic: $queryResult")
          ReturnWithResponse(
            ApiGatewayResponse.internalServerError("could not find correct account for stripe details"),
          )
        } else {
          ContinueProcessing(accountPaymentMethodIds.map((AccountPaymentMethodIds.apply _).tupled))
        }

      }
    } yield paymentMethodIds

  }

}
