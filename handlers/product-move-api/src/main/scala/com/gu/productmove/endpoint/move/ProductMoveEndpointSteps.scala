package com.gu.productmove.endpoint.move

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.IdentityId
import com.gu.productmove.endpoint.move.ProductMoveEndpoint.SwitchType
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{
  BadRequest,
  ExpectedInput,
  OutputBody,
  TransactionError,
}
import com.gu.productmove.endpoint.move.switchtype.{RecurringContributionToSupporterPlus, ToRecurringContribution}
import com.gu.productmove.zuora.{GetAccount, GetSubscription}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraClientError
import zio.{IO, Task, ZIO}

def assertSubscriptionBelongsToIdentityUser(
    getSubscription: GetSubscription,
    getAccount: GetAccount,
    subscriptionName: SubscriptionName,
    maybeIdentityId: Option[IdentityId],
): IO[Throwable | BadRequest, (GetSubscription.GetSubscriptionResponse, GetAccount.GetAccountResponse)] =
  for {
    subscription <- getSubscription.get(subscriptionName)
    account <- getAccount.get(subscription.accountNumber)
    _ <- (maybeIdentityId, account.basicInfo.IdentityId__c) match
      case (None, _) => ZIO.unit
      case (Some(identityIdToCheck), Some(actualIdentityId)) if identityIdToCheck == actualIdentityId => ZIO.unit
      case (Some(identityIdToCheck), actual) => for {
        _ <- ZIO.log(s"logged in identity id $identityIdToCheck doesn't match $actual on $subscriptionName")
        safeUserFacingMessage = s"logged in identity id $identityIdToCheck doesn't match the expected one for $subscriptionName"
        badRequest <- ZIO.fail(BadRequest(safeUserFacingMessage))
      } yield badRequest
  } yield (subscription, account)

class ProductMoveEndpointSteps(
    recurringContributionToSupporterPlus: RecurringContributionToSupporterPlus,
    toRecurringContribution: ToRecurringContribution,
    getSubscription: GetSubscription,
    getAccount: GetAccount,
):
  def runWithLayers(
      switchType: SwitchType,
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
      maybeIdentityId: Option[IdentityId],
  ): Task[OutputBody] =
    val maybeResult: IO[OutputBody | Throwable, OutputBody] = for {
      subscriptionAccount <- assertSubscriptionBelongsToIdentityUser(
        getSubscription,
        getAccount,
        subscriptionName,
        maybeIdentityId,
      )
      (subscription, account) = subscriptionAccount
      outputBody <- switchType match {
        case SwitchType.RecurringContributionToSupporterPlus =>
          recurringContributionToSupporterPlus
            .run(subscriptionName, postData, subscription, account)
        case SwitchType.ToRecurringContribution =>
          toRecurringContribution.run(subscriptionName, postData, subscription, account)
      }
    } yield outputBody
    maybeResult.catchAll(recoverErrors)

end ProductMoveEndpointSteps

// update a subscription, integration error https://developer.zuora.com/api-references/api/operation/PUT_Subscription/
private val PutSubscriptionIntegrationError = 53500099

def recoverErrors(err: OutputBody | Throwable): Task[OutputBody] = err match {
  case failure: OutputBody => ZIO.succeed(failure)
  case ZuoraClientError(_, reasons) if reasons.exists(_.code == PutSubscriptionIntegrationError) =>
    ZIO.succeed(TransactionError(reasons.map(_.message).mkString(" ")))
  case other: Throwable => ZIO.fail(other)
}

def stringFor(billingPeriod: BillingPeriod) = {
  billingPeriod match
    case Monthly => "monthly"
    case Annual => "annually"
    case other => other.toString // should not happen
}
