package com.gu.salesforce.holiday_stops

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceReads._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.salesforce.{IdentityId, SFAuthConfig, SalesforceClient}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import com.gu.zuora.subscription._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SalesforceHolidayStopRequestEndToEndEffectsTest extends AnyFlatSpec with Matchers {

  case class EndToEndResults(
      createResult: HolidayStopRequestId,
      preProcessingFetchResult: List[SalesforceHolidayStopRequest.HolidayStopRequest],
      postProcessingFetchResult: List[SalesforceHolidayStopRequest.HolidayStopRequest],
  )

  it should "Salesforce Holiday Stop Requests should work end to end" taggedAs EffectsTest in {

    val startDate = MutableCalendar.today.plusDays(10)
    val endDate = MutableCalendar.today.plusDays(15)
    val subscriptionName = SubscriptionName("A-S00050817") // must exist in CODE SalesForce
    val contact = IdentityId("100004814") // must exist in CODE SalesForce

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction

      verifySubOwnerOp = SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact(
        sfAuth.wrapWith(JsonHttp.getWithParams),
      )
      maybeMatchingSubscription <- verifySubOwnerOp(
        subscriptionName,
        contact,
      ).toDisjunction

      fakeSubscription: Subscription = Fixtures.mkGuardianWeeklySubscription()

      publicationDatesToBeStopped = SubscriptionData(fakeSubscription, Fixtures.mkAccount())
        .map(_.issueDataForPeriod(startDate, endDate))
        .toOption
        .get

      createOp = SalesforceHolidayStopRequest.CreateHolidayStopRequestWithDetail(sfAuth.wrapWith(JsonHttp.post))
      createResult <- createOp(
        CreateHolidayStopRequestWithDetail.buildBody(
          startDate,
          endDate,
          publicationDatesToBeStopped,
          maybeMatchingSubscription.get,
          None,
        ),
      ).toDisjunction

      fetchOp = SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(
        sfAuth.wrapWith(JsonHttp.getWithParams),
      )
      preProcessingFetchResult <- fetchOp(contact, Some(subscriptionName), None).toDisjunction

      id: HolidayStopRequestsDetailId = preProcessingFetchResult
        .find(_.Id == createResult)
        .get
        .Holiday_Stop_Request_Detail__r
        .get
        .records
        .head
        .Id
      processOp = SalesforceHolidayStopRequestsDetail.ActionSalesforceHolidayStopRequestsDetail(
        sfAuth.wrapWith(JsonHttp.patch),
      )(id)
      _ <- processOp(
        HolidayStopRequestsDetailActioned(
          RatePlanChargeCode("C-1234567"),
          Price(-12.34),
        ),
      ).toDisjunction

      postProcessingFetchResult <- fetchOp(contact, Some(subscriptionName), None).toDisjunction

      // UN-ACTION in order to delete the parent
      _ <- processOp(
        HolidayStopRequestsDetailActioned(
          RatePlanChargeCode(""),
          Price(0),
        ),
      ).toDisjunction

      deleteOp = SalesforceHolidayStopRequest.WithdrawHolidayStopRequest(sfAuth.wrapWith(JsonHttp.patch))
      _ <- deleteOp(createResult).toDisjunction

    } yield EndToEndResults(createResult, preProcessingFetchResult, postProcessingFetchResult)

    actual match {

      case Left(failure) => fail(failure.toString)

      case Right(EndToEndResults(createResult, preProcessingFetchResult, postProcessingFetchResult)) =>
        withClue(
          "should be able to find the freshly created Holiday Stop Request and its Actioned Count should be ZERO",
        ) {
          preProcessingFetchResult
            .find(_.Id == createResult)
            .filter(_.Actioned_Count__c.value == 0) should not be None
        }

        withClue("after processing the Actioned Count of Holiday Stop Request should have increased to ONE ") {
          postProcessingFetchResult
            .find(_.Id == createResult)
            .filter(_.Actioned_Count__c.value == 1) should not be None
        }
    }
  }
}
